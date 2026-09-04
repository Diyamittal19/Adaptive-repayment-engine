import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Search, SlidersHorizontal, TriangleAlert } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  BORROWERS,
  PORTFOLIO,
  inr,
  simulateIndividual,
  simulatePortfolio,
  type Borrower,
  type Severity,
} from "@/lib/simulator";

type Mode = "portfolio" | "individual";

type Preset = {
  id: string;
  category: string;
  label: string;
  floor?: number;
  ceiling?: number;
  shock?: number | "toIncome12k" | 100;
  share?: number;
  note?: string;
};

const PORTFOLIO_PRESETS: Preset[] = [
  {
    id: "p1",
    category: "Policy change",
    label: "What if I raise every floor by ₹500?",
    floor: 2500,
    ceiling: 7000,
    shock: 0,
    share: 100,
  },
  {
    id: "p2",
    category: "Policy change",
    label: "What if I lower the ceiling to ₹6,000?",
    floor: 2000,
    ceiling: 6000,
    shock: 0,
    share: 100,
  },
  {
    id: "p3",
    category: "Portfolio stress",
    label: "What if 20% of borrowers see a 30% income drop?",
    floor: 2000,
    ceiling: 7000,
    shock: 30,
    share: 20,
  },
  {
    id: "p4",
    category: "Portfolio stress",
    label: "What if hardship requests double this quarter?",
    floor: 2000,
    ceiling: 7000,
    shock: 45,
    share: 12,
  },
  {
    id: "p5",
    category: "Growth scenario",
    label: "What if I onboard 100 gig-worker borrowers?",
    floor: 1800,
    ceiling: 6500,
    shock: 15,
    share: 8,
  },
];

const INDIVIDUAL_PRESETS: Preset[] = [
  {
    id: "i1",
    category: "Income scenarios",
    label: "What if {name}'s income falls to ₹12,000 next cycle?",
    shock: "toIncome12k",
  },
  {
    id: "i2",
    category: "Income scenarios",
    label: "What if {name}'s income drops to zero for one cycle?",
    shock: 100,
  },
  {
    id: "i3",
    category: "Policy on this loan",
    label: "What if I raise {name}'s floor to ₹2,500?",
    floor: 2500,
    shock: 20,
  },
  {
    id: "i4",
    category: "Policy on this loan",
    label: "What if I extend {name}'s catch-up window by 2 cycles?",
    shock: 20,
    note: "Catch-up window extended by 2 cycles — this spreads recovery of the deferred balance but does not change this cycle's payment math.",
  },
];

function groupByCategory(presets: Preset[]) {
  const out: { category: string; items: Preset[] }[] = [];
  for (const p of presets) {
    const g = out.find((o) => o.category === p.category);
    if (g) g.items.push(p);
    else out.push({ category: p.category, items: [p] });
  }
  return out;
}

const severityCopy: Record<Mode, Record<Severity, string>> = {
  individual: {
    good: "Within normal range — no exception needed.",
    warn: "Watch — payment is being held at the floor. Fine within guardrails, but flag if it repeats.",
    bad: "High risk — income is deeply below what this loan was underwritten for. Route to hardship review.",
  },
  portfolio: {
    good: "Within normal range — no exception needed.",
    warn: "Moderate impact — worth a policy note, not yet a red flag.",
    bad: "Material impact — recommend lender sign-off before applying.",
  },
};

const severityStyle: Record<Severity, string> = {
  good: "border-success/30 bg-success/10 text-success",
  warn: "border-warning/40 bg-gold-soft text-gold-foreground",
  bad: "border-danger/30 bg-danger/10 text-danger",
};

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/50 p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="num mt-2 text-xl font-semibold text-foreground">{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function SliderRow({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <span className="num text-sm font-semibold text-accent-foreground">{display}</span>
      </div>
      <Slider
        value={[Math.min(max, Math.max(min, value))]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0] ?? value)}
      />
    </div>
  );
}

