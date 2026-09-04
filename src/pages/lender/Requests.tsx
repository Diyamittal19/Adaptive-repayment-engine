import { useState, useMemo, useEffect } from "react"
import {
  FileWarning,
  Check,
  X,
  Clock,
  UserPlus,
  MessagesSquare,
  CreditCard,
  Send,
} from "lucide-react"
import { getBorrowerPassportByName, passportFromApplication, bandTone, type CreditPassport } from "@/lib/creditPassport"
import BorrowerPassportModal from "@/components/passport/BorrowerPassportModal"
import { supabase } from "@/lib/supabaseClient"
<<<<<<< HEAD
=======
import { DEMO_MODE, demoApplications, demoHardshipRequests } from "@/lib/demoData"
>>>>>>> c5a36b1fdb84f54263bcf32e76d555fde8d95a50
import { logAuditEvent } from "@/lib/auditLog"

/* =========================================================================
   NEW APPLICATIONS — first-time borrowers requesting a loan
   ========================================================================= */

type ApplicationStatus = "Pending" | "Negotiating" | "Approved" | "Rejected"

interface Offer {
  id: number
  from: "borrower" | "lender"
  amount: number
  note: string
  date: string
}

interface Application {
  id: number
  borrowerId: string
  name: string
  role: string
  requestedOn: string
  requestedAmount: number
  purpose: string
  tenure: string
  status: ApplicationStatus
  offers: Offer[]
<<<<<<< HEAD
=======
  interestRate: number | null
>>>>>>> c5a36b1fdb84f54263bcf32e76d555fde8d95a50
}

function formatINR(n: number) {
  return `\u20B9${n.toLocaleString("en-IN")}`
}

const appTabs: ApplicationStatus[] = ["Pending", "Negotiating", "Approved", "Rejected"]
const appTabStyles: Record<ApplicationStatus, string> = {
  Pending: "text-amber-700 bg-amber-50",
  Negotiating: "text-teal-700 bg-teal-50",
  Approved: "text-emerald-700 bg-emerald-50",
  Rejected: "text-red-600 bg-red-50",
}

function parseAmount(text: string) {
  return Number(text.replace(/[^0-9]/g, "")) || 0
}

function resolveApplicationPassport(a: Application): CreditPassport {
  const existing = getBorrowerPassportByName(a.name)
  if (existing) return existing
  return passportFromApplication({
    id: String(a.id),
    name: a.name,
    role: a.role,
    requestedAmount: a.requestedAmount,
    documents: [],
  })
}

type RespondAction = "accept" | "counter" | "reject"

/* =========================================================================
   NEGOTIATION PANEL — same shape as the borrower's, so both sides are
   looking at one real shared thread (loan_application_offers), not two
   independently-faked histories.
   ========================================================================= */

