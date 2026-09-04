import { useState } from "react";
import { ChevronDown, CreditCard, Lightbulb, ShieldCheck } from "lucide-react";
import ScoreGauge from "./ScoreGauge";
import { getMyCreditPassport, bandTone } from "@/lib/creditPassport";

const bandCopy: Record<string, string> = {
  Excellent: "Lenders can rely on this score as strong proof of your repayment behaviour.",
  Good: "A solid score — you can share this with lenders as proof of your reliability.",
  Fair: "A workable score that's actively improving as you build more history.",
  Building: "Early days — every on-time payment from here moves this up.",
};

export default function CreditPassportCard() {
  const passport = getMyCreditPassport();
  const tone = bandTone(passport.band);
  const [expanded, setExpanded] = useState(false);

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
