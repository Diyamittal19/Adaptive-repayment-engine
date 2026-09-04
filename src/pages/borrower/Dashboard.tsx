import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import {
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  CalendarDays,
  ChevronDown,
  History,
  IndianRupee,
  TrendingUp,
  X,
  ArrowRight,
} from "lucide-react";
import type { ReactNode } from "react";
import CreditPassportCard from "@/components/passport/CreditPassportCard";
import { supabase } from "@/lib/supabaseClient";
import { DEMO_MODE, demoLoan, demoLenderName, demoPayments, demoPendingHardship } from "@/lib/demoData";

// ─── Shared primitives (Card, StatCard, IncomeChart, StatusBar) ───────────

export const inr = (n: number) => `\u20B9${n.toLocaleString("en-IN")}`;

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card shadow-card ${className}`}>
      {children}
    </div>
  );
}

type Tone = "success" | "warning" | "danger" | "info";

const edge: Record<Tone, string> = {
  success: "border-l-success",
  warning: "border-l-warning",
  danger: "border-l-danger",
  info: "border-l-info",
};
const chip: Record<Tone, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  info: "bg-info/10 text-info",
};
const bubble: Record<Tone, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  info: "bg-info/10 text-info",
};

function StatCard({
  tone,
  label,
  icon,
  value,
  chipText,
  chipTone,
  chipDir,
  note,
}: {
  tone: Tone;
  label: string;
  icon: ReactNode;
  value: string;
  chipText?: string;
  chipTone?: Tone;
  chipDir?: "up" | "down";
  note: string;
}) {
  return (
    <Card className={`border-l-4 p-5 ${edge[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${bubble[tone]}`}>
          {icon}
        </span>
      </div>
      <p className="mt-3 font-mono text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
        {chipText && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${chip[chipTone ?? tone]}`}>
            {chipDir === "down" ? <ArrowDownRight className="size-3" /> : <ArrowUpRight className="size-3" />}
            {chipText}
          </span>
        )}
        <span className="text-muted-foreground">{note}</span>
      </div>
    </Card>
  );
}

type ChartPoint = { month: string; income: number; expenses: number };

