import { useState, useMemo, useEffect } from "react"
import {
  Search,
  Star,
  ShieldCheck,
  IndianRupee,
  Send,
  MessagesSquare,
  Check,
  X,
  Clock,
  Building2,
  User,
} from "lucide-react"
import { getLenderTrustPassport, bandTone, type LenderTrustPassport } from "@/lib/creditPassport"
import LenderPassportModal from "@/components/passport/LenderPassportModal"
import { supabase } from "@/lib/supabaseClient"
import { DEMO_MODE, demoLenderDirectory, demoMyRequests, demoPlatformLoans } from "@/lib/demoData"
import { logAuditEvent } from "@/lib/auditLog"

/* =========================================================================
   LENDER DIRECTORY — real lenders (lender_profiles + profiles), no
   distance sorting since there's no real geolocation source; district/
   city are used for location context and search instead.
   ========================================================================= */

type LenderType = "Individual lender" | "Microfinance institution" | "Cooperative society"

interface Lender {
  id: string
  name: string
  type: LenderType
  district: string
  city: string
  rateMin: number
  rateMax: number
  maxAmount: number
  rating: number | null
  verified: boolean
}

function formatINR(n: number) {
  return `\u20B9${n.toLocaleString("en-IN")}`
}

const typeStyles: Record<LenderType, { bg: string; text: string; icon: typeof User }> = {
  "Individual lender": { bg: "bg-blue-50", text: "text-blue-700", icon: User },
  "Microfinance institution": { bg: "bg-teal-50", text: "text-teal-700", icon: Building2 },
  "Cooperative society": { bg: "bg-violet-50", text: "text-violet-700", icon: Building2 },
}

/* =========================================================================
   SEND REQUEST MODAL
   ========================================================================= */

