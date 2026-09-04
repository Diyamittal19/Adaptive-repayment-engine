import { useState, useRef, useEffect } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import {
  Users,
  FileText,
  TrendingUp,
  ShieldAlert,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Bell,
  ArrowUpRight,
  ArrowRight,
  X,
  type LucideIcon,
} from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import TrustScoreCard from "@/components/passport/TrustScoreCard"
import { buildLenderTrustPassport } from "@/lib/creditPassport"
import { DEMO_MODE, demoLenderLoans, demoLenderPayments, demoHardshipForPortfolio, demoBorrowerNames, demoBorrowerOccupations } from "@/lib/demoData"

// ─── Data ────────────────────────────────────────────────────────────────
// chartData, and the borrowers list further below, used to be hardcoded
// here. They're now computed inside PortfolioOverview() from real
// `loans`/`payments`/`requests` rows — see loadPortfolio() below.

interface Borrower {
  borrowerId: string
  name: string
  role: string
  loanId: string
  dueDate: string
  daysLeft: number
  payment: string
  status: "On track" | "At floor" | "Hardship request"
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const statusMeta: Record<Borrower["status"], { dot: string; pill: string; text: string }> = {
  "On track": { dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700", text: "text-emerald-700" },
  "At floor": { dot: "bg-amber-500", pill: "bg-amber-50 text-amber-700", text: "text-amber-700" },
  "Hardship request": { dot: "bg-red-500", pill: "bg-red-50 text-red-700", text: "text-red-700" },
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────

interface TooltipPayloadItem {
  dataKey: string
  name: string
  value: number
  fill?: string
  stroke?: string
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card rounded-xl shadow-lg border border-border p-3 text-sm min-w-[160px]">
      <p className="font-semibold text-foreground mb-2">{label} 2026</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.stroke || p.fill }} />
            <span className="text-muted-foreground capitalize">{p.name}</span>
          </div>
          <span className="font-semibold text-foreground">{p.value}%</span>
        </div>
      ))}
    </div>
  )
}

// ─── Cycle Picker ────────────────────────────────────────────────────────

function CyclePicker({
  selectedYear,
  selectedMonth,
  onSelect,
  onClose,
}: {
  selectedYear: number
  selectedMonth: number
  onSelect: (y: number, m: number) => void
  onClose: () => void
}) {
  const [year, setYear] = useState(selectedYear)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [onClose])

  return (
    <div ref={ref} className="absolute right-0 top-[calc(100%+8px)] z-50 bg-card rounded-2xl shadow-xl border border-border p-4 w-72">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setYear((y) => y - 1)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span className="font-bold text-foreground text-base">{year}</span>
        <button onClick={() => setYear((y) => y + 1)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {MONTHS.map((m, i) => {
          const active = year === selectedYear && i === selectedMonth
          return (
            <button
              key={m}
              onClick={() => {
                onSelect(year, i)
                onClose()
              }}
              className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                active ? "bg-[#0B1324] text-white" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {m}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Stat Card ───────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string
  icon: LucideIcon
  accentColor: string
  bgColor: string
  iconColor: string
  deltaText: string
  deltaColor: string
  note: string
}

function StatCard({ label, value, icon: Icon, accentColor, bgColor, iconColor, deltaText, deltaColor, note }: StatCardProps) {
  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border p-5 relative overflow-hidden cursor-pointer group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md flex flex-col">
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ backgroundColor: accentColor }} />

      <div className="pl-1 flex flex-col flex-1 min-h-[140px]">
        <div className="flex items-start justify-between">
          <span className="text-foreground font-semibold text-base leading-tight pr-2">{label}</span>
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bgColor }}>
            <Icon size={18} className={iconColor} />
          </div>
        </div>

        <div className="flex-1 flex items-center">
          <div className="text-4xl font-bold text-foreground tracking-tight" style={{ letterSpacing: "-0.02em" }}>
            {value}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {deltaText && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{ color: deltaColor, backgroundColor: deltaColor + "18" }}
            >
              <ArrowUpRight size={11} />
              {deltaText}
            </span>
          )}
          <span className="text-muted-foreground text-sm">{note}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Portfolio Overview Page ─────────────────────────────────────────────