function IncomeChart({ data }: { data: ChartPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={64}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            tickFormatter={(v: number) => inr(v)}
          />
          <Tooltip
            formatter={(value, name) => [inr(Number(value)), String(name)]}
            contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12, fontFamily: "var(--font-sans)" }}
          />
          <Line type="monotone" dataKey="income" name="Income" stroke="var(--success)" strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="expenses" name="Loan payments" stroke="var(--danger)" strokeWidth={2.5} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatusBar({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  const fill = { success: "bg-success", warning: "bg-warning", danger: "bg-danger", info: "bg-info" }[tone];
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span className="font-mono text-muted-foreground">{value}%</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

// ─── Page content ───────────────────────────────────────────────────────────

// ─── Page content ───────────────────────────────────────────────────────────

type Loan = {
  id: number;
  target_amount: number;
  floor: number;
  ceiling: number;
  due_date: string;
  status: string;
  outstanding: number;
  lender_id: string;
};

type Payment = {
  cycle_month: string;
  amount_due: number;
  amount_paid: number;
  paid_on_time: boolean;
  income_that_cycle: number;
};

export default function Dashboard({ onNavigateToRequests }: { onNavigateToRequests?: () => void }) {
  const [showAlert, setShowAlert] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [lenderName, setLenderName] = useState<string>("");
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      if (DEMO_MODE) {
        if (!active) return;
        setLoan(demoLoan);
        setLenderName(demoLenderName);
        setPayments(demoPayments);
        setShowAlert(demoPendingHardship);
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;

      // A borrower persona in this app currently has one active loan —
      // if that changes later (multiple loans per borrower), this needs
      // a loan switcher rather than always taking the earliest due one.
      const { data: loanRow } = await supabase
        .from("loans")
        .select("id, target_amount, floor, ceiling, due_date, status, outstanding, lender_id")
        .eq("borrower_id", user.id)
        .order("due_date", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!active) return;

      if (!loanRow) {
        setLoading(false);
        return;
      }
      setLoan(loanRow);

      const [{ data: lenderProfile }, { data: paymentRows }, { data: pendingRequest }] = await Promise.all([
        supabase.from("profiles").select("name").eq("id", loanRow.lender_id).maybeSingle(),
        supabase
          .from("payments")
          .select("cycle_month, amount_due, amount_paid, paid_on_time, income_that_cycle")
          .eq("loan_id", loanRow.id)
          .order("cycle_month", { ascending: true }),
        supabase
          .from("requests")
          .select("id")
          .eq("loan_id", loanRow.id)
          .eq("type", "hardship")
          .eq("status", "pending")
          .maybeSingle(),
      ]);

      if (!active) return;
      setLenderName(lenderProfile?.name ?? "your lender");
      setPayments(paymentRows ?? []);
      setShowAlert(!!pendingRequest);
      setLoading(false);
    }

    load();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="flex h-64 items-center justify-center px-6 text-center">
        <p className="text-sm text-muted-foreground">
          No active loan found yet. Once a lender sets one up for you, it'll show up here.
        </p>
      </div>
    );
  }

  const latestPayment = payments[payments.length - 1];
  const previousPayment = payments[payments.length - 2];
  const thisMonthsPayment = latestPayment?.amount_due ?? loan.target_amount;
  const carriedForwardDelta = previousPayment
    ? loan.outstanding - previousPayment.amount_due + previousPayment.amount_paid
    : 0;

  const onTimeCount = payments.filter((p) => p.paid_on_time).length;
  const onTimePct = payments.length ? Math.round((onTimeCount / payments.length) * 100) : 0;
  const lowestCount = payments.filter((p) => p.amount_paid <= loan.floor).length;
  const lowestPct = payments.length ? Math.round((lowestCount / payments.length) * 100) : 0;
  const extraHelpCount = payments.filter((p) => !p.paid_on_time).length;
  const extraHelpPct = payments.length ? Math.round((extraHelpCount / payments.length) * 100) : 0;

  const chartData: ChartPoint[] = payments.map((p) => ({
    month: new Date(p.cycle_month).toLocaleDateString("en-IN", { month: "short" }),
    income: p.income_that_cycle,
    expenses: p.amount_paid,
  }));

  const dueDateLabel = new Date(loan.due_date).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const daysUntilDue = Math.ceil(
    (new Date(loan.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );


  return (
    <div className="px-5 py-6 md:px-8 md:py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-[28px]">
            Your repayment, at a glance
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Here's how this month is tracking and what's coming up next.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-full bg-navy px-4 py-2 text-sm font-medium text-navy-foreground transition-colors hover:opacity-90">
          <CalendarDays className="size-4" />
          {new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
          <ChevronDown className="size-4 opacity-70" />
        </button>
      </header>

      <section className="mt-6">
        <CreditPassportCard />
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          tone="success"
          label="This month's payment"
          icon={<IndianRupee className="size-4" />}
          value={inr(thisMonthsPayment)}
          chipText={latestPayment?.paid_on_time ? "On track" : undefined}
          note="based on your income this cycle"
        />
        <StatCard
          tone="warning"
          label="Carried forward"
          icon={<History className="size-4" />}
          value={inr(loan.outstanding)}
          chipText={carriedForwardDelta !== 0 ? `${carriedForwardDelta > 0 ? "+" : ""}${inr(carriedForwardDelta)}` : undefined}
          note="vs last cycle"
        />
        <StatCard
          tone="info"
          label="Next payment due"
          icon={<CalendarDays className="size-4" />}
          value={dueDateLabel}
          note={`${daysUntilDue >= 0 ? `in ${daysUntilDue} days` : "overdue"} \u00B7 ${lenderName}`}
        />
        <StatCard
          tone="success"
          label="On-time streak"
          icon={<TrendingUp className="size-4" />}
          value={`${onTimePct}%`}
          note="of cycles paid on time"
        />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="text-base font-semibold text-foreground">Income vs. loan payments</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your earnings against what you've actually paid each cycle \u2014 hover a point for details.
          </p>
          <div className="mt-4">
            <IncomeChart data={chartData} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <span className="size-2 rounded-full bg-success" /> Income
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="size-2 rounded-full bg-danger" /> Loan payments
            </span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            This helps us keep your payment plan realistic for what's actually coming in and going out.
          </p>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold text-foreground">This cycle's status</h2>
          <p className="mt-1 text-sm text-muted-foreground">Where you landed this month.</p>
          <div className="mt-6 flex flex-col gap-5">
            <StatusBar label="Paid on time" value={onTimePct} tone="success" />
            <StatusBar label="Paid lowest amount" value={lowestPct} tone="warning" />
            <StatusBar label="Needed extra help" value={extraHelpPct} tone="danger" />
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            {payments.length > 0
              ? `On track for ${onTimeCount} of the last ${payments.length} cycles.`
              : "No payment history yet \u2014 this fills in after your first cycle."}
          </p>
        </Card>
      </section>

      {showAlert && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3.5">
          <Bell className="size-4 shrink-0 text-danger" />
          <p className="text-sm font-medium text-danger">Your request for extra help is being reviewed</p>
          <div className="ml-auto flex items-center gap-3">
            <button onClick={onNavigateToRequests} className="inline-flex items-center gap-1 text-sm font-medium text-danger hover:underline">
              Check status <ArrowRight className="size-3.5" />
            </button>
            <button
              onClick={() => setShowAlert(false)}
              aria-label="Dismiss"
              className="text-danger/70 transition-colors hover:text-danger"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      <Card className="mt-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Upcoming loan payment</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              What's due next, so nothing catches you off guard.
            </p>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                {["Lender", "Due date", "Amount", "Status", ""].map((h) => (
                  <th key={h} className="pb-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border last:border-0">
                <td className="py-4 text-sm font-medium text-foreground">{lenderName}</td>
                <td className="py-4 text-sm text-foreground">
                  {dueDateLabel}
                  <span className="block text-xs text-muted-foreground">
                    {daysUntilDue >= 0 ? `in ${daysUntilDue} days` : "overdue"}
                  </span>
                </td>
                <td className="py-4 font-mono text-sm text-foreground">{inr(thisMonthsPayment)}</td>
                <td className="py-4">
                  <span className="inline-flex rounded-full bg-info/10 px-2.5 py-1 text-xs font-medium text-info">
                    Upcoming
                  </span>
                </td>
                <td className="py-4 text-right">
                  <button className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted">
                    View
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}