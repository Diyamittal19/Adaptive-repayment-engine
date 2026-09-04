import { X, CreditCard, Lightbulb, Info } from "lucide-react";
import type { CreditPassport } from "@/lib/creditPassport";

const barColor: Record<string, string> = {
  Excellent: "#2f9e6e",
  Good: "#2563eb",
  Fair: "#dfa23a",
  Building: "#dc2626",
};

function bandOf(score: number) {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 45) return "Fair";
  return "Building";
}

export default function BorrowerPassportModal({
  passport,
  onClose,
}: {
  passport: CreditPassport;
  onClose: () => void;
}) {
  const badgeColor = barColor[passport.band];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-teal-600" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Credit Passport</p>
              <h3 className="text-slate-900 font-semibold text-lg">{passport.name}</h3>
              <p className="text-slate-400 text-xs mt-0.5">{passport.role}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4">
          <div
            className="flex size-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
            style={{ backgroundColor: badgeColor }}
          >
            {passport.overallScore}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{passport.band} score</p>
            <p className="text-xs text-slate-500 mt-0.5">{passport.summary}</p>
          </div>
        </div>

        {passport.thinFile && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3.5 py-2.5">
            <Info size={14} className="text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700">
              This applicant is new to the platform — there's no repayment history yet. The score reflects
              application quality, not risk, and will update automatically after the first repayment cycle.
            </p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl border border-slate-100 px-3 py-2.5">
            <p className="text-slate-400 text-[11px]">Loans completed</p>
            <p className="text-slate-800 font-medium mt-0.5">{passport.loansCompleted}</p>
          </div>
          <div className="rounded-xl border border-slate-100 px-3 py-2.5">
            <p className="text-slate-400 text-[11px]">Active loans</p>
            <p className="text-slate-800 font-medium mt-0.5">{passport.activeLoans}</p>
          </div>
          <div className="rounded-xl border border-slate-100 px-3 py-2.5">
            <p className="text-slate-400 text-[11px]">Status</p>
            <p className="text-slate-800 font-medium mt-0.5">{passport.memberSince}</p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Score breakdown</p>
          {passport.factors.map((f) => (
            <div key={f.key}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{f.label}</span>
                <span className="font-mono text-xs text-slate-400">{f.score}/100</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full" style={{ width: `${f.score}%`, backgroundColor: barColor[bandOf(f.score)] }} />
              </div>
              <p className="mt-1.5 text-xs text-slate-500">{f.detail}</p>
              {f.tip && (
                <p className="mt-1 flex items-start gap-1.5 text-xs font-medium text-slate-600">
                  <Lightbulb size={11} className="mt-0.5 shrink-0 text-amber-500" />
                  {f.tip}
                </p>
              )}
            </div>
          ))}
        </div>

        <p className="mt-5 text-[11px] text-slate-400">
          Built from this borrower's actual repayment behaviour on the platform — not a single accept/reject
          signal. A hardship request made proactively, before a payment is missed, counts in their favour here.
        </p>
      </div>
    </div>
  );
}