export default function PortfolioOverview({
  onNavigate,
  onReviewHardship,
}: {
  onNavigate?: (label: string, borrowerId?: string) => void
  onReviewHardship?: () => void
}) {
  const [selectedYear, setSelectedYear] = useState(2026)
  const [selectedMonth, setSelectedMonth] = useState(7) // August
  const [pickerOpen, setPickerOpen] = useState(false)
  const [bannerVisible, setBannerVisible] = useState(true)

  const [loading, setLoading] = useState(true)
  const [hasLoans, setHasLoans] = useState(false)
  const [activeLoansCount, setActiveLoansCount] = useState(0)
  const [pendingHardshipCount, setPendingHardshipCount] = useState(0)
  const [onTimeRate, setOnTimeRate] = useState(0)
  const [onTimeRateDelta, setOnTimeRateDelta] = useState<number | null>(null)
  const [atRiskCount, setAtRiskCount] = useState(0)
  const [cycleChart, setCycleChart] = useState<{ month: string; onTime: number; atFloor: number; deferred: number }[]>([])
  const [statusMix, setStatusMix] = useState({ onTime: 0, atFloor: 0, deferred: 0 })
  const [floorSavedCount, setFloorSavedCount] = useState(0)
  const [dueSoon, setDueSoon] = useState<Borrower[]>([])
  const [trustPassport, setTrustPassport] = useState<ReturnType<typeof buildLenderTrustPassport> | null>(null)
  const [hasCycleData, setHasCycleData] = useState(true)

  // Raw data, fetched once — everything below that's specific to whichever
  // cycle is selected in the calendar picker gets recomputed from this
  // whenever selectedYear/selectedMonth changes, instead of re-fetching.
  const [rawLoans, setRawLoans] = useState<{ id: number; borrower_id: string; target_amount: number; floor: number; due_date: string; status: string }[]>([])
  const [rawPayments, setRawPayments] = useState<{ loan_id: number; cycle_month: string; amount_due: number; amount_paid: number; paid_on_time: boolean }[]>([])
  const [rawHardship, setRawHardship] = useState<{ id: number; loan_id: number; status: string }[]>([])
  const [nameById, setNameById] = useState<Map<string, string>>(new Map())
  const [occByBorrower, setOccByBorrower] = useState<Map<string, string>>(new Map())

  // ── Fetch once on mount ────────────────────────────────────────────────
  useEffect(() => {
    let active = true
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !active) return

      let loans, payments, hardshipReqs, profiles, borrowerProfiles

      if (DEMO_MODE) {
        loans = demoLenderLoans
        payments = demoLenderPayments
        hardshipReqs = demoHardshipForPortfolio
        profiles = Object.entries(demoBorrowerNames).map(([id, name]) => ({ id, name }))
        borrowerProfiles = Object.entries(demoBorrowerOccupations).map(([borrower_id, occupation]) => ({ borrower_id, occupation }))
      } else {
        const { data: loanRows } = await supabase
          .from("loans")
          .select("id, borrower_id, target_amount, floor, due_date, status")
          .eq("lender_id", user.id)
        loans = loanRows
      }

      if (!loans || loans.length === 0) {
        if (active) setLoading(false)
        return
      }

      setHasLoans(true)

      const loanIds = loans.map((l) => l.id)

      let myName = ""
      let myRateMin: number | null = null
      let myRateMax: number | null = null
      let allHardship: { status: string; created_at: string; responded_at: string | null }[] = []
      let allApplications: { status: string; created_at: string; responded_at: string | null; interest_rate: number | null }[] = []

      if (!DEMO_MODE) {
        const results = await Promise.all([
          supabase.from("payments").select("loan_id, cycle_month, amount_due, amount_paid, paid_on_time").in("loan_id", loanIds),
          supabase.from("requests").select("id, loan_id, status, created_at, responded_at").eq("type", "hardship").in("loan_id", loanIds),
          supabase.from("profiles").select("id, name").in("id", [...new Set(loans.map((l) => l.borrower_id))]),
          supabase.from("borrower_profiles").select("borrower_id, occupation").in("borrower_id", [...new Set(loans.map((l) => l.borrower_id))]),
          supabase.from("profiles").select("name").eq("id", user.id).single(),
          supabase.from("lender_profiles").select("rate_min, rate_max").eq("lender_id", user.id).single(),
          supabase.from("loan_applications").select("status, created_at, responded_at, interest_rate").eq("lender_id", user.id),
        ])
        payments = results[0].data
        hardshipReqs = results[1].data
        profiles = results[2].data
        borrowerProfiles = results[3].data
        myName = results[4].data?.name ?? ""
        myRateMin = results[5].data?.rate_min ?? null
        myRateMax = results[5].data?.rate_max ?? null
        allHardship = results[1].data ?? []
        allApplications = results[6].data ?? []
      }

      if (!active) return

      const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.name]))
      const occMap = new Map((borrowerProfiles ?? []).map((b) => [b.borrower_id, b.occupation]))
      const allPayments = payments ?? []
      const pendingHardship = (hardshipReqs ?? []).filter((r) => r.status === "Pending")

      setRawLoans(loans)
      setRawPayments(allPayments)
      setRawHardship(hardshipReqs ?? [])
      setNameById(nameMap)
      setOccByBorrower(occMap)

      // These aren't tied to any specific cycle — they're current-state
      // snapshots (right now, not "as of the selected month") — so they're
      // computed once here, not in the per-cycle effect below.
      const hardshipLoanIds = new Set(pendingHardship.map((r) => r.loan_id))
      const overdueBorrowers = new Set(loans.filter((l) => l.status === "overdue").map((l) => l.borrower_id))
      const hardshipBorrowers = new Set(loans.filter((l) => hardshipLoanIds.has(l.id)).map((l) => l.borrower_id))
      setAtRiskCount(new Set([...overdueBorrowers, ...hardshipBorrowers]).size)
      setActiveLoansCount(loans.filter((l) => l.status === "active").length)
      setPendingHardshipCount(pendingHardship.length)

      const floorByLoan = new Map(loans.map((l) => [l.id, l.floor]))
      const now = Date.now()
      const soon = loans
        .map((l) => {
          const due = new Date(l.due_date).getTime()
          const daysLeft = Math.ceil((due - now) / (1000 * 60 * 60 * 24))
          const hasHardship = hardshipLoanIds.has(l.id)
          const status: Borrower["status"] = hasHardship
            ? "Hardship request"
            : l.target_amount <= (floorByLoan.get(l.id) ?? 0)
            ? "At floor"
            : "On track"
          return {
            borrowerId: l.borrower_id,
            name: nameMap.get(l.borrower_id) ?? "Unknown borrower",
            role: occMap.get(l.borrower_id) ?? "",
            loanId: `LN-${l.id}`,
            dueDate: new Date(l.due_date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }),
            daysLeft,
            payment: `\u20B9${l.target_amount.toLocaleString("en-IN")}`,
            status,
            _daysLeft: daysLeft,
          }
        })
        .filter((b) => b._daysLeft >= 0 && b._daysLeft <= 7)
        .sort((a, b) => a._daysLeft - b._daysLeft)
        .map(({ _daysLeft, ...rest }) => rest)

      setDueSoon(soon)

      if (!DEMO_MODE) {
        const hardshipReceived = allHardship.length
        const hardshipAccommodated = allHardship.filter((h) => h.status === "Approved").length

        const respondedRequests = [
          ...allHardship.filter((h) => h.responded_at),
          ...allApplications.filter((a) => a.responded_at),
        ]
        const avgResponseHours = respondedRequests.length
          ? respondedRequests.reduce((sum, r) => {
              const hrs = (new Date(r.responded_at!).getTime() - new Date(r.created_at).getTime()) / (1000 * 60 * 60)
              return sum + hrs
            }, 0) / respondedRequests.length
          : null

        const approvedWithRate = allApplications.filter((a) => a.status === "Approved" && a.interest_rate !== null)
        const rateWithinRangeRate =
          approvedWithRate.length && myRateMin !== null && myRateMax !== null
            ? (approvedWithRate.filter((a) => a.interest_rate! >= myRateMin! && a.interest_rate! <= myRateMax!).length / approvedWithRate.length) * 100
            : null

        const borrowerLoanCounts = new Map<string, number>()
        for (const l of loans) borrowerLoanCounts.set(l.borrower_id, (borrowerLoanCounts.get(l.borrower_id) ?? 0) + 1)
        const totalBorrowers = borrowerLoanCounts.size
        const repeatBorrowers = [...borrowerLoanCounts.values()].filter((c) => c > 1).length

        const earliestCycle = allPayments.length
          ? allPayments.reduce((min, p) => (p.cycle_month < min ? p.cycle_month : min), allPayments[0].cycle_month)
          : null
        const monthsActive = earliestCycle
          ? Math.max(1, Math.round((Date.now() - new Date(earliestCycle).getTime()) / (1000 * 60 * 60 * 24 * 30)))
          : 1

        setTrustPassport(
          buildLenderTrustPassport({
            name: myName || "You",
            hardshipReceived,
            hardshipAccommodated,
            avgResponseHours,
            rateWithinRangeRate,
            repeatBorrowers,
            totalBorrowers,
            borrowersServed: totalBorrowers,
            monthsActive,
          })
        )
      }

      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [])

  // ── Recompute whenever the selected cycle changes ──────────────────────
  useEffect(() => {
    if (rawLoans.length === 0) return

    const floorByLoan = new Map(rawLoans.map((l) => [l.id, l.floor]))
    function bucket(p: { loan_id: number; amount_paid: number; paid_on_time: boolean }) {
      if (p.paid_on_time) return "onTime" as const
      const floor = floorByLoan.get(p.loan_id) ?? 0
      if (p.amount_paid <= floor) return "atFloor" as const
      return "deferred" as const
    }

    const selectedKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`

    // Chart: a 6-month window ending at the selected cycle, so changing
    // the picker visibly shifts what the chart shows.
    const windowKeys: string[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(selectedYear, selectedMonth - i, 1)
      windowKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
    }
    const chart = windowKeys.map((key) => {
      const [y, m] = key.split("-").map(Number)
      const label = new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short" })
      const monthPayments = rawPayments.filter((p) => {
        const d = new Date(p.cycle_month)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === key
      })
      const total = monthPayments.length || 1
      const onTime = monthPayments.filter((p) => bucket(p) === "onTime").length
      const atFloor = monthPayments.filter((p) => bucket(p) === "atFloor").length
      const deferred = monthPayments.filter((p) => bucket(p) === "deferred").length
      return {
        month: label,
        onTime: monthPayments.length ? Math.round((onTime / total) * 100) : 0,
        atFloor: monthPayments.length ? Math.round((atFloor / total) * 100) : 0,
        deferred: monthPayments.length ? Math.round((deferred / total) * 100) : 0,
      }
    })
    setCycleChart(chart)

    // Everything else: specific to the SELECTED cycle, not "the latest".
    const selectedPayments = rawPayments.filter((p) => {
      const d = new Date(p.cycle_month)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === selectedKey
    })

    if (selectedPayments.length === 0) {
      setHasCycleData(false)
      setStatusMix({ onTime: 0, atFloor: 0, deferred: 0 })
      setOnTimeRate(0)
      setFloorSavedCount(0)
      setOnTimeRateDelta(null)
      return
    }
    setHasCycleData(true)

    const total = selectedPayments.length
    const onTimeCount = selectedPayments.filter((p) => bucket(p) === "onTime").length
    const atFloorCount = selectedPayments.filter((p) => bucket(p) === "atFloor").length
    const deferredCount = selectedPayments.filter((p) => bucket(p) === "deferred").length
    setStatusMix({
      onTime: Math.round((onTimeCount / total) * 100),
      atFloor: Math.round((atFloorCount / total) * 100),
      deferred: Math.round((deferredCount / total) * 100),
    })
    const rate = Math.round((onTimeCount / total) * 100)
    setOnTimeRate(rate)
    setFloorSavedCount(atFloorCount)

    // Real delta vs the previous cycle — only shown when that cycle
    // actually has data to compare against, never fabricated.
    const prevDate = new Date(selectedYear, selectedMonth - 1, 1)
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`
    const prevPayments = rawPayments.filter((p) => {
      const d = new Date(p.cycle_month)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === prevKey
    })
    if (prevPayments.length) {
      const prevOnTime = prevPayments.filter((p) => bucket(p) === "onTime").length
      const prevRate = Math.round((prevOnTime / prevPayments.length) * 100)
      setOnTimeRateDelta(rate - prevRate)
    } else {
      setOnTimeRateDelta(null)
    }
  }, [selectedYear, selectedMonth, rawLoans, rawPayments])

  const cycleLabel = `${MONTHS[selectedMonth]} ${selectedYear}`

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (!hasLoans) {
    return (
      <div className="p-6 md:p-8">
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No borrowers yet. Once you have an active loan, your portfolio overview will show up here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex-1">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight" style={{ letterSpacing: "-0.02em" }}>
            Portfolio overview
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5 max-w-xl">
            Adaptive repayment plans across all active borrowers — how this cycle is tracking and who needs attention next.
          </p>
        </div>
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setPickerOpen((o) => !o)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-medium text-sm transition-all duration-150 hover:opacity-90"
            style={{ backgroundColor: "#0B1324" }}
          >
            <Calendar size={15} />
            {cycleLabel}
            <ChevronDown size={15} />
          </button>
          {pickerOpen && (
            <CyclePicker
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              onSelect={(y, m) => {
                setSelectedYear(y)
                setSelectedMonth(m)
              }}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </div>
      </div>

      <TrustScoreCard passport={trustPassport ?? undefined} />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active borrowers" value={String(activeLoansCount)} icon={Users} accentColor="#2563EB" bgColor="#EFF6FF" iconColor="text-blue-600" deltaText="" deltaColor="#2F9E6E" note="Active loans" />
        <StatCard label="Pending hardship requests" value={String(pendingHardshipCount)} icon={FileText} accentColor="#DC2626" bgColor="#FEF2F2" iconColor="text-red-500" deltaText="" deltaColor="#DC2626" note="Awaiting review" />
        <StatCard
          label="On-time rate"
          value={hasCycleData ? `${onTimeRate}%` : "—"}
          icon={TrendingUp}
          accentColor="#2F9E6E"
          bgColor="#F0FDF4"
          iconColor="text-emerald-600"
          deltaText={hasCycleData && onTimeRateDelta !== null ? `${onTimeRateDelta > 0 ? "+" : ""}${onTimeRateDelta}%` : ""}
          deltaColor={onTimeRateDelta !== null && onTimeRateDelta < 0 ? "#DC2626" : "#2F9E6E"}
          note={hasCycleData ? cycleLabel : `No data for ${cycleLabel}`}
        />
        <StatCard label="At-risk borrowers" value={String(atRiskCount)} icon={ShieldAlert} accentColor="#DFA23A" bgColor="#FFFBEB" iconColor="text-amber-500" deltaText="" deltaColor="#2F9E6E" note="Overdue or in hardship" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Line Chart */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border shadow-sm p-6">
          <h2 className="font-bold text-foreground text-base mb-0.5">Payment outcomes, 6 cycles ending {cycleLabel}</h2>
          <p className="text-muted-foreground text-sm mb-5">On time vs floor payments vs deferred — hover a point for the breakdown</p>
          {cycleChart.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">No payment history yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={cycleChart} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#000000", fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} tick={{ fill: "#000000", fontSize: 12 }} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#E2E8F0", strokeWidth: 1 }} />
                <Line type="monotone" dataKey="onTime" name="On time" stroke="#2F9E6E" strokeWidth={2.5} dot={{ r: 3, fill: "#2F9E6E", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="atFloor" name="At floor" stroke="#DFA23A" strokeWidth={2.5} dot={{ r: 3, fill: "#DFA23A", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="deferred" name="Deferred" stroke="#DC2626" strokeWidth={2.5} dot={{ r: 3, fill: "#DC2626", strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
          <div className="flex items-center gap-5 mt-4">
            {[
              { color: "#DFA23A", label: "At floor" },
              { color: "#DC2626", label: "Deferred" },
              { color: "#2F9E6E", label: "On time" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Status Mix */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 flex flex-col">
          <h2 className="font-bold text-foreground text-base mb-0.5">{cycleLabel}'s status mix</h2>
          <p className="text-muted-foreground text-sm mb-6">Where borrowers landed this cycle</p>
          {!hasCycleData ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-muted-foreground text-center">No payment data for {cycleLabel}.</p>
            </div>
          ) : (
            <>
              <div className="space-y-5 flex-1">
                {[
                  { label: "On time", pct: statusMix.onTime, color: "#2F9E6E" },
                  { label: "At floor", pct: statusMix.atFloor, color: "#DFA23A" },
                  { label: "Hardship / deferred", pct: statusMix.deferred, color: "#DC2626" },
                ].map(({ label, pct, color }) => (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-foreground font-medium">{label}</span>
                      <span className="font-semibold text-foreground">{pct}%</span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground text-sm mt-6 leading-relaxed">
                Floor payments kept <span className="font-bold text-foreground">{floorSavedCount} {floorSavedCount === 1 ? "borrower" : "borrowers"}</span> out of default this cycle.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Hardship Alert Banner */}
      {bannerVisible && pendingHardshipCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-center gap-4">
          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <Bell size={16} className="text-red-600" />
          </div>
          <p className="flex-1 text-sm text-red-700 font-medium">
            {pendingHardshipCount} pending hardship {pendingHardshipCount === 1 ? "request" : "requests"} awaiting review
          </p>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => onReviewHardship?.()}
              className="flex items-center gap-1 text-sm font-semibold text-red-600 hover:text-red-700 transition-colors"
            >
              Review now <ArrowRight size={13} className="text-red-600" />
            </button>
            <button onClick={() => setBannerVisible(false)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Due Soon Table */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="font-bold text-foreground text-base">Due soon</h2>
            <p className="text-muted-foreground text-sm mt-0.5">Upcoming payments in the next 7 days</p>
          </div>
          <button
            onClick={() => onNavigate?.("Borrowers")}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground border border-border rounded-xl px-3 py-2 hover:bg-secondary transition-colors"
          >
            View all borrowers <ArrowRight size={13} />
          </button>
        </div>
        {dueSoon.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">Nothing due in the next 7 days.</p>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Borrower", "Loan ID", "Due date", "Suggested payment", "Status", ""].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dueSoon.map((b) => {
                const meta = statusMeta[b.status]
                return (
                  <tr key={b.loanId} className="border-b border-border last:border-0 hover:bg-secondary transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${meta.dot}`} />
                        <div>
                          <div className="font-semibold text-foreground">{b.name}</div>
                          <div className="text-muted-foreground text-xs">{b.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{b.loanId}</td>
                    <td className="px-6 py-4">
                      <div className="text-foreground">{b.dueDate}</div>
                      <div className="text-muted-foreground text-xs">in {b.daysLeft} days</div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-foreground">{b.payment}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${meta.pill}`}>{b.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => onNavigate?.("Borrowers")}
                        className="text-xs font-medium text-muted-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-secondary transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        )}
      </div>

      <div className="h-4" />
    </div>
  )
}