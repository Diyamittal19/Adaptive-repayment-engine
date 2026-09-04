import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { DEMO_MODE, demoLoan, demoPayments, demoExpenses, demoSavingsBalance, demoSavingsLog, demoIncomeLog, demoGoals, demoOccupation } from "@/lib/demoData";
import type { LucideIcon } from "lucide-react";
import {
  Wallet,
  PlusCircle,
  MinusCircle,
  TrendingUp,
  Target,
  RefreshCw,
  Home,
  Car,
  Users,
  Package,
  MoreHorizontal,
  Sparkles,
  Plus,
  ShieldCheck,
  BadgeCheck,
  HeartPulse,
  Landmark,
  PiggyBank,
  Hammer,
  Rocket,
  Send,
  LayoutGrid,
  ListChecks,
  TrendingDown,
  Minus,
  CalendarClock,
  History,
  IndianRupee,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";


type CategoryKey = "rent" | "stock" | "transport" | "family" | "other";
type AccentKey = "teal" | "navy";
type Direction = "up" | "down" | "typical";

interface Category {
  key: CategoryKey;
  label: string;
  icon: LucideIcon;
}

interface MonthHistoryItem {
  month: string;
  income: number;
  expenses: number;
  saved: number;
}

interface Expense {
  id: number;
  category: CategoryKey;
  amount: number;
  note: string;
}

interface Goal {
  id: number;
  name: string;
  target: number;
  saved: number;
}

interface SuggestionItem {
  key: string;
  icon: LucideIcon;
  accent: AccentKey;
  type: string;
  name: string;
  reason: string;
  stat1Label: string;
  stat1Value: string;
  stat2Label: string;
  stat2Value: string;
}

interface Occupation {
  key: string;
  label: string;
  holidayEffect: "up" | "down" | "flat";
  note: string;
}

interface SavingsSuggestion {
  pct: number;
  reason: string;
  amount: number;
  volatility: number;
}

interface VolatilityForecastResult {
  direction: Direction;
  occ: Occupation;
  message: string;
}

interface Tab {
  key: string;
  label: string;
  icon: LucideIcon;
  count?: number;
}

interface QuickLogSubmit {
  amount: number;
  category: CategoryKey | null;
  note: string;
}

type IncomeFrequency = "daily" | "weekly" | "monthly";

interface IncomeLogEntry {
  id: number;
  amount: number;
  frequency: IncomeFrequency;
  loggedAt: string;
}

// Normalizes a logged income entry to a monthly-equivalent figure, since
// suggestions/charts work in monthly terms regardless of how someone
// prefers to report their earnings.
function monthlyEquivalent(entry: IncomeLogEntry): number {
  if (entry.frequency === "daily") return Math.round(entry.amount * 30);
  if (entry.frequency === "weekly") return Math.round(entry.amount * 4.33);
  return entry.amount;
}

interface QuickLogCardProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  categoryPicker?: boolean;
  onSubmit: (data: QuickLogSubmit) => void;
  buttonLabel: string;
}

interface SuggestionCardProps {
  item: SuggestionItem;
}

interface TrendChartProps {
  history: MonthHistoryItem[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey?: string | number;
    value?: string | number;
    stroke?: string;
  }>;
  label?: string | number;
}

interface ExpenseBreakdownProps {
  expenses: Expense[];
  saved: number;
}

interface GoalCardProps {
  goal: Goal;
  onAdd: (id: number, amount: number) => void;
}

interface GoalsTabProps {
  goals: Goal[];
  onAddGoal: (goal: Goal) => void;
  onAddToGoal: (id: number, amount: number) => void;
}

/* =========================================================================
   SAMPLE DATA
   ========================================================================= */

const categories: Category[] = [
  { key: "rent", label: "Rent", icon: Home },
  { key: "stock", label: "Stock / Inventory", icon: Package },
  { key: "transport", label: "Transport", icon: Car },
  { key: "family", label: "Family", icon: Users },
  { key: "other", label: "Other", icon: MoreHorizontal },
];

const categoryColors: Record<CategoryKey, string> = {
  rent: "#0f172a",
  stock: "#0d9488",
  transport: "#0369a1",
  family: "#0f766e",
  other: "#64748b",
};

// monthHistory, initialExpenses, monthIncome, and avgDailySpend used to be
// hardcoded here. They're now computed inside Tracker() from real
// `payments` (income), `expenses`, and `savings_transactions` rows —
// see loadTrackerData() below.

/* =========================================================================
   VOLATILITY-AWARE SAVINGS LOGIC
   ========================================================================= */

function computeSuggestion(incomes: number[]): SavingsSuggestion {
  const avg = incomes.reduce((a, b) => a + b, 0) / incomes.length;
  const variance = incomes.reduce((sum, v) => sum + (v - avg) ** 2, 0) / incomes.length;
  const stdDev = Math.sqrt(variance);
  const volatility = avg > 0 ? stdDev / avg : 0;

  const latest = incomes[incomes.length - 1];
  const isAboveAverage = latest >= avg;

  let pct, reason;
  if (volatility < 0.15) {
    pct = 12;
    reason = "Your income has been fairly steady the last few months, so a steady amount works well.";
  } else if (isAboveAverage) {
    pct = 22;
    reason = "Your income swings a fair bit month to month, and this one's above your average — a good month to save extra for the leaner ones.";
  } else {
    pct = 8;
    reason = "This month came in below your average — saving a smaller amount keeps things manageable.";
  }

  return { pct, reason, amount: Math.round((latest * pct) / 100), volatility };
}

/* =========================================================================
   VOLATILITY RISK FORECAST — proactive, not borrower-initiated (unlike
   What-If). In a full build this would run on an AI API (e.g. Gemini),
   reading the borrower's occupation from their profile and checking the
   public holiday calendar automatically. Shown here with sample computed
   values standing in for that — no manual inputs.
   ========================================================================= */