function GuardrailRail({
  floor,
  ceiling,
  signal,
}: {
  floor: number;
  ceiling: number;
  signal: number;
}) {
  const SCALE = 12500;
  const pct = (v: number) => `${Math.min(100, Math.max(0, (v / SCALE) * 100))}%`;
  return (
    <div className="pt-2">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Guardrail rail
      </p>
      <div className="relative mt-7 h-9 w-full rounded-lg border border-border bg-secondary">
        <div
          className="absolute inset-y-0 bg-teal-soft"
          style={{ left: pct(floor), right: `calc(100% - ${pct(ceiling)})` }}
        />
        <div
          className="absolute inset-y-0 w-px bg-primary/60"
          style={{ left: pct(floor) }}
          aria-hidden
        />
        <div
          className="absolute inset-y-0 w-px bg-primary/60"
          style={{ left: pct(ceiling) }}
          aria-hidden
        />
        <div
          className="absolute -top-1.5 -bottom-1.5 w-[2px] rounded bg-navy"
          style={{ left: pct(signal) }}
        >
          <span className="num absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-navy px-1.5 py-0.5 text-[10px] font-medium text-navy-foreground">
            {inr(Math.round(signal))}
          </span>
        </div>
      </div>
      <div className="num mt-1.5 flex justify-between text-[10px] text-muted-foreground">
        <span>₹0</span>
        <span>{inr(SCALE)}+</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-danger" /> Below floor
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-primary" /> Allowed range
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[oklch(0.55_0.15_255)]" /> At/above ceiling
        </span>
      </div>
    </div>
  );
}

