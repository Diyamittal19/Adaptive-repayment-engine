import { X, ShieldCheck, ShieldQuestion, Users, CalendarClock } from "lucide-react";
import type { LenderTrustPassport } from "@/lib/creditPassport";

const barColor: Record<string, string> = {
  Excellent: "#2f9e6e",
  Good: "#2f6fed",
  Fair: "#dfa23a",
  Building: "#dc2626",
};

function bandOf(score: number) {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 45) return "Fair";
  return "Building";
}

export default function LenderPassportModal({
  passport,
  onClose,
}: {
  passport: LenderTrustPassport;
  onClose: () => void;
}) {
  const bandLabel = passport.band;
  const badgeColor = barColor[bandLabel];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-card p-5 shadow-xl sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Lender Trust Passport</p>
            <div className="mt-1 flex items-center gap-1.5">
              <h3 className="text-foreground font-semibold text-lg">{passport.name}</h3>
              {passport.verified ? (
                <ShieldCheck size={16} className="text-teal-600" />
              ) : (
                <ShieldQuestion size={16} className="text-amber-500" />
              )}
            </div>
            <p className="text-muted-foreground text-xs mt-0.5">{passport.type}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-muted-foreground" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-4 rounded-xl bg-secondary p-4">
          <div
            className="flex size-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
            style={{ backgroundColor: badgeColor }}
          >
            {passport.overallScore}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{bandLabel} trust score</p>
            <p className="text-xs text-muted-foreground mt-0.5">{passport.summary}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5">
            <CalendarClock size={14} className="text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-[11px]">Active since</p>
              <p className="text-foreground font-medium">{passport.yearsActive} yr{passport.yearsActive === 1 ? "" : "s"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5">
            <Users size={14} className="text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-[11px]">Borrowers served</p>
              <p className="text-foreground font-medium">{passport.borrowersServed.toLocaleString("en-IN")}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trust breakdown</p>
          {passport.factors.map((f) => (
            <div key={f.key}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{f.label}</span>
                <span className="font-mono text-xs text-muted-foreground">{f.score}/100</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${f.score}%`, backgroundColor: barColor[bandOf(f.score)] }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{f.detail}</p>
            </div>
          ))}
        </div>

        <p className="mt-5 text-[11px] text-muted-foreground">
          This score is built from response times, flexibility with hardship requests, rate transparency, and how
          many borrowers choose to come back — not just how many requests were approved.
        </p>
      </div>
    </div>
  );
}