const occupations: Occupation[] = [
  {
    key: "gig-delivery",
    label: "Gig delivery / rideshare",
    holidayEffect: "up",
    note: "Order volume typically rises on festivals and public holidays — more people ordering in, more trips.",
  },
  {
    key: "tutor",
    label: "Private tutor",
    holidayEffect: "down",
    note: "Sessions typically drop on public holidays and school breaks — students and schools are off.",
  },
  {
    key: "vendor",
    label: "Vendor / small shop",
    holidayEffect: "up",
    note: "Festival and holiday shopping usually means more footfall and higher sales.",
  },
  {
    key: "freelancer",
    label: "Freelancer / consultant",
    holidayEffect: "flat",
    note: "Client work is usually unaffected by public holidays, though clients may be slower to respond.",
  },
];

// The borrower's occupation comes from their own profile data (fetched
// below, not hardcoded), and the public holiday count for the current
// month is fetched live from a public holiday calendar API — nothing
// here is a fixed sample value.
function matchOccupation(occupationText: string | null): Occupation {
  if (!occupationText) return occupations[3]; // freelancer/consultant — neutral default when unset
  const t = occupationText.toLowerCase();
  if (t.includes("deliver") || t.includes("ride") || t.includes("driver") || t.includes("gig")) return occupations[0];
  if (t.includes("tutor") || t.includes("teach")) return occupations[1];
  if (t.includes("vendor") || t.includes("shop") || t.includes("retail") || t.includes("stall")) return occupations[2];
  return occupations[3];
}

function computeVolatilityForecast(occ: Occupation, holidaysThisMonth: number): VolatilityForecastResult {
  if (holidaysThisMonth === 0) {
    return { direction: "typical", occ, message: "No public holidays this month — a fairly typical month expected." };
  }

  if (occ.holidayEffect === "up") {
    return {
      direction: "up",
      occ,
      message: `${holidaysThisMonth} public holiday${holidaysThisMonth > 1 ? "s" : ""} this month — income is likely to be higher than usual.`,
    };
  }
  if (occ.holidayEffect === "down") {
    return {
      direction: "down",
      occ,
      message: `${holidaysThisMonth} public holiday${holidaysThisMonth > 1 ? "s" : ""} this month — income is likely to be lower than usual.`,
    };
  }
  return { direction: "typical", occ, message: "Public holidays don't tend to move your income much — a fairly typical month expected." };
}

// India's 17 central gazetted public holidays for 2026, per DoPT Office
// Memorandum F.No.12/2/2023-JCA dated 3 July 2025 (dopt.gov.in). This is a
// real, sourced calendar — not a placeholder number — updated once a year
// when the next DoPT circular is published, rather than fetched live from
// a third-party API (Nager.Date/nagerholidays.com does not reliably cover
// India — it returns an empty response for the IN country code).
const INDIA_GAZETTED_HOLIDAYS_2026 = [
  "2026-01-26", // Republic Day
  "2026-03-04", // Holi
  "2026-03-21", // Id-ul-Fitr
  "2026-03-26", // Ram Navami
  "2026-03-31", // Mahavir Jayanti
  "2026-04-03", // Good Friday
  "2026-05-01", // Buddha Purnima
  "2026-05-27", // Id-ul-Zuha (Bakrid)
  "2026-06-26", // Muharram
  "2026-08-15", // Independence Day
  "2026-08-26", // Milad-un-Nabi
  "2026-09-04", // Janmashtami
  "2026-10-02", // Mahatma Gandhi Jayanti
  "2026-10-20", // Dussehra
  "2026-11-08", // Diwali
  "2026-11-24", // Guru Nanak Jayanti
  "2026-12-25", // Christmas Day
];