function BorrowerPicker({
  selected,
  onSelect,
}: {
  selected: Borrower;
  onSelect: (b: Borrower) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const results = BORROWERS.filter(
    (b) =>
      b.name.toLowerCase().includes(query.toLowerCase()) ||
      b.loanId.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="relative">
      <label className="mb-2 block text-sm font-medium text-foreground">Borrower</label>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring/40">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={`${selected.name} · ${selected.loanId}`}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {open && results.length > 0 ? (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg">
          {results.map((b) => (
            <li key={b.id}>
              <button
                onMouseDown={() => {
                  onSelect(b);
                  setQuery("");
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-secondary"
              >
                <span className="font-medium">{b.name}</span>
                <span className="num text-xs text-muted-foreground">
                  {b.loanId} · {inr(b.target)}/mo
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function WhatIf() {
  const [mode, setMode] = useState<Mode>("portfolio");
  const [borrower, setBorrower] = useState<Borrower>(BORROWERS[0]!);
  const [shock, setShock] = useState(0);
  const [floor, setFloor] = useState(2000);
  const [ceiling, setCeiling] = useState(7000);
  const [share, setShare] = useState(20);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [question, setQuestion] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [touched, setTouched] = useState(false);

  const presets = mode === "portfolio" ? PORTFOLIO_PRESETS : INDIVIDUAL_PRESETS;
  const groups = useMemo(() => groupByCategory(presets), [presets]);
  const label = (p: Preset) => p.label.replace("{name}", borrower.firstName);

  function switchMode(next: Mode) {
    setMode(next);
    setActiveChip(null);
    setQuestion(null);
    setNote(null);
    setTouched(false);
    setShock(0);
    if (next === "individual") {
      setFloor(borrower.floor);
      setCeiling(borrower.ceiling);
    } else {
      setFloor(2000);
      setCeiling(7000);
      setShare(20);
    }
  }

  function selectBorrower(b: Borrower) {
    setBorrower(b);
    setFloor(b.floor);
    setCeiling(b.ceiling);
    setActiveChip(null);
    setQuestion(null);
    setNote(null);
  }

  function applyPreset(p: Preset) {
    if (p.floor !== undefined) setFloor(p.floor);
    if (p.ceiling !== undefined) setCeiling(p.ceiling);
    if (p.share !== undefined) setShare(p.share);
    if (p.shock === "toIncome12k") {
      const raw = (1 - 12000 / borrower.baseIncome) * 100;
      setShock(Math.max(0, Math.min(90, Math.round(raw / 5) * 5)));
    } else if (typeof p.shock === "number") {
      setShock(p.shock);
    }
    setActiveChip(p.id);
    setQuestion(label(p));
    setNote(p.note ? p.note.replace("{name}", borrower.firstName) : null);
    setTouched(true);
  }

  function runCustom() {
    if (!draft.trim()) return;
    setQuestion(draft.trim());
    setActiveChip(null);
    setNote(null);
    setTouched(true);
  }

  const ind = simulateIndividual(borrower, shock, floor, ceiling);
  const port = simulatePortfolio(shock, floor, ceiling, share);
  const severity: Severity = mode === "individual" ? ind.severity : port.severity;
  const signal = mode === "individual" ? ind.capacity : port.capacity;

  const banner =
    mode === "portfolio" && severity === "bad"
      ? `Material impact — projected collection rate drops ${port.drop.toFixed(1)} pts. Recommend lender sign-off before applying.`
      : severityCopy[mode][severity];

  const history =
    borrower.floorHits >= 2 || borrower.hardshipRequests > 0
      ? `This isn't a first occurrence — ${borrower.firstName} has hit the floor ${borrower.floorHits} times and filed ${borrower.hardshipRequests} hardship request${borrower.hardshipRequests === 1 ? "" : "s"} in recent history.`
      : null;

  const narrative =
    mode === "individual"
      ? `With ${borrower.firstName}'s income at ${inr(Math.round(ind.income))} this cycle against a floor of ${inr(floor)}, the engine allows ${inr(ind.allowed)} of the ${inr(borrower.target)} target${ind.deferred > 0 ? ` and defers ${inr(ind.deferred)}` : " with nothing deferred"}. ${
          ind.belowFloor
            ? "Repayment capacity sits below the floor, so the payment is being held at the floor."
            : "Repayment capacity stays inside the guardrails."
        }`
      : `Applying this to ${port.affectedLoans.toLocaleString("en-IN")} of ${PORTFOLIO.activeLoans.toLocaleString("en-IN")} active loans, the projected collection rate moves to ${port.collectionRate.toFixed(1)}% (${port.drop.toFixed(1)} pts from ${PORTFOLIO.collectionRate}%) and adds ${inr(Math.round(port.newDeferred))} of new deferred balance this cycle.`;

  // Clear any previously-generated AI insight the moment the scenario
  // changes underneath it -- an insight explaining a stale scenario is
  // worse than no insight at all.
  useEffect(() => {
    setAiInsight(null);
    setAiError(null);
  }, [mode, shock, floor, ceiling, share, borrower.id]);

  async function getAiInsight() {
    setAiLoading(true);
    setAiError(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const res = await fetch(`${apiUrl}/api/whatif/insight`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode,
          inputs: mode === "individual"
            ? { borrower: borrower.name, shock, floor, ceiling }
            : { shock, floor, ceiling, share },
          result: mode === "individual" ? ind : port,
          // Full context so the AI isn't just reading bare scenario numbers:
          // the borrower's actual loan/repayment history for an individual
          // scenario, or portfolio-wide stats for a portfolio scenario.
          borrower: mode === "individual" ? borrower : undefined,
          lender: mode === "portfolio" ? PORTFOLIO : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setAiInsight(data.insight);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="min-w-0 bg-background">
      <main className="min-w-0 px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-foreground">
                What-If Simulator
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
                Model a decision before you make it
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Test guardrails, income shocks and individual loans in a sandbox — nothing here
                changes a real loan until it is explicitly applied.
              </p>
            </div>
            <div className="flex shrink-0 rounded-lg border border-border bg-card p-1 shadow-[var(--shadow-card)]">
              {(["portfolio", "individual"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={[
                    "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
                    mode === m
                      ? "bg-navy text-navy-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {m === "portfolio" ? "Portfolio" : "Individual borrower"}
                </button>
              ))}
            </div>
          </header>

          {/* Quick questions */}
          <section className="card-surface mt-7 p-5 sm:p-6">
            <div className="space-y-4">
              {groups.map((g) => (
                <div key={g.category} className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                  <p className="w-40 shrink-0 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {g.category}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {g.items.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => applyPreset(p)}
                        className={[
                          "rounded-full px-3.5 py-1.5 text-sm transition-colors",
                          activeChip === p.id
                            ? "bg-navy text-navy-foreground"
                            : "border border-border bg-card text-foreground hover:border-primary/50 hover:bg-accent",
                        ].join(" ")}
                      >
                        {label(p)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-2 border-t border-border pt-5 sm:flex-row">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runCustom()}
                placeholder="Type your own — e.g. 'What if I extend the catch-up window by 2 cycles?'"
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
              />
              <button
                onClick={runCustom}
                className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-navy-foreground transition-opacity hover:opacity-90"
              >
                Run scenario <ArrowRight className="size-4" />
              </button>
            </div>
          </section>

          {/* Console */}
          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Controls */}
            <div className="card-surface p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Guardrail controls</h2>
              </div>

              <div className="mt-5 space-y-5">
                {mode === "individual" ? (
                  <>
                    <BorrowerPicker selected={borrower} onSelect={selectBorrower} />
                    <div className="rounded-xl border border-border bg-secondary/60 p-3.5">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{borrower.name}</p>
                        <p className="num text-xs text-muted-foreground">{borrower.loanId}</p>
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Deferred balance{" "}
                        <span className="num font-medium text-foreground">
                          {inr(borrower.deferredBalance)}
                        </span>{" "}
                        · target{" "}
                        <span className="num font-medium text-foreground">
                          {inr(borrower.target)}
                        </span>
                        /mo
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Hit floor {borrower.floorHits} of last {borrower.floorHitWindow} cycles ·{" "}
                        {borrower.hardshipRequests} past hardship request
                        {borrower.hardshipRequests === 1 ? "" : "s"}
                      </p>
                    </div>
                  </>
                ) : null}

                <SliderRow
                  label="Income shock this cycle"
                  value={shock}
                  display={`−${shock}%`}
                  min={0}
                  max={90}
                  step={5}
                  onChange={(v) => {
                    setShock(v);
                    setTouched(true);
                    setActiveChip(null);
                  }}
                />
                <SliderRow
                  label="Floor payment"
                  value={floor}
                  display={inr(floor)}
                  min={500}
                  max={4000}
                  step={100}
                  onChange={(v) => {
                    setFloor(v);
                    setTouched(true);
                    setActiveChip(null);
                  }}
                />
                <SliderRow
                  label="Ceiling payment"
                  value={ceiling}
                  display={inr(ceiling)}
                  min={4000}
                  max={12000}
                  step={250}
                  onChange={(v) => {
                    setCeiling(v);
                    setTouched(true);
                    setActiveChip(null);
                  }}
                />
                {mode === "portfolio" ? (
                  <SliderRow
                    label="Share of portfolio affected"
                    value={share}
                    display={`${share}%`}
                    min={0}
                    max={100}
                    step={5}
                    onChange={(v) => {
                      setShare(v);
                      setTouched(true);
                      setActiveChip(null);
                    }}
                  />
                ) : null}

                <GuardrailRail floor={floor} ceiling={ceiling} signal={signal} />
              </div>
            </div>

            {/* Outcome */}
            <div className="card-surface flex flex-col p-5 sm:p-6">
              <h2 className="text-sm font-semibold text-foreground">Simulated outcome</h2>

              {!touched ? (
                <div className="flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
                  <span className="grid size-11 place-items-center rounded-full bg-accent">
                    <SlidersHorizontal className="size-5 text-accent-foreground" />
                  </span>
                  <p className="mt-4 max-w-xs text-sm text-muted-foreground">
                    Pick a question above, or move a slider — the outcome updates here in real time.
                    Nothing is written back to a live loan.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="rounded-xl bg-navy p-4">
                    {question ? (
                      <p className="border-l-2 border-gold pl-3 text-sm italic text-navy-foreground/80">
                        “{question}”
                      </p>
                    ) : null}
                    <p
                      className={`text-sm leading-relaxed text-navy-foreground ${question ? "mt-3" : ""}`}
                    >
                      {narrative}
                    </p>
                    {note ? <p className="mt-2 text-xs text-gold">{note}</p> : null}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {mode === "individual" ? (
                      <>
                        <Metric
                          label="Allowed payment"
                          value={inr(ind.allowed)}
                          sub={ind.belowFloor ? "Held at floor" : "Within guardrails"}
                        />
                        <Metric
                          label="Deferred this cycle"
                          value={inr(ind.deferred)}
                          sub={`of ${inr(borrower.target)} target`}
                        />
                        <Metric
                          label="Est. extra months"
                          value={`${ind.extraMonths}`}
                          sub="to clear deferred"
                        />
                        <Metric label="Income shock modeled" value={`−${shock}%`} sub="this cycle" />
                      </>
                    ) : (
                      <>
                        <Metric
                          label="Loans affected"
                          value={port.affectedLoans.toLocaleString("en-IN")}
                          sub={`of ${PORTFOLIO.activeLoans.toLocaleString("en-IN")} active`}
                        />
                        <Metric
                          label="Projected collection rate"
                          value={`${port.collectionRate.toFixed(1)}%`}
                          sub={`${port.drop.toFixed(1)} pts vs ${PORTFOLIO.collectionRate}%`}
                        />
                        <Metric
                          label="New deferred (this cycle)"
                          value={inr(Math.round(port.newDeferred))}
                          sub={`on ${inr(PORTFOLIO.totalDeferred)} outstanding`}
                        />
                        <Metric
                          label="Exception queue impact"
                          value={`+${port.exceptions.toLocaleString("en-IN")}`}
                          sub={port.belowFloor ? "higher flag rate — many at floor" : "normal flag rate"}
                        />
                      </>
                    )}
                  </div>

                  <div className={`rounded-xl border p-3.5 text-sm ${severityStyle[severity]}`}>
                    {banner}
                  </div>

                  {mode === "individual" && history ? (
                    <p className="flex items-start gap-2 text-xs text-muted-foreground">
                      <AlertTriangle className="mt-px size-3.5 shrink-0 text-warning" />
                      {history}
                    </p>
                  ) : null}

                  <div className="rounded-xl border border-border bg-card p-4">
                    {aiInsight ? (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-foreground">
                          AI insight
                        </p>
                        <p className="mt-1.5 text-sm leading-relaxed text-foreground">{aiInsight}</p>
                        <button
                          onClick={getAiInsight}
                          disabled={aiLoading}
                          className="mt-2 text-xs font-medium text-accent-foreground hover:underline disabled:opacity-50"
                        >
                          Regenerate
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={getAiInsight}
                        disabled={aiLoading}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-navy-foreground transition-colors hover:opacity-90 disabled:opacity-50"
                      >
                        {aiLoading ? "Thinking..." : "Get AI insight on this scenario"}
                      </button>
                    )}
                    {aiError ? (
                      <p className="mt-2 text-xs text-danger">{aiError}</p>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </section>

          <p className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
            <TriangleAlert className="mt-px size-3.5 shrink-0 text-warning" />
            Simulated figures only — no repayment rule, disbursal, or borrower record is changed
            until a scenario is explicitly applied from the lender dashboard.
          </p>
        </div>
      </main>
    </div>
  );
}