function SendRequestModal({
  lender,
  onClose,
  onSend,
}: {
  lender: Lender
  onClose: () => void
  onSend: (amount: string, purpose: string, tenure: string) => void
}) {
  const [amount, setAmount] = useState("")
  const [purpose, setPurpose] = useState("")
  const [tenure, setTenure] = useState("6 months")
  const [showPassport, setShowPassport] = useState(false)
  const passport = getLenderTrustPassport(lender.name)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative bg-card rounded-2xl w-full max-w-md shadow-xl z-10 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-foreground font-semibold">Send request</h3>
            <p className="text-muted-foreground text-xs mt-0.5">to {lender.name}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-muted-foreground" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {passport && (
          <button
            onClick={() => setShowPassport(true)}
            className="w-full flex items-center justify-between gap-2 rounded-xl border border-border bg-secondary px-3.5 py-2.5 mb-4 hover:bg-secondary transition-colors text-left"
          >
            <span className="text-xs text-muted-foreground">Before you send &mdash; check this lender's trust passport</span>
            <span className="text-xs font-semibold text-teal-700">{passport.overallScore} &middot; {passport.band} &rarr;</span>
          </button>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Loan amount</label>
            <div className="relative mt-1.5">
              <IndianRupee size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Up to ${formatINR(lender.maxAmount)}`}
                className="w-full text-sm bg-card border border-border rounded-xl pl-9 pr-4 py-2.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Purpose</label>
            <input
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Restocking inventory"
              className="w-full mt-1.5 text-sm bg-card border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Repayment tenure</label>
            <select
              value={tenure}
              onChange={(e) => setTenure(e.target.value)}
              className="w-full mt-1.5 text-sm bg-card border border-border rounded-xl px-4 py-2.5 text-foreground outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100 transition-colors"
            >
              <option>3 months</option>
              <option>6 months</option>
              <option>12 months</option>
              <option>18 months</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => {
            if (!amount.trim()) return
            onSend(amount, purpose.trim() || "Not specified", tenure)
            onClose()
          }}
          disabled={!amount.trim()}
          className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-muted-foreground disabled:cursor-not-allowed px-4 py-2.5 rounded-xl transition-colors mt-5"
        >
          <Send size={15} />
          Send request
        </button>
      </div>

      {showPassport && passport && (
        <LenderPassportModal passport={passport} onClose={() => setShowPassport(false)} />
      )}
    </div>
  )
}

/* =========================================================================
   FIND LENDERS — search + directory
   ========================================================================= */

function SearchLenders({
  onRequestSent,
}: {
  onRequestSent: (lender: Lender, amount: string, purpose: string, tenure: string) => void
}) {
  const [loading, setLoading] = useState(true)
  const [lenders, setLenders] = useState<Lender[]>([])
  const [query, setQuery] = useState("")
  const [sortBy, setSortBy] = useState<"rate" | "rating">("rate")
  const [modalLender, setModalLender] = useState<Lender | null>(null)
  const [passportView, setPassportView] = useState<LenderTrustPassport | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      if (DEMO_MODE) {
        if (!active) return
        setLenders(demoLenderDirectory)
        setLoading(false)
        return
      }

      const { data: lenderProfiles } = await supabase
        .from("lender_profiles")
        .select("lender_id, org_type, district, city, rate_min, rate_max, max_amount, rating, verified")

      if (!lenderProfiles || lenderProfiles.length === 0) {
        if (active) { setLenders([]); setLoading(false) }
        return
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", lenderProfiles.map((l) => l.lender_id))

      if (!active) return
      const nameById = new Map((profiles ?? []).map((p) => [p.id, p.name]))

      setLenders(
        lenderProfiles.map((l) => ({
          id: l.lender_id,
          name: nameById.get(l.lender_id) ?? "Unknown lender",
          type: l.org_type,
          district: l.district ?? "",
          city: l.city ?? "",
          rateMin: l.rate_min,
          rateMax: l.rate_max,
          maxAmount: l.max_amount,
          rating: l.rating,
          verified: l.verified,
        }))
      )
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = lenders.filter(
      (l) =>
        !q ||
        l.name.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q) ||
        l.district.toLowerCase().includes(q) ||
        l.type.toLowerCase().includes(q)
    )
    return [...list].sort((a, b) => {
      if (sortBy === "rate") return a.rateMin - b.rateMin
      return (b.rating ?? 0) - (a.rating ?? 0)
    })
  }, [lenders, query, sortBy])

  const sortOptions = [
    { key: "rate" as const, label: "Lowest rate" },
    { key: "rating" as const, label: "Top rated" },
  ]

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Search bar */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4 sm:p-5 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by lender name, city, district, or type"
            className="w-full text-sm bg-card border border-border rounded-xl pl-11 pr-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium mr-1">Sort by</span>
          {sortOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                sortBy === opt.key ? "bg-slate-900 text-white border-slate-900" : "bg-card text-muted-foreground border-border hover:bg-secondary"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-10 text-center text-muted-foreground text-sm">
          {lenders.length === 0 ? "No lenders in the directory yet." : `No lenders match \u201c${query}\u201d.`}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((l) => {
            const meta = typeStyles[l.type]
            const Icon = meta.icon
            const passport = getLenderTrustPassport(l.name)
            const tone = passport ? bandTone(passport.band) : "info"
            const toneStyles: Record<string, string> = {
              success: "bg-emerald-50 text-emerald-700",
              info: "bg-blue-50 text-blue-700",
              warning: "bg-amber-50 text-amber-700",
              danger: "bg-red-50 text-red-700",
            }
            return (
              <div key={l.id} className="bg-card rounded-2xl border border-border shadow-sm p-5 flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => passport && setPassportView(passport)}
                    className="flex items-start gap-3 min-w-0 text-left"
                  >
                    <div className={`w-10 h-10 rounded-full ${meta.bg} ${meta.text} flex items-center justify-center shrink-0`}>
                      <Icon size={17} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-foreground font-medium truncate hover:underline">{l.name}</p>
                        {l.verified && <ShieldCheck size={14} className="text-teal-600 shrink-0" />}
                      </div>
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${meta.bg} ${meta.text}`}>{l.type}</span>
                    </div>
                  </button>
                  {l.rating != null && (
                    <div className="flex items-center gap-1 text-amber-500 text-xs font-semibold shrink-0">
                      <Star size={12} className="fill-amber-500" />
                      {l.rating}
                    </div>
                  )}
                </div>

                <p className="text-muted-foreground text-xs mt-3">{[l.city, l.district].filter(Boolean).join(", ") || "Location not listed"}</p>

                <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Rate range</p>
                    <p className="text-foreground font-medium mt-0.5">{l.rateMin}&ndash;{l.rateMax}% p.a.</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Max amount</p>
                    <p className="text-foreground font-medium mt-0.5">{formatINR(l.maxAmount)}</p>
                  </div>
                </div>

                {passport && (
                  <span className={`inline-flex self-start items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full mt-3 ${toneStyles[tone]}`}>
                    Trust score {passport.overallScore} &middot; {passport.band}
                  </span>
                )}

                <button
                  onClick={() => setModalLender(l)}
                  className="mt-4 flex items-center justify-center gap-1.5 text-sm font-medium text-white bg-slate-900 hover:opacity-90 px-4 py-2.5 rounded-xl transition-colors"
                >
                  <Send size={14} />
                  Send request
                </button>
              </div>
            )
          })}
        </div>
      )}

      {modalLender && (
        <SendRequestModal
          lender={modalLender}
          onClose={() => setModalLender(null)}
          onSend={(amount, purpose, tenure) => onRequestSent(modalLender, amount, purpose, tenure)}
        />
      )}
      {passportView && <LenderPassportModal passport={passportView} onClose={() => setPassportView(null)} />}
    </div>
  )
}

