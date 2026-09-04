import {
  Sparkles,
  Crown,
  Check,
  BadgeCheck,
  Mic,
  MessageCircle,
  FileText,
  UploadCloud,
  ShieldAlert,
  Clock,
  Radar,
  TrendingUp,
  ArrowRight,
  ChevronRight,
  type LucideIcon,
} from "lucide-react"

/* =========================================================================
   PREMIUM FEATURES DATA
   ========================================================================= */

type Accent = "indigo" | "teal" | "amber" | "blue"

interface PremiumFeature {
  key: string
  icon: LucideIcon
  accent: Accent
  title: string
  tagline: string
  stats: { value: string; label: string }[]
  points: string[]
}

const premiumFeatures: PremiumFeature[] = [
  {
    key: "credit-passport",
    icon: BadgeCheck,
    accent: "indigo",
    title: "Credit Passport",
    tagline: "Borrower history, verified and portable.",
    stats: [
      { value: "3+", label: "Lenders linked" },
      { value: "94%", label: "Match accuracy" },
      { value: "Instant", label: "Lookup" },
    ],
    points: [
      "Import verified repayment history from other lenders",
      "Auto-scored reliability tier shown on every application",
      "No more blind approvals — see the full picture before you lend",
    ],
  },
  {
    key: "voice",
    icon: Mic,
    accent: "teal",
    title: "Unlimited Voice Intelligence",
    tagline: "Speak it. AI captures it.",
    stats: [
      { value: "3", label: "Languages" },
      { value: "98%", label: "Accuracy" },
      { value: "0 min", label: "Entry time" },
    ],
    points: [
      "Hindi, English & Hinglish voice notes — unlimited",
      "Auto-extract borrower details, payments & hardship reasons",
      "Zero manual typing — record and it's logged",
    ],
  },
  {
    key: "case-file",
    icon: FileText,
    accent: "amber",
    title: "Borrower Case File Export",
    tagline: "One click. Full case, ready to share.",
    stats: [
      { value: "1-click", label: "Export" },
      { value: "PDF", label: "Format" },
      { value: "Audit-ready", label: "Formatting" },
    ],
    points: [
      "Full payment history, hardship requests & notes in one PDF",
      "Ready to hand to collections agencies, legal counsel, or bureaus",
      "Auto-generated on demand — always reflects the latest data",
    ],
  },
  {
    key: "what-if",
    icon: Sparkles,
    accent: "blue",
    title: "What-If Simulator",
    tagline: "Test it before you approve it.",
    stats: [
      { value: "Instant", label: "Results" },
      { value: "Live", label: "Portfolio data" },
      { value: "0", label: "Risk to test" },
    ],
    points: [
      "Simulate guardrail or template changes against real borrower data",
      "See portfolio-wide impact before committing to a policy change",
      "AI-assisted plain-language summaries of what would happen",
    ],
  },
  {
    key: "bulk-import",
    icon: UploadCloud,
    accent: "teal",
    title: "Bulk Borrower Import",
    tagline: "Hundreds of borrowers, one upload.",
    stats: [
      { value: "CSV/XLSX", label: "Supported" },
      { value: "500+", label: "Rows per upload" },
      { value: "Auto", label: "Field matching" },
    ],
    points: [
      "Migrate an existing spreadsheet straight into the dashboard",
      "Auto-matches columns to loan ID, income, template, and status",
      "Validation flags errors before anything gets imported",
    ],
  },
  {
    key: "risk-scoring",
    icon: Radar,
    accent: "amber",
    title: "Predictive Default Risk",
    tagline: "See the miss before it happens.",
    stats: [
      { value: "AI", label: "Powered" },
      { value: "Weekly", label: "Refresh" },
      { value: "Early", label: "Warning" },
    ],
    points: [
      "Flags borrowers likely to miss their next payment, ahead of time",
      "Learns from income volatility and past hardship patterns",
      "Lets you offer a floor payment before a cycle is ever missed",
    ],
  },
]