function LenderNegotiatePanel({
  application,
  onRespond,
}: {
  application: Application
  onRespond: (id: number, action: RespondAction, amount?: number, note?: string) => void
}) {
  const [counterAmount, setCounterAmount] = useState("")
  const [counterNote, setCounterNote] = useState("")
  const lastBorrowerOffer = [...application.offers].reverse().find((o) => o.from === "borrower")

  return (
    <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50/40 p-4 space-y-3">
      <div className="flex items-center gap-1.5 text-teal-700 text-xs font-medium">
        <MessagesSquare size={13} />
        Negotiation
      </div>

      <div className="space-y-2.5">
        {application.offers.map((o) => (
          <div key={o.id} className={`flex ${o.from === "lender" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${
                o.from === "lender" ? "bg-slate-900 text-white" : "bg-card border border-border text-foreground"
              }`}
            >
              <p className="font-semibold">{formatINR(o.amount)}</p>
              <p className={`text-xs mt-0.5 ${o.from === "lender" ? "text-white/70" : "text-muted-foreground"}`}>{o.note}</p>
            </div>
          </div>
        ))}
      </div>

      {lastBorrowerOffer && (
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => onRespond(application.id, "accept")}
            className="flex items-center gap-1.5 text-xs font-medium text-white px-3 py-1.5 rounded-lg hover:opacity-90"
            style={{ backgroundColor: "#2f9e6e" }}
          >
            <Check size={12} />
            Accept {formatINR(lastBorrowerOffer.amount)}
          </button>
          <button
            onClick={() => onRespond(application.id, "reject")}
            className="flex items-center gap-1.5 text-xs font-medium text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50"
          >
            <X size={12} />
            Reject
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
            onRespond(application.id, "counter", amt, counterNote.trim() || "Countered")
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

function NewApplications() {
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [activeTab, setActiveTab] = useState<ApplicationStatus>("Pending")
  const [negotiatingId, setNegotiatingId] = useState<number | null>(null)
  const [passportView, setPassportView] = useState<CreditPassport | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !active) return
      setUserId(user.id)

<<<<<<< HEAD
=======
      if (DEMO_MODE) {
        setApplications(demoApplications)
        setLoading(false)
        return
      }

>>>>>>> c5a36b1fdb84f54263bcf32e76d555fde8d95a50
      const { data: apps } = await supabase
        .from("loan_applications")
        .select("*")
        .eq("lender_id", user.id)
        .order("created_at", { ascending: false })

      if (!apps || apps.length === 0) {
        if (active) { setApplications([]); setLoading(false) }
        return
      }

      const borrowerIds = [...new Set(apps.map((a) => a.borrower_id))]
      const [{ data: profiles }, { data: borrowerProfiles }, { data: offerRows }] = await Promise.all([
        supabase.from("profiles").select("id, name").in("id", borrowerIds),
        supabase.from("borrower_profiles").select("borrower_id, occupation").in("borrower_id", borrowerIds),
        supabase.from("loan_application_offers").select("*").in("application_id", apps.map((a) => a.id)).order("created_at", { ascending: true }),
      ])

      if (!active) return

      const nameById = new Map((profiles ?? []).map((p) => [p.id, p.name]))
      const occByBorrower = new Map((borrowerProfiles ?? []).map((b) => [b.borrower_id, b.occupation]))

      const mapped: Application[] = apps.map((a) => ({
        id: a.id,
        borrowerId: a.borrower_id,
        name: nameById.get(a.borrower_id) ?? "Unknown borrower",
        role: occByBorrower.get(a.borrower_id) ?? "",
        requestedOn: new Date(a.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" }),
        requestedAmount: a.amount,
        purpose: a.purpose ?? "",
        tenure: a.tenure ?? "",
        status: a.status,
<<<<<<< HEAD
=======
        interestRate: a.interest_rate ?? null,
>>>>>>> c5a36b1fdb84f54263bcf32e76d555fde8d95a50
        offers: (offerRows ?? [])
          .filter((o) => o.application_id === a.id)
          .map((o) => ({
            id: o.id,
            from: o.from_role,
            amount: o.amount,
            note: o.note ?? "",
            date: new Date(o.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" }),
          })),
      }))

      setApplications(mapped)
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [])

  const counts = useMemo(() => {
    return appTabs.reduce<Record<string, number>>((acc, t) => {
      acc[t] = applications.filter((a) => a.status === t).length
      return acc
    }, {})
  }, [applications])

  const visible = applications.filter((a) => a.status === activeTab)

<<<<<<< HEAD
  async function updateStatus(id: number, status: ApplicationStatus, amount?: number) {
    const patch: Record<string, unknown> = { status }
    if (amount !== undefined) patch.amount = amount
    const { error } = await supabase.from("loan_applications").update(patch).eq("id", id)
    if (!error) {
      setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, status, ...(amount !== undefined ? { requestedAmount: amount } : {}) } : a)))
      if (userId && (status === "Approved" || status === "Rejected")) {
        const app = applications.find((a) => a.id === id)
=======
  const [approvingId, setApprovingId] = useState<number | null>(null)
  const [approveAmount, setApproveAmount] = useState(0)
  const [rateInput, setRateInput] = useState("")

  async function updateStatus(id: number, status: ApplicationStatus, amount?: number, interestRate?: number) {
    const app = applications.find((a) => a.id === id)
    const patch: Record<string, unknown> = { status }
    if (amount !== undefined) patch.amount = amount
    if (interestRate !== undefined) patch.interest_rate = interestRate
    // responded_at captures the FIRST time a lender acts on a request —
    // only set it while the request is still Pending, never overwritten
    // by later negotiation moves.
    if (app && app.status === "Pending") patch.responded_at = new Date().toISOString()

    const { error } = await supabase.from("loan_applications").update(patch).eq("id", id)
    if (!error) {
      setApplications((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, status, ...(amount !== undefined ? { requestedAmount: amount } : {}), ...(interestRate !== undefined ? { interestRate } : {}) }
            : a
        )
      )
      if (userId && (status === "Approved" || status === "Rejected")) {
>>>>>>> c5a36b1fdb84f54263bcf32e76d555fde8d95a50
        await logAuditEvent({
          lenderId: userId,
          actorId: userId,
          action: status,
          actionText: `${status} new loan application for`,
          entity: app ? `${app.name} (${formatINR(amount ?? app.requestedAmount)})` : `Application #${id}`,
        })
      }
    }
  }

<<<<<<< HEAD
=======
  function startApproval(id: number, amount: number) {
    setApprovingId(id)
    setApproveAmount(amount)
    setRateInput("")
    setNegotiatingId(null)
  }

  async function confirmApproval() {
    if (approvingId === null) return
    const rate = parseFloat(rateInput)
    await updateStatus(approvingId, "Approved", approveAmount, isNaN(rate) ? undefined : rate)
    setApprovingId(null)
  }

>>>>>>> c5a36b1fdb84f54263bcf32e76d555fde8d95a50
  async function handleRespond(id: number, action: RespondAction, amount?: number, note?: string) {
    if (action === "reject") {
      await updateStatus(id, "Rejected")
      setNegotiatingId(null)
      return
    }
    if (action === "accept") {
      const app = applications.find((a) => a.id === id)
      const lastBorrowerOffer = app ? [...app.offers].reverse().find((o) => o.from === "borrower") : null
<<<<<<< HEAD
      await updateStatus(id, "Approved", lastBorrowerOffer?.amount)
      setNegotiatingId(null)
=======
      startApproval(id, lastBorrowerOffer?.amount ?? app?.requestedAmount ?? 0)
>>>>>>> c5a36b1fdb84f54263bcf32e76d555fde8d95a50
      return
    }
    // counter
    if (!userId || amount === undefined) return
<<<<<<< HEAD
=======
    const app = applications.find((a) => a.id === id)
>>>>>>> c5a36b1fdb84f54263bcf32e76d555fde8d95a50
    const { data: offerRow, error } = await supabase
      .from("loan_application_offers")
      .insert({ application_id: id, from_role: "lender", amount, note: note ?? "Countered" })
      .select()
      .single()
    if (error || !offerRow) return
<<<<<<< HEAD
    await supabase.from("loan_applications").update({ status: "Negotiating" }).eq("id", id)
=======
    const patch: Record<string, unknown> = { status: "Negotiating" }
    if (app && app.status === "Pending") patch.responded_at = new Date().toISOString()
    await supabase.from("loan_applications").update(patch).eq("id", id)
>>>>>>> c5a36b1fdb84f54263bcf32e76d555fde8d95a50
    setApplications((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status: "Negotiating",
              offers: [...a.offers, { id: offerRow.id, from: "lender", amount, note: note ?? "Countered", date: "Today" }],
            }
          : a
      )
    )
<<<<<<< HEAD
    const app = applications.find((a) => a.id === id)
=======
>>>>>>> c5a36b1fdb84f54263bcf32e76d555fde8d95a50
    await logAuditEvent({
      lenderId: userId,
      actorId: userId,
      action: "Modified",
      actionText: "Countered loan application for",
      entity: app ? `${app.name} (${formatINR(amount)})` : `Application #${id}`,
    })
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap">
        {appTabs.map((tab) => (
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

      {visible.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-10 text-center text-muted-foreground text-sm">
          No {activeTab.toLowerCase()} applications.
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((a) => {
            const passport = resolveApplicationPassport(a)
            const tone = bandTone(passport.band)
            const toneStyles: Record<string, string> = {
              success: "bg-emerald-50 text-emerald-700",
              info: "bg-blue-50 text-blue-700",
              warning: "bg-amber-50 text-amber-700",
              danger: "bg-red-50 text-red-700",
            }
            return (
            <div key={a.id} className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <button onClick={() => setPassportView(passport)} className="flex items-start gap-3 min-w-0 text-left">
                  <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                    <UserPlus size={17} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-foreground font-medium hover:underline">{a.name}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{a.role}</p>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full mt-1.5 ${toneStyles[tone]}`}>
                      <CreditCard size={10} />
                      {passport.thinFile ? "New applicant" : `Credit score ${passport.overallScore}`} &middot; {passport.band}
                    </span>
                  </div>
                </button>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${appTabStyles[a.status]}`}>{a.status}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Requested amount</p>
                  <p className="text-foreground font-medium mt-0.5">{formatINR(a.requestedAmount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Tenure</p>
                  <p className="text-foreground font-medium mt-0.5">{a.tenure || "\u2014"}</p>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs mt-0.5 sm:mt-4">
                  <Clock size={13} />
                  Applied {a.requestedOn}
                </div>
              </div>

              {a.purpose && (
                <p className="mt-3 text-sm text-muted-foreground">{a.purpose}</p>
              )}

              {(a.status === "Pending" || a.status === "Negotiating") && (
                <div className="flex items-center gap-3 mt-5 flex-wrap">
                  <button
<<<<<<< HEAD
                    onClick={() => updateStatus(a.id, "Approved")}
=======
                    onClick={() => startApproval(a.id, a.requestedAmount)}
>>>>>>> c5a36b1fdb84f54263bcf32e76d555fde8d95a50
                    className="flex items-center gap-1.5 text-sm font-medium text-white px-4 py-2 rounded-xl hover:opacity-90"
                    style={{ backgroundColor: "#2f9e6e" }}
                  >
                    <Check size={15} />
                    Approve
                  </button>
                  <button
                    onClick={() => setNegotiatingId(negotiatingId === a.id ? null : a.id)}
                    className="flex items-center gap-1.5 text-sm font-medium text-teal-700 border border-teal-200 px-4 py-2 rounded-xl hover:bg-teal-50"
                  >
                    <MessagesSquare size={15} />
                    Negotiate
                  </button>
                  <button
                    onClick={() => updateStatus(a.id, "Rejected")}
                    className="flex items-center gap-1.5 text-sm font-medium text-red-600 border border-red-200 px-4 py-2 rounded-xl hover:bg-red-50"
                  >
                    <X size={15} />
                    Reject
                  </button>
                </div>
              )}

<<<<<<< HEAD
=======
              {approvingId === a.id && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
                  <p className="text-sm font-medium text-emerald-800">
                    Approving at {formatINR(approveAmount)} — set the interest rate for this loan
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      value={rateInput}
                      onChange={(e) => setRateInput(e.target.value)}
                      placeholder="Interest rate (% p.a.)"
                      type="number"
                      step="0.1"
                      className="w-48 text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 placeholder:text-slate-400 outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 transition-colors"
                    />
                    <button
                      onClick={confirmApproval}
                      disabled={!rateInput.trim()}
                      className="text-sm font-medium text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: "#2f9e6e" }}
                    >
                      Confirm approval
                    </button>
                    <button
                      onClick={() => setApprovingId(null)}
                      className="text-sm font-medium text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

>>>>>>> c5a36b1fdb84f54263bcf32e76d555fde8d95a50
              {negotiatingId === a.id && <LenderNegotiatePanel application={a} onRespond={handleRespond} />}
            </div>
          )})}
        </div>
      )}

      {passportView && <BorrowerPassportModal passport={passportView} onClose={() => setPassportView(null)} />}
    </div>
  )
}

/* =========================================================================
   EXISTING BORROWERS — hardship / repayment adjustment requests
   ========================================================================= */

type RequestStatus = "Pending" | "Approved" | "Rejected"

interface HardshipRequest {
  id: number
  loanRowId: number
  name: string
  role: string
  loanId: string
  reason: string
  requestedOn: string
  currentPayment: number
  requestedPayment: number | null
  repeat: boolean
  status: RequestStatus
}

const tabs: RequestStatus[] = ["Pending", "Approved", "Rejected"]
const tabStyles: Record<RequestStatus, string> = {
  Pending: "text-amber-700 bg-amber-50",
  Approved: "text-emerald-700 bg-emerald-50",
  Rejected: "text-red-600 bg-red-50",
}

function ExistingRequests() {
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [requests, setRequests] = useState<HardshipRequest[]>([])
  const [activeTab, setActiveTab] = useState<RequestStatus>("Pending")
  const [passportView, setPassportView] = useState<CreditPassport | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !active) return
      setUserId(user.id)

<<<<<<< HEAD
=======
      if (DEMO_MODE) {
        setRequests(demoHardshipRequests)
        setLoading(false)
        return
      }

>>>>>>> c5a36b1fdb84f54263bcf32e76d555fde8d95a50
      const { data: loans } = await supabase
        .from("loans")
        .select("id, borrower_id, target_amount")
        .eq("lender_id", user.id)

      if (!loans || loans.length === 0) {
        if (active) { setRequests([]); setLoading(false) }
        return
      }

      const { data: reqRows } = await supabase
        .from("requests")
        .select("*")
        .eq("type", "hardship")
        .in("loan_id", loans.map((l) => l.id))
        .order("created_at", { ascending: false })

      if (!active) return

      const loanById = new Map(loans.map((l) => [l.id, l]))
      const borrowerIds = [...new Set(loans.map((l) => l.borrower_id))]
      const [{ data: profiles }, { data: borrowerProfiles }] = await Promise.all([
        supabase.from("profiles").select("id, name").in("id", borrowerIds),
        supabase.from("borrower_profiles").select("borrower_id, occupation").in("borrower_id", borrowerIds),
      ])

      if (!active) return

      const nameById = new Map((profiles ?? []).map((p) => [p.id, p.name]))
      const occByBorrower = new Map((borrowerProfiles ?? []).map((b) => [b.borrower_id, b.occupation]))

      const mapped: HardshipRequest[] = (reqRows ?? []).map((r) => {
        const loan = loanById.get(r.loan_id)
        return {
          id: r.id,
          loanRowId: r.loan_id,
          name: loan ? nameById.get(loan.borrower_id) ?? "Unknown borrower" : "Unknown borrower",
          role: loan ? occByBorrower.get(loan.borrower_id) ?? "" : "",
          loanId: `LN-${r.loan_id}`,
          reason: r.note ?? "",
          requestedOn: new Date(r.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" }),
          currentPayment: loan?.target_amount ?? 0,
          requestedPayment: r.requested_amount,
          repeat: r.repeat,
          status: r.status,
        }
      })

      setRequests(mapped)
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [])

  const counts = useMemo(() => {
    return tabs.reduce<Record<string, number>>((acc, tab) => {
      acc[tab] = requests.filter((r) => r.status === tab).length
      return acc
    }, {})
  }, [requests])

  const visible = requests.filter((r) => r.status === activeTab)

  async function updateStatus(id: number, status: RequestStatus) {
<<<<<<< HEAD
    const { error } = await supabase.from("requests").update({ status }).eq("id", id)
    if (!error) {
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
      if (userId && (status === "Approved" || status === "Rejected")) {
        const req = requests.find((r) => r.id === id)
=======
    const req = requests.find((r) => r.id === id)
    const patch: Record<string, unknown> = { status }
    if (req && req.status === "Pending") patch.responded_at = new Date().toISOString()
    const { error } = await supabase.from("requests").update(patch).eq("id", id)
    if (!error) {
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
      if (userId && (status === "Approved" || status === "Rejected")) {
>>>>>>> c5a36b1fdb84f54263bcf32e76d555fde8d95a50
        await logAuditEvent({
          lenderId: userId,
          actorId: userId,
          action: status,
          actionText: `${status} hardship request for`,
          entity: req ? `${req.name} (${req.loanId})` : `Request #${id}`,
        })
      }
    }
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
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

      {visible.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-10 text-center text-muted-foreground text-sm">
          No {activeTab.toLowerCase()} requests.
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((r) => {
            const passport = getBorrowerPassportByName(r.name)
            const tone = passport ? bandTone(passport.band) : "info"
            const toneStyles: Record<string, string> = {
              success: "bg-emerald-50 text-emerald-700",
              info: "bg-blue-50 text-blue-700",
              warning: "bg-amber-50 text-amber-700",
              danger: "bg-red-50 text-red-700",
            }
            return (
            <div key={r.id} className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <button
                  onClick={() => passport && setPassportView(passport)}
                  className="flex items-start gap-3 min-w-0 text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                    <FileWarning size={17} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-foreground font-medium hover:underline">{r.name}</p>
                      <span className="text-muted-foreground text-xs">&middot; {r.loanId}</span>
                      {r.repeat && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600">Repeat requester</span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs mt-0.5">{r.role}</p>
                    {passport && (
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full mt-1.5 ${toneStyles[tone]}`}>
                        <CreditCard size={10} />
                        Credit score {passport.overallScore} &middot; {passport.band}
                      </span>
                    )}
                  </div>
                </button>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${tabStyles[r.status]}`}>{r.status}</span>
              </div>

              <div className="mt-4 rounded-xl border border-red-100 bg-card px-4 py-3">
                <p className="text-red-600 text-xs font-medium mb-1 flex items-center gap-1.5">
                  <FileWarning size={12} />
                  Reason given
                </p>
                <p className="text-foreground text-sm leading-relaxed">{r.reason || "No reason given."}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Current payment</p>
                  <p className="text-foreground font-medium mt-0.5">{formatINR(r.currentPayment)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Requested</p>
                  <p className="text-foreground font-medium mt-0.5">
                    {r.requestedPayment != null ? `${formatINR(r.requestedPayment)}${r.repeat ? " (multiple cycles)" : ""}` : "\u2014"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs mt-0.5 sm:mt-4">
                  <Clock size={13} />
                  Requested {r.requestedOn}
                </div>
              </div>

              {r.status === "Pending" && (
                <div className="flex items-center gap-3 mt-5">
                  <button
                    onClick={() => updateStatus(r.id, "Approved")}
                    className="flex items-center gap-1.5 text-sm font-medium text-white px-4 py-2 rounded-xl hover:opacity-90"
                    style={{ backgroundColor: "#2f9e6e" }}
                  >
                    <Check size={15} />
                    Approve
                  </button>
                  <button
                    onClick={() => updateStatus(r.id, "Rejected")}
                    className="flex items-center gap-1.5 text-sm font-medium text-red-600 border border-red-200 px-4 py-2 rounded-xl hover:bg-red-50"
                  >
                    <X size={15} />
                    Reject
                  </button>
                </div>
              )}
            </div>
          )})}
        </div>
      )}

      {passportView && <BorrowerPassportModal passport={passportView} onClose={() => setPassportView(null)} />}
    </div>
  )
}

/* =========================================================================
   PAGE — New vs Existing toggle
   ========================================================================= */

export default function Requests({
  initialView = "new",
}: {
  initialView?: "new" | "existing"
}) {
  const [view, setView] = useState<"new" | "existing">(initialView)

  return (
    <div className="p-6 md:p-8 space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-2xl sm:text-4xl font-semibold text-foreground">Requests</h2>
        <p className="text-muted-foreground mt-3 max-w-xl text-sm sm:text-base">
          New loan applications and hardship requests from existing borrowers, in one place.
        </p>
      </div>

      <div className="inline-flex bg-card rounded-2xl border border-border shadow-sm p-1.5">
        <button
          onClick={() => setView("new")}
          className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-colors ${
            view === "new" ? "bg-slate-900 text-white" : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          <UserPlus size={15} />
          New applications
        </button>
        <button
          onClick={() => setView("existing")}
          className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-colors ${
            view === "existing" ? "bg-slate-900 text-white" : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          <FileWarning size={15} />
          Existing borrowers
        </button>
      </div>

      {view === "new" ? <NewApplications /> : <ExistingRequests />}
    </div>
  )
}