/* =========================================================================
   MY REQUESTS — requests the borrower has sent to lenders
   ========================================================================= */

type MyRequestStatus = "Pending" | "Negotiating" | "Approved" | "Rejected"

interface NegotiationEntry {
  id: number
  from: "borrower" | "lender"
  amount: number
  note: string
  date: string
}

interface SentRequest {
  id: number
  kind: "application" | "hardship"
  lenderId: string
  lenderName: string
  lenderType: LenderType
  amount: number
  purpose: string
  tenure: string
  sentOn: string
  status: MyRequestStatus
  history: NegotiationEntry[]
}

const myTabs: MyRequestStatus[] = ["Pending", "Negotiating", "Approved", "Rejected"]
const myTabStyles: Record<MyRequestStatus, string> = {
  Pending: "text-amber-700 bg-amber-50",
  Negotiating: "text-teal-700 bg-teal-50",
  Approved: "text-emerald-700 bg-emerald-50",
  Rejected: "text-red-600 bg-red-50",
}

type RespondAction = "accept" | "counter" | "withdraw"

function NegotiatePanel({
  request,
  onRespond,
}: {
  request: SentRequest
  onRespond: (id: number, action: RespondAction, amount?: number, note?: string) => void
}) {
  const [counterAmount, setCounterAmount] = useState("")
  const [counterNote, setCounterNote] = useState("")
  const lastLenderOffer = [...request.history].reverse().find((h) => h.from === "lender")

  return (
    <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50/40 p-4 space-y-3">
      <div className="flex items-center gap-1.5 text-teal-700 text-xs font-medium">
        <MessagesSquare size={13} />
        Negotiation
      </div>

      <div className="space-y-2.5">
        {request.history.map((h) => (
          <div key={h.id} className={`flex ${h.from === "borrower" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${
                h.from === "borrower" ? "bg-slate-900 text-white" : "bg-card border border-border text-foreground"
              }`}
            >
              <p className="font-semibold">{formatINR(h.amount)}</p>
              <p className={`text-xs mt-0.5 ${h.from === "borrower" ? "text-white/70" : "text-muted-foreground"}`}>{h.note}</p>
            </div>
          </div>
        ))}
      </div>

      {lastLenderOffer && (
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => onRespond(request.id, "accept")}
            className="flex items-center gap-1.5 text-xs font-medium text-white px-3 py-1.5 rounded-lg hover:opacity-90"
            style={{ backgroundColor: "#2f9e6e" }}
          >
            <Check size={12} />
            Accept {formatINR(lastLenderOffer.amount)}
          </button>
          <button
            onClick={() => onRespond(request.id, "withdraw")}
            className="flex items-center gap-1.5 text-xs font-medium text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50"
          >
            <X size={12} />
            Withdraw
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1 flex-wrap">
        <input
          value={counterAmount}
          onChange={(e) => setCounterAmount(e.target.value)}
          placeholder="Counter amount"
          className="w-32 text-sm bg-card border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100 transition-colors"
        />
        <input
          value={counterNote}
          onChange={(e) => setCounterNote(e.target.value)}
          placeholder="Add a note (optional)"
          className="flex-1 min-w-[140px] text-sm bg-card border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100 transition-colors"
        />
        <button
          onClick={() => {
            const amt = parseFloat(counterAmount)
            if (!amt) return
            onRespond(request.id, "counter", amt, counterNote.trim() || "Countered")
            setCounterAmount("")
            setCounterNote("")
          }}
          disabled={!counterAmount.trim()}
          className="flex items-center gap-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-muted-foreground disabled:cursor-not-allowed px-3 py-2 rounded-lg transition-colors"
        >
          <Send size={12} />
          Send
        </button>
      </div>
    </div>
  )
}

function MyRequests({
  requests,
  onRespond,
  loans,
  onSubmitHardship,
}: {
  requests: SentRequest[]
  onRespond: (id: number, action: RespondAction, amount?: number, note?: string) => void
  loans: { id: number; lenderId: string; lenderName: string }[]
  onSubmitHardship: (loanId: number, amount: string, note: string, repeat: boolean) => Promise<string | null>
}) {
  const [activeTab, setActiveTab] = useState<MyRequestStatus>("Pending")
  const [passportView, setPassportView] = useState<LenderTrustPassport | null>(null)
  const [showHardshipForm, setShowHardshipForm] = useState(false)
  const [hardshipLoanId, setHardshipLoanId] = useState<number | null>(loans[0]?.id ?? null)
  const [hardshipAmount, setHardshipAmount] = useState("")
  const [hardshipNote, setHardshipNote] = useState("")
  const [hardshipRepeat, setHardshipRepeat] = useState(false)
  const [hardshipSubmitting, setHardshipSubmitting] = useState(false)
  const [hardshipError, setHardshipError] = useState<string | null>(null)

  const canRequestHardship = loans.length > 0

  const counts = useMemo(() => {
    return myTabs.reduce<Record<string, number>>((acc, t) => {
      acc[t] = requests.filter((r) => r.status === t).length
      return acc
    }, {})
  }, [requests])

  const visible = requests.filter((r) => r.status === activeTab)

  async function handleHardshipSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!hardshipLoanId) {
      setHardshipError("Pick which lender this request is for.")
      return
    }
    setHardshipSubmitting(true)
    setHardshipError(null)
    const err = await onSubmitHardship(hardshipLoanId, hardshipAmount, hardshipNote, hardshipRepeat)
    if (err) {
      setHardshipError(err)
      setHardshipSubmitting(false)
      return
    }
    setShowHardshipForm(false)
    setHardshipAmount("")
    setHardshipNote("")
    setHardshipRepeat(false)
    setHardshipSubmitting(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {myTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border transition-colors ${
                activeTab === tab ? "bg-slate-900 text-white border-slate-900" : "bg-card text-muted-foreground border-border hover:bg-secondary"
              }`}
            >
              {tab}
              <span
                className={`text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center ${
                  activeTab === tab ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground"
                }`}
              >
                {counts[tab] || 0}
              </span>
            </button>
          ))}
        </div>
        {canRequestHardship && (
          <button
            onClick={() => setShowHardshipForm((s) => !s)}
            className="text-sm font-medium text-foreground border border-border rounded-xl px-4 py-2 hover:bg-secondary transition-colors"
          >
            + Request hardship adjustment
          </button>
        )}
      </div>

      {showHardshipForm && (
        <form onSubmit={handleHardshipSubmit} className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Requesting hardship adjustment from</label>
            {loans.length > 1 ? (
              <select
                value={hardshipLoanId ?? ""}
                onChange={(e) => setHardshipLoanId(Number(e.target.value))}
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-info"
              >
                {loans.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.lenderName}
                  </option>
                ))}
              </select>
            ) : (
              <p className="mt-1.5 text-sm font-semibold text-foreground">{loans[0]?.lenderName ?? "—"}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">What payment can you manage this cycle?</label>
            <input
              type="text"
              value={hardshipAmount}
              onChange={(e) => setHardshipAmount(e.target.value)}
              placeholder="e.g. 2000"
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-info"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">What's going on? (helps your lender understand)</label>
            <textarea
              value={hardshipNote}
              onChange={(e) => setHardshipNote(e.target.value)}
              rows={2}
              placeholder="e.g. Fewer gigs available this week"
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-info"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={hardshipRepeat} onChange={(e) => setHardshipRepeat(e.target.checked)} />
            This applies to more than just this cycle
          </label>
          {hardshipError && <p className="text-sm text-danger">{hardshipError}</p>}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={hardshipSubmitting || !hardshipAmount.trim()}
              className="rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-navy-foreground transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {hardshipSubmitting ? "Sending…" : "Send request"}
            </button>
            <button type="button" onClick={() => setShowHardshipForm(false)} className="text-sm text-muted-foreground hover:text-foreground">
              Cancel
            </button>
          </div>
        </form>
      )}

      {visible.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-10 text-center text-muted-foreground text-sm">
          No {activeTab.toLowerCase()} requests.
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((r) => {
            const meta = typeStyles[r.lenderType]
            const Icon = meta.icon
            const passport = getLenderTrustPassport(r.lenderName)
            return (
              <div key={`${r.kind}-${r.id}`} className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <button
                    onClick={() => passport && setPassportView(passport)}
                    className="flex items-start gap-3 min-w-0 text-left"
                  >
                    <div className={`w-10 h-10 rounded-full ${meta.bg} ${meta.text} flex items-center justify-center shrink-0`}>
                      <Icon size={17} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-foreground font-medium hover:underline">{r.lenderName}</p>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${r.kind === "hardship" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>
                          {r.kind === "hardship" ? "Hardship" : "New loan"}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs mt-0.5">{r.purpose}</p>
                      {passport && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 mt-1">
                          Trust score {passport.overallScore} &middot; {passport.band}
                        </span>
                      )}
                    </div>
                  </button>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${myTabStyles[r.status]}`}>{r.status}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Requested amount</p>
                    <p className="text-foreground font-medium mt-0.5">{formatINR(r.amount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">{r.kind === "hardship" ? "Applies to" : "Tenure"}</p>
                    <p className="text-foreground font-medium mt-0.5">{r.kind === "hardship" ? (r.tenure || "This cycle only") : r.tenure}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs mt-0.5 sm:mt-4">
                    <Clock size={13} />
                    Sent {r.sentOn}
                  </div>
                </div>

                {r.kind === "application" && r.status === "Negotiating" && <NegotiatePanel request={r} onRespond={onRespond} />}
              </div>
            )
          })}
        </div>
      )}

      {passportView && <LenderPassportModal passport={passportView} onClose={() => setPassportView(null)} />}
    </div>
  )
}