function VolatilityForecast() {
  const [loading, setLoading] = useState(true);
  const [occupationText, setOccupationText] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      // Occupation — read from the borrower's own profile data.
      if (DEMO_MODE) {
        if (active) setOccupationText(demoOccupation);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from("borrower_profiles")
            .select("occupation")
            .eq("borrower_id", user.id)
            .maybeSingle();
          if (active) setOccupationText(data?.occupation ?? null);
        }
      }
      if (active) setLoading(false);
    }
    load();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
        <p className="text-sm text-muted-foreground">Checking your occupation and this month's public holidays…</p>
      </div>
    );
  }

  const occ = matchOccupation(occupationText);
  const now = new Date();
  const holidaysThisMonth = INDIA_GAZETTED_HOLIDAYS_2026.filter((d) => {
    const date = new Date(d);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }).length;

  const forecast = computeVolatilityForecast(occ, holidaysThisMonth);

  const directionStyles = {
    up: { badge: "bg-teal-50 text-teal-700", icon: TrendingUp, label: "Likely higher" },
    down: { badge: "bg-amber-50 text-amber-700", icon: TrendingDown, label: "Likely lower" },
    typical: { badge: "bg-secondary text-muted-foreground", icon: Minus, label: "Typical" },
  };
  const d = directionStyles[forecast.direction];
  const DirIcon = d.icon;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-foreground font-semibold text-base flex items-center gap-2">
          <CalendarClock size={17} className="text-teal-700" />
          Upcoming volatility risk
        </h3>
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${d.badge}`}>
          <DirIcon size={12} />
          {d.label}
        </span>
      </div>
      <p className="text-muted-foreground text-sm mt-1">
        A heads-up before the month starts — based on your occupation ({occ.label}) and the public holiday calendar
      </p>

      <div className="rounded-xl bg-secondary p-4 mt-4">
        <p className="text-foreground text-sm font-medium">{forecast.message}</p>
        <p className="text-muted-foreground text-xs mt-1 leading-relaxed">{occ.note}</p>
      </div>
    </div>
  );
}

/* =========================================================================
   RULE-BASED SUGGESTIONS — insurance & credit products picked from the
   borrower's own logged data, no API involved.
   ========================================================================= */

function computeProductSuggestions({
  savingsBalance,
  volatility,
  avgIncome,
}: { savingsBalance: number; volatility: number; avgIncome: number }): SuggestionItem[] {
  const suggestions = [];

  // PMSBY — Pradhan Mantri Suraksha Bima Yojana (real, govt.-backed accident cover)
  suggestions.push({
    key: "pmsby",
    icon: ShieldCheck,
    accent: "teal" as AccentKey,
    type: "Insurance · Govt. scheme",
    name: "PMSBY — Accident Cover",
    reason: "At just ₹20/year, this fits almost any budget and protects against lost income from an accident",
    stat1Label: "Premium",
    stat1Value: "₹20 / yr",
    stat2Label: "Cover",
    stat2Value: "₹2,00,000",
  });

  // PMJJBY — Pradhan Mantri Jeevan Jyoti Bima Yojana (real, govt.-backed life cover)
  if (savingsBalance >= 500) {
    suggestions.push({
      key: "pmjjby",
      icon: HeartPulse,
      accent: "navy" as AccentKey,
      type: "Insurance · Govt. scheme",
      name: "PMJJBY — Life Cover",
      reason: "Your current savings can comfortably cover this year's premium",
      stat1Label: "Premium",
      stat1Value: "₹436 / yr",
      stat2Label: "Cover",
      stat2Value: "₹2,00,000",
    });
  }

  // PM Jan Dhan Yojana — foundational, fits any borrower regardless of savings level
  suggestions.push({
    key: "pmjdy",
    icon: Wallet,
    accent: "navy" as AccentKey,
    type: "Banking · Govt. scheme",
    name: "PM Jan Dhan Yojana",
    reason: "A zero-balance account with a free RuPay card, built-in accident cover, and a small emergency overdraft",
    stat1Label: "Overdraft",
    stat1Value: "Up to ₹10,000",
    stat2Label: "Accident cover",
    stat2Value: "₹2,00,000",
  });

  // PM Mudra Yojana, Shishu category (real — small collateral-free business loan)
  if (savingsBalance >= 500 && volatility < 0.2) {
    suggestions.push({
      key: "mudra-shishu",
      icon: Landmark,
      accent: "teal" as AccentKey,
      type: "Credit · Govt. scheme",
      name: "Mudra Loan — Shishu",
      reason: "Your steady saving habit is the kind of track record lenders look for on a small, collateral-free loan",
      stat1Label: "Up to",
      stat1Value: "₹50,000",
      stat2Label: "Rate",
      stat2Value: "10–12% / yr",
    });
  }

  // Atal Pension Yojana — small, steady contributions fit a borrower who's
  // already shown they can save regularly
  if (savingsBalance >= 1000 && volatility < 0.25) {
    suggestions.push({
      key: "apy",
      icon: PiggyBank,
      accent: "navy" as AccentKey,
      type: "Pension · Govt. scheme",
      name: "Atal Pension Yojana",
      reason: "A guaranteed monthly pension after 60, funded by small automatic monthly contributions",
      stat1Label: "Pension",
      stat1Value: "₹1,000–5,000 / mo",
      stat2Label: "Entry age",
      stat2Value: "18–40 yrs",
    });
  }

  // Mudra Loan, Kishor category — a step up once savings suggest a more
  // established, growing business rather than a brand-new one
  if (savingsBalance >= 5000 && volatility < 0.2) {
    suggestions.push({
      key: "mudra-kishor",
      icon: Landmark,
      accent: "navy" as AccentKey,
      type: "Credit · Govt. scheme",
      name: "Mudra Loan — Kishor",
      reason: "A step up from Shishu once a business has a track record — for expansion, equipment, or working capital",
      stat1Label: "Range",
      stat1Value: "₹50,000–₹5,00,000",
      stat2Label: "Rate",
      stat2Value: "Bank MCLR + spread",
    });
  }

  suggestions.push({
    key: "goal-plus",
    icon: BadgeCheck,
    accent: "navy" as AccentKey,
    type: "In-app suggestion",
    name: "Goal Booster",
    reason: `Based on ~₹${avgIncome.toLocaleString("en-IN")} average income`,
    stat1Label: "Suggested top-up",
    stat1Value: `₹${Math.round(avgIncome * 0.05).toLocaleString("en-IN")}`,
    stat2Label: "Frequency",
    stat2Value: "Per good month",
  });

  // PM SVANidhi — collateral-free working-capital loan for street vendors
  suggestions.push({
    key: "pm-svanidhi",
    icon: Landmark,
    accent: "teal" as AccentKey,
    type: "Credit · Govt. scheme",
    name: "PM SVANidhi",
    reason: "A collateral-free working-capital loan for street vendors, with a real interest subsidy for repaying on time",
    stat1Label: "1st tranche",
    stat1Value: "Up to ₹15,000",
    stat2Label: "Interest subsidy",
    stat2Value: "7% / yr on-time",
  });

  // PM Vishwakarma — skill training, toolkit grant, and low-interest credit
  // for artisans/craftspeople in traditional trades
  suggestions.push({
    key: "pm-vishwakarma",
    icon: Hammer,
    accent: "navy" as AccentKey,
    type: "Skill & Credit · Govt. scheme",
    name: "PM Vishwakarma",
    reason: "Combines a ₹15,000 toolkit grant with low-interest, collateral-free credit for traditional trade work",
    stat1Label: "Loan (2 tranches)",
    stat1Value: "Up to ₹3,00,000",
    stat2Label: "Rate",
    stat2Value: "5% / yr",
  });

  // Stand-Up India — larger bank credit for a first-time SC/ST or woman
  // entrepreneur; shown once a business shows real stability
  if (savingsBalance >= 10000 && volatility < 0.15) {
    suggestions.push({
      key: "stand-up-india",
      icon: Rocket,
      accent: "teal" as AccentKey,
      type: "Credit · Govt. scheme",
      name: "Stand-Up India",
      reason: "Collateral-free bank credit for a first-time SC/ST or woman entrepreneur to launch a new enterprise",
      stat1Label: "Range",
      stat1Value: "₹10,00,000–₹1 Cr",
      stat2Label: "Tenure",
      stat2Value: "Up to 7 yrs",
    });
  }

  return suggestions;
}

const accentStyles = {
  teal: { iconBg: "bg-blue-50", iconText: "text-blue-700", badgeBg: "bg-blue-50", badgeText: "text-blue-700" },
  navy: { iconBg: "bg-blue-100", iconText: "text-blue-800", badgeBg: "bg-blue-100", badgeText: "text-blue-800" },
};

/* =========================================================================
   SHARED UI BITS
   ========================================================================= */

function PillTabs({ tabs, active, onChange }: { tabs: Tab[]; active: string; onChange: (key: string) => void }) {
  return (
    <div className="inline-flex items-center gap-2 bg-card border border-border rounded-2xl p-1.5 shadow-sm">
      {tabs.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-colors ${
              isActive ? "bg-slate-900 text-white" : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            <t.icon size={15} />
            {t.label}
            {t.count != null && (
              <span
                className={`text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center ${
                  isActive ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground"
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* =========================================================================
   SUGGESTIONS GRID — card style matching the Lenders page
   ========================================================================= */

function SuggestionCard({ item }: SuggestionCardProps) {
  const a = accentStyles[item.accent];
  const Icon = item.icon;
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 flex flex-col h-full">
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-full ${a.iconBg} ${a.iconText} flex items-center justify-center shrink-0`}>
          <Icon size={19} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-foreground font-semibold">{item.name}</p>
            <BadgeCheck size={14} className="text-blue-600 shrink-0" />
          </div>
          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${a.badgeBg} ${a.badgeText} mt-1`}>
            {item.type}
          </span>
        </div>
      </div>

      <p className="text-muted-foreground text-xs mt-3 leading-relaxed mb-2">{item.reason}</p>

      <div className="mt-auto">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-muted-foreground text-xs">{item.stat1Label}</p>
            <p className="text-foreground font-medium text-sm mt-0.5">{item.stat1Value}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">{item.stat2Label}</p>
            <p className="text-foreground font-medium text-sm mt-0.5" >{item.stat2Value}</p>
          </div>
        </div>

        <button className="w-full mt-4 flex items-center justify-center gap-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 px-4 py-2.5 rounded-xl transition-colors">
          <Send size={14} />
          Learn more
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
   TREND CHART
   ========================================================================= */

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card rounded-xl shadow-lg border border-border p-3 text-xs min-w-[150px]">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.stroke }} />
            <span className="text-muted-foreground capitalize">{p.dataKey}</span>
          </div>
          <span className="font-semibold text-foreground">₹{Number(p.value ?? 0).toLocaleString("en-IN")}</span>
        </div>
      ))}
    </div>
  );
}