const accentTheme: Record<Accent, { cardBg: string; border: string; chip: string; badgeBg: string; badgeText: string }> = {
  indigo: { cardBg: "bg-indigo-50/50", border: "border-indigo-100", chip: "#4f46e5", badgeBg: "bg-indigo-100", badgeText: "text-indigo-700" },
  teal: { cardBg: "bg-emerald-50/50", border: "border-emerald-100", chip: "#059669", badgeBg: "bg-emerald-100", badgeText: "text-emerald-700" },
  amber: { cardBg: "bg-amber-50/50", border: "border-amber-100", chip: "#dfa23a", badgeBg: "bg-amber-100", badgeText: "text-amber-700" },
  blue: { cardBg: "bg-blue-50/50", border: "border-blue-100", chip: "#2563eb", badgeBg: "bg-blue-100", badgeText: "text-blue-700" },
}

function FeatureInDepthCard({ feature }: { feature: PremiumFeature }) {
  const t = accentTheme[feature.accent]
  const Icon = feature.icon

  return (
    <div className={`rounded-2xl border ${t.border} ${t.cardBg} p-5 sm:p-6`}>
      <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-6 items-center">
        <div className="flex flex-col items-center text-center bg-white rounded-2xl border border-slate-100 p-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-3" style={{ backgroundColor: t.chip }}>
            <Icon size={24} />
          </div>
          <p className="text-sm font-semibold" style={{ color: t.chip }}>
            {feature.tagline}
          </p>
          <div className="grid grid-cols-3 gap-2 mt-4 w-full">
            {feature.stats.map((s) => (
              <div key={s.label}>
                <p className="text-slate-900 font-bold text-sm">{s.value}</p>
                <p className="text-slate-400 text-[10px] mt-0.5 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-slate-900 font-semibold text-lg">{feature.title}</h4>
          <div className="space-y-2 mt-3">
            {feature.points.map((p) => (
              <div key={p} className="flex items-start gap-2 text-sm text-slate-600">
                <Check size={15} className="shrink-0 mt-0.5" style={{ color: t.chip }} />
                {p}
              </div>
            ))}
          </div>
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${t.badgeBg} ${t.badgeText} mt-4`}>
            <Sparkles size={11} />
            Premium Feature
          </span>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   PAGE
   ========================================================================= */

export default function Premium() {
  const heroStats: { icon: LucideIcon; value: string; label: string }[] = [
    { icon: ShieldAlert, value: "AI-assisted", label: "Credit Passport" },
    { icon: Mic, value: "Unlimited", label: "Voice Intelligence" },
    { icon: Sparkles, value: "Instant", label: "What-If Simulator" },
    { icon: Radar, value: "Predictive", label: "Default Risk" },
  ]

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Breadcrumb */}
      <p className="text-xs text-slate-400">
        Settings <ChevronRight size={11} className="inline -mt-0.5 mx-0.5" /> Billing &amp; Plans{" "}
        <ChevronRight size={11} className="inline -mt-0.5 mx-0.5" /> <span className="text-slate-600 font-medium">Premium Plans</span>
      </p>

      {/* Hero pricing card */}
      <div className="rounded-2xl p-6 sm:p-8 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0b1324 0%, #1e1b4b 55%, #0f766e 100%)" }}>
        <div className="flex items-start justify-between gap-6 flex-wrap pr-2 sm:pr-20">
          <div className="max-w-lg">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-400/20 text-indigo-300">
              <Crown size={11} />
              PREMIUM PLAN
            </span>
            <h1 className="text-white text-2xl sm:text-3xl font-bold mt-3">
              Unlock smarter <span className="text-emerald-400">Lending Decisions</span>
            </h1>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
            </p>
          </div>

          <div className="text-left shrink-0">
            <p className="text-slate-400 text-[11px] uppercase tracking-widest">Starting at</p>
            <p className="text-white font-extrabold leading-none mt-1.5 text-4xl sm:text-5xl">
              ₹299<span className="text-slate-400 text-lg font-semibold">/mo</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          {heroStats.map((s) => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3.5">
              <s.icon size={15} className="text-emerald-400 mb-2" />
              <p className="text-white font-bold text-lg">{s.value}</p>
              <p className="text-slate-300 text-xs font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 mt-6 flex-wrap">
          <button className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">
            <Sparkles size={14} />
            Upgrade to Premium
            <ArrowRight size={14} />
          </button>
          <button className="text-sm font-medium px-4 py-2.5 rounded-xl border border-white/15 text-slate-300 hover:bg-white/5 transition-colors">
            Continue with Free Plan
          </button>
        </div>
      </div>

      {/* Free vs Premium comparison */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "rgb(5, 7, 13)" }}>
        <div className="text-center pt-10 pb-8 px-6">
          <h2 className="text-white text-2xl sm:text-3xl font-extrabold">Free vs. Premium</h2>
          <p className="text-slate-400 text-sm mt-2">See exactly what you unlock when you upgrade.</p>
        </div>

        <div className="overflow-x-auto px-4 sm:px-8 pb-8">
          <table className="w-full text-sm border-collapse" style={{ minWidth: 560 }}>
            <thead>
              <tr>
                <th className="text-left font-medium text-slate-500 text-xs uppercase tracking-wider pb-4 px-5 border-b border-white/10">Feature</th>
                <th className="text-left font-medium text-slate-400 pb-4 px-5 border-b border-white/10">Free</th>
                <th className="text-left pb-4 px-5 border-b border-white/10 bg-emerald-400/[0.06]">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-400">
                    <Crown size={13} />
                    Premium
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  { label: "Credit Passport", free: false , premium: "AI-assisted Credit Passport" },
                  { label: "Unlimited Voice Intelligence", free: "20 per month", premium: "100 per month" },
                  { label: "What-If Simulator", free: "10 per month", premium: "Instant, live portfolio data" },
                  { label: "Predictive Default Risk", free: false, premium: "Saves from missed deadlines" },
                  { label: "Borrower Case File Export", free: false, premium: "1-click PDF export" },
                  { label: "Bulk Borrower Import", free: false, premium: "500+ rows per upload" },
                ] as { label: string; free: string | false; premium: string }[]
              ).map((row, i, arr) => (
                <tr key={row.label} className={i !== arr.length - 1 ? "border-b border-white/5" : ""}>
                  <td className="py-4 px-5 text-slate-200 font-medium">{row.label}</td>
                  <td className="py-4 px-5">
                    {row.free === false ? <span className="text-red-400 text-base">✕</span> : <span className="text-slate-500">{row.free}</span>}
                  </td>
                  <td className="py-4 px-5 bg-emerald-400/[0.06]">
                    <span className="flex items-center gap-1.5 text-emerald-300">
                      <Check size={14} className="shrink-0" />
                      {row.premium}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Premium features, in depth */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Premium Features, in Depth</h2>
        <p className="text-slate-500 text-sm mt-1">Built specifically for lenders serving India's informal-income borrowers.</p>

        <div className="space-y-4 mt-5">
          {premiumFeatures.map((f) => (
            <FeatureInDepthCard key={f.key} feature={f} />
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div
        className="relative overflow-hidden rounded-2xl p-8 sm:p-10 flex items-center justify-between flex-wrap gap-6"
        style={{ background: "linear-gradient(100deg, #0f2a24 0%, #1e1b4b 60%, #1e1b4b 100%)" }}
      >
        <div className="pointer-events-none absolute -top-20 -left-20 w-56 h-56 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 w-56 h-56 rounded-full bg-indigo-400/10 blur-3xl" />

        <div className="relative">
          <h3 className="text-white text-2xl sm:text-3xl font-extrabold">Ready to transform your lending ops?</h3>
          <p className="text-slate-400 text-sm sm:text-base mt-2">Join lending teams already using Adaptive Repayment Premium.</p>
        </div>

        <div className="relative flex items-center gap-3 flex-wrap">
          <button
            className="flex items-center gap-2 text-sm font-bold px-6 py-3.5 rounded-xl text-white shadow-lg hover:-translate-y-0.5 transition-transform whitespace-nowrap"
            style={{ background: "linear-gradient(90deg, #10b981 0%, #6366f1 100%)" }}
          >
            <Sparkles size={16} />
            Start Free Trial
          </button>
          <button className="flex items-center gap-1.5 text-sm font-medium px-6 py-3.5 rounded-xl border border-white/15 text-slate-200 hover:bg-white/5 transition-colors whitespace-nowrap">
            Talk to Sales
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Slim help bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-white/[0.02] border border-emerald-800/30 rounded-2xl px-6 py-5">
        <div className="flex items-center gap-3">
          <MessageCircle size={20} className="text-slate-400 shrink-0" />
          <div>
            <p className="text-blue-900 text-sm font-medium">Need help choosing a plan?</p>
            <p className="text-slate-500 text-xs mt-0.5">Our team is happy to walk you through what works for your NBFC.</p>
          </div>
        </div>
        <button className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-300 whitespace-nowrap">
          Talk to Us
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}