/* =========================================================================
   PAGE — Find lenders vs My requests toggle
   ========================================================================= */

export default function Requests() {
  const [view, setView] = useState<"find" | "mine">("mine")
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [requests, setRequests] = useState<SentRequest[]>([])
  const [loans, setLoans] = useState<{ id: number; lenderId: string; lenderName: string }[]>([])

  async function loadHardshipRequests(loanId: number, lenderId: string, lenderName: string) {
    const { data: reqRows } = await supabase
      .from("requests")
      .select("*")
      .eq("loan_id", loanId)
      .eq("type", "hardship")
      .order("created_at", { ascending: false })

    return (reqRows ?? []).map((r) => ({
      id: r.id,
      kind: "hardship" as const,
      lenderId,
      lenderName,
      lenderType: "Individual lender" as LenderType,
      amount: r.requested_amount ?? 0,
      purpose: r.note ?? "",
      tenure: r.repeat ? "Multiple cycles" : "This cycle only",
      sentOn: new Date(r.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" }),
      status: r.status as MyRequestStatus,
      history: [] as NegotiationEntry[],
    }))
  }

  async function loadMyRequests(uid: string) {
    const { data: apps } = await supabase
      .from("loan_applications")
      .select("*")
      .eq("borrower_id", uid)
      .order("created_at", { ascending: false })

    const { data: loanRows } = await supabase
      .from("loans")
      .select("id, lender_id")
      .eq("borrower_id", uid)

    let hardshipItems: SentRequest[] = []
    const currentLoans: { id: number; lenderId: string; lenderName: string }[] = []

    if (loanRows && loanRows.length > 0) {
      const { data: lenderProfiles } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", [...new Set(loanRows.map((l) => l.lender_id))])
      const nameById = new Map((lenderProfiles ?? []).map((p) => [p.id, p.name]))

      for (const loanRow of loanRows) {
        const lenderName = nameById.get(loanRow.lender_id) ?? "Your lender"
        currentLoans.push({ id: loanRow.id, lenderId: loanRow.lender_id, lenderName })
        hardshipItems = [...hardshipItems, ...(await loadHardshipRequests(loanRow.id, loanRow.lender_id, lenderName))]
      }
    }
    setLoans(currentLoans)

    if (!apps || apps.length === 0) {
      setRequests(hardshipItems)
      return
    }

    const lenderIds = [...new Set(apps.map((a) => a.lender_id))]
    const [{ data: profiles }, { data: lenderProfiles }, { data: offerRows }] = await Promise.all([
      supabase.from("profiles").select("id, name").in("id", lenderIds),
      supabase.from("lender_profiles").select("lender_id, org_type").in("lender_id", lenderIds),
      supabase.from("loan_application_offers").select("*").in("application_id", apps.map((a) => a.id)).order("created_at", { ascending: true }),
    ])

    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.name]))
    const typeById = new Map((lenderProfiles ?? []).map((l) => [l.lender_id, l.org_type]))

    const applicationItems: SentRequest[] = apps.map((a) => ({
        id: a.id,
        kind: "application" as const,
        lenderId: a.lender_id,
        lenderName: nameById.get(a.lender_id) ?? "Unknown lender",
        lenderType: (typeById.get(a.lender_id) ?? "Individual lender") as LenderType,
        amount: a.amount,
        purpose: a.purpose ?? "",
        tenure: a.tenure ?? "",
        sentOn: new Date(a.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" }),
        status: a.status,
        history: (offerRows ?? [])
          .filter((o) => o.application_id === a.id)
          .map((o) => ({
            id: o.id,
            from: o.from_role,
            amount: o.amount,
            note: o.note ?? "",
            date: new Date(o.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" }),
          })),
    }))

    setRequests([...hardshipItems, ...applicationItems])
  }

  useEffect(() => {
    let active = true
    async function load() {
      if (DEMO_MODE) {
        if (!active) return
        setUserId("demo-borrower")
        setLoans(
          demoPlatformLoans.map((l) => ({
            id: l.id,
            lenderId: demoLenderDirectory.find((d) => d.name === l.lenderName)?.id ?? l.lenderName,
            lenderName: l.lenderName,
          }))
        )
        setRequests(demoMyRequests)
        setLoading(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !active) return
      setUserId(user.id)
      await loadMyRequests(user.id)
      if (active) setLoading(false)
    }
    load()
    return () => { active = false }
  }, [])

  async function handleRequestSent(lender: Lender, amount: string, purpose: string, tenure: string) {
    if (!userId) return
    const amt = parseFloat(amount.replace(/[^0-9.]/g, "")) || 0

    if (DEMO_MODE) {
      setRequests((prev) => [
        {
          id: Date.now(),
          kind: "application" as const,
          lenderId: lender.id,
          lenderName: lender.name,
          lenderType: lender.type,
          amount: amt,
          purpose,
          tenure,
          sentOn: "Today",
          status: "Pending",
          history: [{ id: Date.now(), from: "borrower" as const, amount: amt, note: purpose, date: "Today" }],
        },
        ...prev,
      ])
      return
    }

    const { data: appRow, error } = await supabase
      .from("loan_applications")
      .insert({ borrower_id: userId, lender_id: lender.id, amount: amt, purpose, tenure, status: "Pending" })
      .select()
      .single()
    if (error || !appRow) return

    const { data: offerRow } = await supabase
      .from("loan_application_offers")
      .insert({ application_id: appRow.id, from_role: "borrower", amount: amt, note: purpose })
      .select()
      .single()

    setRequests((prev) => [
      {
        id: appRow.id,
        kind: "application" as const,
        lenderId: lender.id,
        lenderName: lender.name,
        lenderType: lender.type,
        amount: amt,
        purpose,
        tenure,
        sentOn: "Today",
        status: "Pending",
        history: offerRow ? [{ id: offerRow.id, from: "borrower", amount: amt, note: purpose, date: "Today" }] : [],
      },
      ...prev,
    ])
    setView("mine")

    await logAuditEvent({
      lenderId: lender.id,
      actorId: userId,
      action: "Created",
      actionText: "Submitted a new loan application for",
      entity: `${formatINR(amt)} \u2014 ${purpose}`,
    })
  }

  async function handleRespond(id: number, action: RespondAction, amount?: number, note?: string) {
    const req = requests.find((r) => r.id === id)
    if (action === "withdraw") {
      const { error } = await supabase.from("loan_applications").update({ status: "Rejected" }).eq("id", id)
      if (!error) {
        setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: "Rejected" } : r)))
        if (userId && req) {
          await logAuditEvent({
            lenderId: req.lenderId,
            actorId: userId,
            action: "Rejected",
            actionText: "Withdrew loan application to",
            entity: req.lenderName,
          })
        }
      }
      return
    }
    if (action === "accept") {
      const lastOffer = req ? [...req.history].reverse().find((h) => h.from === "lender") : null
      const finalAmount = lastOffer?.amount ?? req?.amount
      const { error } = await supabase
        .from("loan_applications")
        .update({ status: "Approved", amount: finalAmount })
        .eq("id", id)
      if (!error) {
        setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: "Approved", amount: finalAmount ?? r.amount } : r)))
        if (userId && req) {
          await logAuditEvent({
            lenderId: req.lenderId,
            actorId: userId,
            action: "Approved",
            actionText: "Accepted offer from",
            entity: `${req.lenderName} (${formatINR(finalAmount ?? req.amount)})`,
          })
        }
      }
      return
    }
    // counter
    if (amount === undefined || !userId || !req) return
    const { data: offerRow, error } = await supabase
      .from("loan_application_offers")
      .insert({ application_id: id, from_role: "borrower", amount, note: note ?? "Countered" })
      .select()
      .single()
    if (error || !offerRow) return
    await supabase.from("loan_applications").update({ status: "Negotiating" }).eq("id", id)
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: "Negotiating", history: [...r.history, { id: offerRow.id, from: "borrower", amount, note: note ?? "Countered", date: "Today" }] }
          : r
      )
    )
    await logAuditEvent({
      lenderId: req.lenderId,
      actorId: userId,
      action: "Modified",
      actionText: "Countered loan application to",
      entity: `${req.lenderName} (${formatINR(amount)})`,
    })
  }

  const activeCount = requests.filter((r) => r.status === "Pending" || r.status === "Negotiating").length

  async function handleHardshipSubmit(loanId: number, amount: string, note: string, repeat: boolean): Promise<string | null> {
    const loan = loans.find((l) => l.id === loanId)
    if (!loan) return "Pick which lender this request is for."
    const amt = parseFloat(amount.replace(/[^0-9.]/g, "")) || null

    if (DEMO_MODE) {
      setRequests((prev) => [
        {
          id: Date.now(),
          kind: "hardship",
          lenderId: loan.lenderId,
          lenderName: loan.lenderName,
          lenderType: "Individual lender",
          amount: amt ?? 0,
          purpose: note,
          tenure: repeat ? "Multiple cycles" : "This cycle only",
          sentOn: "Today",
          status: "Pending",
          history: [],
        },
        ...prev,
      ])
      return null
    }

    const { data: reqRow, error } = await supabase
      .from("requests")
      .insert({ loan_id: loan.id, type: "hardship", status: "Pending", note: note || null, requested_amount: amt, repeat })
      .select()
      .single()
    if (error || !reqRow) return error?.message ?? "Something went wrong."

    setRequests((prev) => [
      {
        id: reqRow.id,
        kind: "hardship",
        lenderId: loan.lenderId,
        lenderName: loan.lenderName,
        lenderType: "Individual lender",
        amount: amt ?? 0,
        purpose: note,
        tenure: repeat ? "Multiple cycles" : "This cycle only",
        sentOn: "Today",
        status: "Pending",
        history: [],
      },
      ...prev,
    ])

    if (userId) {
      await logAuditEvent({
        lenderId: loan.lenderId,
        actorId: userId,
        action: "Created",
        actionText: "Submitted a hardship request for",
        entity: `LN-${loan.id}${amt ? ` (${formatINR(amt)})` : ""}`,
      })
    }
    return null
  }

  return (
    <div className="p-6 md:p-8 space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-2xl sm:text-4xl font-semibold text-foreground">Requests</h2>
        <p className="text-muted-foreground mt-3 max-w-xl text-sm sm:text-base">
          Search for lenders, send loan requests, and negotiate terms — all in one place.
        </p>
      </div>

      <div className="inline-flex bg-card rounded-2xl border border-border shadow-sm p-1.5">
        <button
          onClick={() => setView("find")}
          className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-colors ${
            view === "find" ? "bg-slate-900 text-white" : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          <Search size={15} />
          Find lenders
        </button>
        <button
          onClick={() => setView("mine")}
          className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-colors ${
            view === "mine" ? "bg-slate-900 text-white" : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          <MessagesSquare size={15} />
          My requests
          {activeCount > 0 && (
            <span
              className={`text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center ${
                view === "mine" ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground"
              }`}
            >
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {view === "find" ? (
        <SearchLenders onRequestSent={handleRequestSent} />
      ) : loading ? (
        <div className="flex h-48 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      ) : (
        <MyRequests
          requests={requests}
          onRespond={handleRespond}
          loans={loans}
          onSubmitHardship={handleHardshipSubmit}
        />
      )}
    </div>
  )
}