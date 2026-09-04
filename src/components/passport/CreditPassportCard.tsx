import { useState, useEffect, useMemo } from "react";
import { ChevronDown, CreditCard, Lightbulb, ShieldCheck } from "lucide-react";
import ScoreGauge from "./ScoreGauge";
import { getMyCreditPassport, bandTone, type CreditPassport } from "@/lib/creditPassport";
import { supabase } from "@/lib/supabaseClient";
import { DEMO_MODE, demoPayments, demoIncomeLog, demoMyRequests } from "@/lib/demoData";

const bandCopy: Record<string, string> = {
  Excellent: "Lenders can rely on this score as strong proof of your repayment behaviour.",
  Good: "A solid score — you can share this with lenders as proof of your reliability.",
  Fair: "A workable score that's actively improving as you build more history.",
  Building: "Early days — every on-time payment from here moves this up.",
};

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type IncomeSourceEntry = { monthK: string; income: number };
type HardshipEntry = { monthK: string };

// Computes the real inputs scoreIncomeConsistency() needs (see
// creditPassport.ts) from actual payment cycles, self-logged income, and
// hardship request dates — the same "months since first activity" and
// "reported income vs. hardship timing" signals described there.
function buildIncomeConsistencyInput(income: IncomeSourceEntry[], hardship: HardshipEntry[]) {
  if (income.length === 0) {
    return { monthsLogged: 0, monthsExpected: 0, hardshipRequestMonthIncomes: [], avgIncome: 0 };
  }

  const byMonth = new Map<string, number>();
  for (const e of income) byMonth.set(e.monthK, (byMonth.get(e.monthK) ?? 0) + e.income);

  const months = Array.from(byMonth.keys()).sort();
  const earliest = months[0];
  const [ey, em] = earliest.split("-").map(Number);
  const now = new Date();
  const monthsExpected = (now.getFullYear() - ey) * 12 + (now.getMonth() + 1 - em) + 1;

  const avgIncome = Array.from(byMonth.values()).reduce((s, v) => s + v, 0) / byMonth.size;

  const hardshipRequestMonthIncomes = hardship
    .map((h) => byMonth.get(h.monthK))
    .filter((v): v is number => v !== undefined);

  return { monthsLogged: byMonth.size, monthsExpected, hardshipRequestMonthIncomes, avgIncome };
}

export default function CreditPassportCard() {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [income, setIncome] = useState<IncomeSourceEntry[]>([]);
  const [hardship, setHardship] = useState<HardshipEntry[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      if (DEMO_MODE) {
        if (!active) return;
        const incomeEntries: IncomeSourceEntry[] = [
          ...demoPayments.map((p) => ({ monthK: monthKey(new Date(p.cycle_month)), income: p.income_that_cycle })),
          ...demoIncomeLog.map((e) => ({
            monthK: monthKey(new Date(e.loggedAt)),
            income: e.frequency === "daily" ? Math.round(e.amount * 30) : e.frequency === "weekly" ? Math.round(e.amount * 4.33) : e.amount,
          })),
        ];
        const hardshipEntries: HardshipEntry[] = demoMyRequests
          .filter((r) => r.kind === "hardship")
          .map((r) => ({ monthK: monthKey(new Date(r.sentOnDate)) }));
        setIncome(incomeEntries);
        setHardship(hardshipEntries);
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;

      const { data: loanRows } = await supabase.from("loans").select("id").eq("borrower_id", user.id);
      const loanIds = (loanRows ?? []).map((l) => l.id);

      const [{ data: paymentRows }, { data: incomeRows }, { data: hardshipRows }] = await Promise.all([
        loanIds.length
          ? supabase.from("payments").select("cycle_month, income_that_cycle").in("loan_id", loanIds)
          : Promise.resolve({ data: [] as { cycle_month: string; income_that_cycle: number }[] }),
        supabase.from("income_log").select("amount, frequency, logged_at").eq("borrower_id", user.id),
        loanIds.length
          ? supabase.from("requests").select("created_at").eq("type", "hardship").in("loan_id", loanIds)
          : Promise.resolve({ data: [] as { created_at: string }[] }),
      ]);

      if (!active) return;

      const incomeEntries: IncomeSourceEntry[] = [
        ...(paymentRows ?? []).map((p) => ({ monthK: monthKey(new Date(p.cycle_month)), income: p.income_that_cycle })),
        ...(incomeRows ?? []).map((e) => ({
          monthK: monthKey(new Date(e.logged_at)),
          income: e.frequency === "daily" ? Math.round(e.amount * 30) : e.frequency === "weekly" ? Math.round(e.amount * 4.33) : e.amount,
        })),
      ];
      const hardshipEntries: HardshipEntry[] = (hardshipRows ?? []).map((r) => ({ monthK: monthKey(new Date(r.created_at)) }));

      setIncome(incomeEntries);
      setHardship(hardshipEntries);
      setLoading(false);
    }

    load();
    return () => { active = false; };
  }, []);

  const passport: CreditPassport | null = useMemo(() => {
    if (loading) return null;
    return getMyCreditPassport(buildIncomeConsistencyInput(income, hardship));
  }, [loading, income, hardship]);

  if (loading || !passport) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-card p-5">
        <p className="text-sm text-muted-foreground">Loading your credit passport…</p>
      </div>
    );
  }

  const tone = bandTone(passport.band);

  return (
    <div className="rounded-xl border border-border bg-card shadow-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <ScoreGauge score={passport.overallScore} tone={tone} label={passport.band} />
          <div>
            <div className="flex items-center gap-2">
              <CreditCard className="size-4 text-muted-foreground" />
              <h2 className="text-base font-semibold text-foreground">Your Credit Passport</h2>
            </div>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">{passport.summary}</p>
            <p className="mt-2 text-xs font-medium text-muted-foreground">{bandCopy[passport.band]}</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-info/10 px-2.5 py-1 text-xs font-medium text-info">
            <ShieldCheck className="size-3.5" />
            Shown to lenders when you request a loan
          </span>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="inline-flex items-center gap-1 text-sm font-medium text-info hover:underline"
          >
            {expanded ? "Hide breakdown" : "See full breakdown"}
            <ChevronDown className={`size-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 border-t border-border pt-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Loans completed</p>
          <p className="mt-0.5 font-mono font-semibold text-foreground">{passport.loansCompleted}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Active loans</p>
          <p className="mt-0.5 font-mono font-semibold text-foreground">{passport.activeLoans}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Member since</p>
          <p className="mt-0.5 font-mono font-semibold text-foreground">{passport.memberSince}</p>
        </div>
      </div>

      {expanded && (
        <div className="mt-5 space-y-4 border-t border-border pt-5">
          {passport.factors.map((f) => (
            <div key={f.key}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{f.label}</span>
                <span className="font-mono text-xs text-muted-foreground">{f.score}/100</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${f.score}%`, backgroundColor: `var(--${bandTone(f.score >= 65 ? "Good" : f.score >= 45 ? "Fair" : "Building")})` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{f.detail}</p>
              <p className="mt-1 flex items-start gap-1.5 text-xs font-medium text-foreground">
                <Lightbulb className="mt-0.5 size-3 shrink-0 text-warning" />
                {f.tip}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}