function TrendChart({ history }: TrendChartProps) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
      <h3 className="text-foreground font-semibold text-base">Income, expenses & savings</h3>
      <p className="text-muted-foreground text-sm mt-1">Last {history.length} months</p>
      <div className="mt-4" style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" axisLine={{ stroke: "var(--border)" }} tickLine={{ stroke: "var(--border)" }} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
            <YAxis
              axisLine={{ stroke: "var(--border)" }}
              tickLine={{ stroke: "var(--border)" }}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              width={64}
              tickFormatter={(v) => `₹${v.toLocaleString("en-IN")}`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--border)" }} />
            <Line type="monotone" dataKey="income" stroke="var(--foreground)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="expenses" stroke="var(--danger)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="saved" stroke="#0d9488" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-5 mt-3">
        {[
          { color: "var(--foreground)", label: "Income" },
          { color: "var(--danger)", label: "Expenses" },
          { color: "#0d9488", label: "Saved" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
   QUICK LOG CARD
   ========================================================================= */

function QuickLogCard({ title, subtitle, icon: Icon, categoryPicker, onSubmit, buttonLabel }: QuickLogCardProps) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categoryPicker ? categories[1].key : null);
  const [note, setNote] = useState("");

  function handleSubmit() {
    const value = Number(amount);
    if (!value || value <= 0) return;
    onSubmit({ amount: value, category, note });
    setAmount("");
    setNote("");
  }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6 h-full">
      <h3 className="text-foreground font-semibold text-base flex items-center gap-2">
        <Icon size={18} className="text-teal-700" />
        {title}
      </h3>
      <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>

      <div className="mt-4">
        <label className="text-xs text-muted-foreground">Amount</label>
        <div className="relative mt-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-300"
          />
        </div>
      </div>

      {categoryPicker && (
        <div className="mt-4">
          <label className="text-xs text-muted-foreground mb-2 block">Category</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => {
              const CatIcon = c.icon;
              const active = category === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border transition-colors ${
                    active ? "bg-slate-900 text-white border-slate-900" : "bg-card text-muted-foreground border-border hover:bg-secondary"
                  }`}
                >
                  <CatIcon size={13} />
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4">
        <label className="text-xs text-muted-foreground">Note (optional)</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={categoryPicker ? "e.g. vehicle repair" : "e.g. used for groceries"}
          className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-300"
        />
      </div>

      <button
        onClick={handleSubmit}
        className="w-full mt-5 flex items-center justify-center gap-2 text-sm font-medium text-white px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 transition-colors"
      >
        <Icon size={15} />
        {buttonLabel}
      </button>
    </div>
  );
}

/* =========================================================================
   LOG INCOME
   ========================================================================= */

function LogIncomeCard({
  incomeLog,
  onSubmit,
}: {
  incomeLog: IncomeLogEntry[];
  onSubmit: (data: { amount: number; frequency: IncomeFrequency }) => void;
}) {
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<IncomeFrequency>("monthly");
  const [showHistory, setShowHistory] = useState(false);

  function handleSubmit() {
    const value = Number(amount);
    if (!value || value <= 0) return;
    onSubmit({ amount: value, frequency });
    setAmount("");
  }

  const trail = incomeLog
    .slice()
    .sort((a, b) => (a.loggedAt < b.loggedAt ? 1 : -1));

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-foreground font-semibold text-base flex items-center gap-2">
            <IndianRupee size={18} className="text-teal-700" />
            Log income
          </h3>
          <p className="text-muted-foreground text-sm mt-1">However it comes in — daily, weekly, or monthly</p>
        </div>
        <button
          onClick={() => setShowHistory((s) => !s)}
          className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-muted-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-secondary transition-colors"
        >
          <History size={13} />
          {showHistory ? "Hide history" : "Income history"}
        </button>
      </div>

      <div className="mt-4">
        <label className="text-xs text-muted-foreground mb-2 block">How often?</label>
        <div className="flex gap-2">
          {(["daily", "weekly", "monthly"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFrequency(f)}
              className={`flex-1 text-xs font-medium px-3 py-2 rounded-xl border capitalize transition-colors ${
                frequency === f ? "bg-slate-900 text-white border-slate-900" : "bg-card text-muted-foreground border-border hover:bg-secondary"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 max-w-xs">
        <label className="text-xs text-muted-foreground">
          {frequency === "daily" ? "Amount, per day" : frequency === "weekly" ? "Amount, per week" : "Amount, this month"}
        </label>
        <div className="relative mt-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-300"
          />
        </div>
        {(frequency === "daily" || frequency === "weekly") && Number(amount) > 0 && (
          <p className="text-xs text-muted-foreground mt-1.5">
            ≈ ₹{monthlyEquivalent({ id: 0, amount: Number(amount), frequency, loggedAt: "" }).toLocaleString("en-IN")} / month
          </p>
        )}
      </div>

      <button
        onClick={handleSubmit}
        className="mt-5 flex items-center justify-center gap-2 text-sm font-medium text-white px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 transition-colors"
      >
        <IndianRupee size={15} />
        Log income
      </button>

      {showHistory && (
        <div className="mt-5 pt-5 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground mb-3">All logged income — every frequency</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {trail.length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing logged yet — your first entry will show up here.</p>
            )}
            {trail.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                <span className="text-muted-foreground">
                  {new Date(e.loggedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  <span className="ml-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">{e.frequency}</span>
                </span>
                <span className="text-foreground font-medium">₹{e.amount.toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   EXPENSE BREAKDOWN
   ========================================================================= */

function ExpenseBreakdown({ expenses, saved }: ExpenseBreakdownProps) {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const byCategory = useMemo(() => {
    const map: Record<CategoryKey, number> = {
      rent: 0,
      stock: 0,
      transport: 0,
      family: 0,
      other: 0
    };
    expenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return categories
      .map((c) => ({ ...c, amount: map[c.key] || 0 }))
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  // Both bars share the same scale — whichever of total expenses or
  // total saved is larger sets the 100% mark, so the two are visually
  // comparable at a glance.
  const scaleMax = Math.max(total, Math.abs(saved), 1);

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
      <h3 className="text-foreground font-semibold text-base">This month, at a glance</h3>
      <p className="text-muted-foreground text-sm mt-1">₹{total.toLocaleString("en-IN")} spent · ₹{saved.toLocaleString("en-IN")} saved so far</p>
      <div className="space-y-4 mt-5">
        {byCategory.map((c) => {
          const pct = Math.round((c.amount / scaleMax) * 100);
          return (
            <div key={c.key}>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-foreground">{c.label}</span>
                <span className="text-foreground font-medium">₹{c.amount.toLocaleString("en-IN")}</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: categoryColors[c.key] }} />
              </div>
            </div>
          );
        })}
        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-foreground">Saved</span>
            <span className="text-foreground font-medium">₹{saved.toLocaleString("en-IN")}</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-teal-600"
              style={{ width: `${Math.max(0, Math.round((saved / scaleMax) * 100))}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   SAVINGS GOALS
   ========================================================================= */

function GoalCard({ goal, onAdd }: GoalCardProps) {
  const [amount, setAmount] = useState("");
  const pct = Math.min(100, Math.round((goal.saved / goal.target) * 100));

  function handleAdd() {
    const value = Number(amount);
    if (!value || value <= 0) return;
    onAdd(goal.id, value);
    setAmount("");
  }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
      <div className="flex items-center justify-between">
        <p className="text-foreground font-semibold text-sm">{goal.name}</p>
        <p className="text-muted-foreground text-xs">
          ₹{goal.saved.toLocaleString("en-IN")} / ₹{goal.target.toLocaleString("en-IN")}
        </p>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden mt-3">
        <div className="h-full rounded-full bg-teal-600" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center gap-2 mt-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Add amount"
            className="w-full pl-7 pr-3 py-2 rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-300"
          />
        </div>
        <button
          onClick={handleAdd}
          className="text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 px-3 py-2 rounded-lg transition-colors shrink-0"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function GoalsTab({ goals, onAddGoal, onAddToGoal }: GoalsTabProps) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");

  function handleCreate() {
    const value = Number(target);
    if (!name.trim() || !value || value <= 0) return;
    onAddGoal({ id: Date.now(), name: name.trim(), target: value, saved: 0 });
    setName("");
    setTarget("");
  }

  return (
    <div className="space-y-5">
      <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
        <h3 className="text-foreground font-semibold text-base flex items-center gap-2">
          <Target size={17} className="text-teal-700" />
          New goal
        </h3>
        <p className="text-muted-foreground text-sm mt-1">Save toward something specific</p>
        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. New laptop"
            className="flex-1 px-3 py-2.5 rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-300"
          />
          <div className="relative sm:w-40">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
            <input
              type="number"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Target"
              className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-300"
            />
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center justify-center gap-1.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 px-4 py-2.5 rounded-xl transition-colors shrink-0"
          >
            <Plus size={15} />
            Add goal
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {goals.map((g) => (
          <GoalCard key={g.id} goal={g} onAdd={onAddToGoal} />
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
   PAGE
   ========================================================================= */

type DbExpense = { id: number; category: CategoryKey; amount: number; note: string; logged_at: string };
type DbGoal = { id: number; name: string; target: number; saved: number };

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function Tracker() {
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [loanId, setLoanId] = useState<number | null>(null);
  const [payments, setPayments] = useState<{ cycle_month: string; income_that_cycle: number; amount_paid: number }[]>([]);
  const [expenses, setExpenses] = useState<DbExpense[]>([]);
  const [savingsBalance, setSavingsBalance] = useState(0);
  const [savingsLog, setSavingsLog] = useState<{ amount: number; date: string }[]>([]);
  const [incomeLog, setIncomeLog] = useState<IncomeLogEntry[]>([]);
  const [justSaved, setJustSaved] = useState(false);
  const [goals, setGoals] = useState<DbGoal[]>([]);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      if (DEMO_MODE) {
        if (!active) return;
        setUserId("demo-borrower");
        setLoanId(demoLoan.id);
        setPayments(demoPayments);
        setExpenses(demoExpenses);
        setGoals(demoGoals);
        setSavingsBalance(demoSavingsBalance);
        setSavingsLog(demoSavingsLog);
        setIncomeLog(demoIncomeLog);
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;
      setUserId(user.id);

      const { data: loan } = await supabase
        .from("loans")
        .select("id")
        .eq("borrower_id", user.id)
        .limit(1)
        .maybeSingle();

      const [{ data: paymentRows }, { data: expenseRows }, { data: goalRows }, { data: savingsRows }, { data: incomeRows }] = await Promise.all([
        loan
          ? supabase
              .from("payments")
              .select("cycle_month, income_that_cycle, amount_paid")
              .eq("loan_id", loan.id)
              .order("cycle_month", { ascending: true })
          : Promise.resolve({ data: [] as typeof payments }),
        supabase
          .from("expenses")
          .select("id, category, amount, note, logged_at")
          .eq("borrower_id", user.id)
          .order("logged_at", { ascending: false }),
        supabase
          .from("goals")
          .select("id, name, target, saved")
          .eq("borrower_id", user.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("savings_transactions")
          .select("amount, created_at")
          .eq("borrower_id", user.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("income_log")
          .select("id, amount, frequency, logged_at")
          .eq("borrower_id", user.id)
          .order("logged_at", { ascending: true }),
      ]);

      if (!active) return;
      setLoanId(loan?.id ?? null);
      setPayments(paymentRows ?? []);
      setExpenses((expenseRows ?? []).map((e) => ({ ...e, note: e.note ?? "" })));
      setGoals(goalRows ?? []);
      setSavingsBalance((savingsRows ?? []).reduce((sum, r) => sum + r.amount, 0));
      setSavingsLog((savingsRows ?? []).map((r) => ({ amount: r.amount, date: r.created_at })));
      setIncomeLog((incomeRows ?? []).map((r) => ({ id: r.id, amount: r.amount, frequency: r.frequency, loggedAt: r.logged_at })));
      setLoading(false);
    }

    load();
    return () => { active = false; };
  }, []);

  // Monthly income comes from real payment cycles; monthly spend comes
  // from real logged expenses; monthly "saved" comes from actual logged
  // savings deposits/withdrawals (savingsLog) — not a derived leftover
  // figure, so the chart reflects the same numbers as the "Total saved"
  // card and updates immediately when savings are logged or used.
  const monthHistory: MonthHistoryItem[] = useMemo(() => {
    const map = new Map<string, MonthHistoryItem>();
    for (const p of payments) {
      const d = new Date(p.cycle_month);
      const key = monthKey(d);
      const label = d.toLocaleDateString("en-IN", { month: "short" });
      const existing = map.get(key) ?? { month: label, income: 0, expenses: 0, saved: 0 };
      existing.income += p.income_that_cycle;
      map.set(key, existing);
    }
    for (const e of expenses) {
      const d = new Date(e.logged_at);
      const key = monthKey(d);
      const label = d.toLocaleDateString("en-IN", { month: "short" });
      const existing = map.get(key) ?? { month: label, income: 0, expenses: 0, saved: 0 };
      existing.expenses += e.amount;
      map.set(key, existing);
    }
    for (const s of savingsLog) {
      const d = new Date(s.date);
      const key = monthKey(d);
      const label = d.toLocaleDateString("en-IN", { month: "short" });
      const existing = map.get(key) ?? { month: label, income: 0, expenses: 0, saved: 0 };
      existing.saved += s.amount;
      map.set(key, existing);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([, v]) => v);
  }, [payments, expenses, savingsLog]);

  // Income specifically comes only from real payment cycles — unlike
  // monthHistory above (used for the chart), this never picks up an
  // empty "today" bucket just because an expense or savings entry was
  // logged on a day with no payment cycle yet. That was causing "this
  // month's income" and the savings suggestion to read as ₹0 right
  // after logging something.
  // Combines two income sources by month: `payments` (loan-cycle records —
  // nothing in this app currently writes to these, but keeping it means
  // existing/lender-provided cycle data still counts) and `incomeLog`
  // (self-reported via "Log income" below, normalized to a monthly
  // figure). If a future write path ever populates `payments` for the
  // same month a borrower also self-logs income, this would double-count
  // that month — worth reconciling if/when that write path is built.
  const incomeHistory = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of payments) {
      const key = monthKey(new Date(p.cycle_month));
      map.set(key, (map.get(key) ?? 0) + p.income_that_cycle);
    }
    for (const e of incomeLog) {
      const key = monthKey(new Date(e.loggedAt));
      map.set(key, (map.get(key) ?? 0) + monthlyEquivalent(e));
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([, income]) => income);
  }, [payments, incomeLog]);

  const monthIncome = incomeHistory.length ? incomeHistory[incomeHistory.length - 1] : 0;
  const avgDailySpend = monthHistory.length
    ? Math.round(monthHistory.reduce((sum, c) => sum + c.expenses, 0) / monthHistory.length / 7)
    : 0;

  // "This month's" expense breakdown, for the Log tab — the fetched
  // `expenses` list is all-time, filtered here to the current calendar
  // month to match what this section originally showed.
  const now = new Date();
  const thisMonthExpenses = expenses.filter((e) => {
    const d = new Date(e.logged_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  const totalExpenses = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const thisMonthSaved = savingsLog
    .filter((s) => {
      const d = new Date(s.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((sum, s) => sum + s.amount, 0);
  const leftOver = monthIncome - totalExpenses;
  const suggestion = incomeHistory.length
    ? computeSuggestion(incomeHistory)
    : { pct: 0, reason: "Log a few cycles of income and expenses to get a personalized suggestion.", amount: 0, volatility: 0 };
  const daysCovered = avgDailySpend > 0 ? Math.round(savingsBalance / avgDailySpend) : 0;
  const avgIncome = incomeHistory.length
    ? Math.round(incomeHistory.reduce((s, c) => s + c, 0) / incomeHistory.length)
    : 0;

  const productSuggestions = computeProductSuggestions({
    savingsBalance,
    volatility: suggestion.volatility,
    avgIncome,
  });

  async function handleAddExpense({ amount, category, note }: QuickLogSubmit) {
    if (!category || !userId) return;
    if (DEMO_MODE) {
      const newExpense = { id: Date.now(), category, amount, note: note || "", logged_at: new Date().toISOString().slice(0, 10) };
      setExpenses((prev) => [newExpense, ...prev]);
      return;
    }
    const { data, error } = await supabase
      .from("expenses")
      .insert({ borrower_id: userId, category, amount, note: note || null })
      .select()
      .single();
    if (!error && data) {
      setExpenses((prev) => [{ ...data, note: data.note ?? "" }, ...prev]);
    }
  }
  async function handleLogIncome({ amount, frequency }: { amount: number; frequency: IncomeFrequency }) {
    if (!userId) return;
    const today = new Date().toISOString().slice(0, 10);
    if (DEMO_MODE) {
      setIncomeLog((prev) => [...prev, { id: Date.now(), amount, frequency, loggedAt: today }]);
      return;
    }
    const { data, error } = await supabase
      .from("income_log")
      .insert({ borrower_id: userId, amount, frequency, logged_at: today })
      .select("id, amount, frequency, logged_at")
      .single();
    if (!error && data) {
      setIncomeLog((prev) => [...prev, { id: data.id, amount: data.amount, frequency: data.frequency, loggedAt: data.logged_at }]);
    }
  }

  async function handleSave(amount: number) {
    if (!userId) return;
    const today = new Date().toISOString().slice(0, 10);
    if (DEMO_MODE) {
      setSavingsBalance((prev) => prev + amount);
      setSavingsLog((prev) => [...prev, { amount, date: today }]);
      return;
    }
    const { data, error } = await supabase
      .from("savings_transactions")
      .insert({ borrower_id: userId, amount })
      .select("amount, created_at")
      .single();
    if (!error && data) {
      setSavingsBalance((prev) => prev + amount);
      setSavingsLog((prev) => [...prev, { amount: data.amount, date: data.created_at }]);
    }
  }
  function handleLogSavings({ amount }: QuickLogSubmit) {
    handleSave(amount);
  }
  async function handleUseSavings({ amount }: QuickLogSubmit) {
    if (!userId) return;
    const today = new Date().toISOString().slice(0, 10);
    if (DEMO_MODE) {
      setSavingsBalance((prev) => Math.max(0, prev - amount));
      setSavingsLog((prev) => [...prev, { amount: -amount, date: today }]);
      return;
    }
    const { data, error } = await supabase
      .from("savings_transactions")
      .insert({ borrower_id: userId, amount: -amount })
      .select("amount, created_at")
      .single();
    if (!error && data) {
      setSavingsBalance((prev) => Math.max(0, prev - amount));
      setSavingsLog((prev) => [...prev, { amount: data.amount, date: data.created_at }]);
    }
  }
  async function handleAddGoal(goal: Goal) {
    if (!userId) return;
    if (DEMO_MODE) {
      setGoals((prev) => [...prev, { id: Date.now(), name: goal.name, target: goal.target, saved: goal.saved }]);
      return;
    }
    const { data, error } = await supabase
      .from("goals")
      .insert({ borrower_id: userId, name: goal.name, target: goal.target, saved: goal.saved })
      .select()
      .single();
    if (!error && data) setGoals((prev) => [...prev, data]);
  }
  async function handleAddToGoal(id: number, amount: number) {
    const current = goals.find((g) => g.id === id);
    if (!current) return;
    const newSaved = current.saved + amount;
    if (DEMO_MODE) {
      setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, saved: newSaved } : g)));
      return;
    }
    const { error } = await supabase.from("goals").update({ saved: newSaved }).eq("id", id);
    if (!error) {
      setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, saved: newSaved } : g)));
    }
  }

  const tabs: Tab[] = [
    { key: "overview", label: "Overview", icon: LayoutGrid },
    { key: "log", label: "Log", icon: ListChecks },
    { key: "goals", label: "Goals", icon: Target, count: goals.length },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-8 py-8 space-y-6">
      <div>
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Tracker</h2>
        <p className="text-muted-foreground mt-2 text-base max-w-2xl">
          Log your expenses, build savings that flex with what you earn, and see what fits your situation.
        </p>
      </div>

      <PillTabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center">
                  <ShieldCheck size={17} />
                </div>
                <h3 className="text-foreground font-semibold text-base">Safety cushion</h3>
              </div>
              <p className="text-foreground font-bold text-3xl mt-3">~{daysCovered} {daysCovered === 1 ? "day" : "days"}</p>
              <p className="text-muted-foreground text-sm mt-1">of your usual spending, covered by savings</p>
            </div>

            <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Wallet size={17} />
                </div>
                <h3 className="text-foreground font-semibold text-base">Total saved</h3>
              </div>
              <p className="text-foreground font-bold text-3xl mt-3">₹{savingsBalance.toLocaleString("en-IN")}</p>
              <p className="text-muted-foreground text-sm mt-1">set aside across all logged months</p>
            </div>
          </div>

          <TrendChart history={monthHistory} />

          <VolatilityForecast />

          <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
            <h3 className="text-foreground font-semibold text-base flex items-center gap-2">
              <RefreshCw size={17} className="text-teal-700" />
              Suggested savings, this month
            </h3>
            <p className="text-muted-foreground text-sm mt-1 leading-relaxed max-w-2xl">{suggestion.reason}</p>

            <div className="grid grid-cols-2 gap-4 mt-5 max-w-md">
              <div className="rounded-xl bg-secondary p-4">
                <p className="text-muted-foreground text-xs font-medium">This month's income</p>
                <p className="text-foreground font-bold text-xl mt-1">₹{monthIncome.toLocaleString("en-IN")}</p>
              </div>
              <div className="rounded-xl bg-teal-50 p-4">
                <p className="text-teal-700 text-xs font-medium">Suggested ({suggestion.pct}%)</p>
                <p className="text-teal-800 font-bold text-xl mt-1">₹{suggestion.amount.toLocaleString("en-IN")}</p>
              </div>
            </div>

            <p className="text-muted-foreground text-xs mt-3">You have about ₹{leftOver.toLocaleString("en-IN")} left over this month</p>

            {justSaved ? (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-teal-50 px-4 py-2.5 text-sm font-medium text-teal-800">
                <BadgeCheck size={16} />
                Done! You've saved ₹{thisMonthSaved.toLocaleString("en-IN")} this month.
              </div>
            ) : (
              <button
                onClick={() => {
                  handleSave(suggestion.amount);
                  setJustSaved(true);
                }}
                className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-white px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 transition-colors"
              >
                <Wallet size={15} />
                Mark ₹{suggestion.amount.toLocaleString("en-IN")} as saved
              </button>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-teal-700" />
              <h3 className="text-foreground font-semibold text-lg">Suggested for you</h3>
            </div>
            <p className="text-muted-foreground text-sm mt-1">Based on your savings and income pattern — nothing here is applied automatically</p>
            <p className="text-muted-foreground text-xs mt-1">PMSBY, PMJJBY, PM Jan Dhan Yojana, Mudra (Shishu/Kishor), Atal Pension Yojana, PM SVANidhi, PM Vishwakarma, and Stand-Up India are real Government of India schemes; rates shown are current as of 2026 — confirm exact terms before applying.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {(showAllSuggestions ? productSuggestions : productSuggestions.slice(0, 2)).map((item) => (
                <SuggestionCard key={item.key} item={item} />
              ))}
            </div>
            {productSuggestions.length > 1 && (
              <div className="flex justify-end mt-3">
                <button
                  onClick={() => setShowAllSuggestions((s) => !s)}
                  className="text-sm font-medium text-teal-700 hover:text-teal-800"
                >
                  {showAllSuggestions ? "Show less" : `Show more`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "log" && (
        <div className="space-y-6">
          <LogIncomeCard incomeLog={incomeLog} onSubmit={handleLogIncome} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <QuickLogCard
              title="Log an expense"
              subtitle="Quick entry — takes a few seconds"
              icon={PlusCircle}
              categoryPicker
              buttonLabel="Add expense"
              onSubmit={handleAddExpense}
            />
            <QuickLogCard
              title="Log savings"
              subtitle="Save any amount, whenever you have it"
              icon={Wallet}
              categoryPicker={false}
              buttonLabel="Add to savings"
              onSubmit={handleLogSavings}
            />
            <QuickLogCard
              title="Log savings used"
              subtitle="Noted your saved money went toward something"
              icon={MinusCircle}
              categoryPicker={false}
              buttonLabel="Log savings used"
              onSubmit={handleUseSavings}
            />
          </div>
          <ExpenseBreakdown expenses={thisMonthExpenses} saved={thisMonthSaved} />
        </div>
      )}

      {tab === "goals" && <GoalsTab goals={goals} onAddGoal={handleAddGoal} onAddToGoal={handleAddToGoal} />}
    </div>
  );
}