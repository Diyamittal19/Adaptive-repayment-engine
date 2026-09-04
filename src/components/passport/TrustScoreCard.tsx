import { useState } from "react";
import { ChevronDown, ShieldCheck, Lightbulb, Award } from "lucide-react";
import ScoreGauge from "./ScoreGauge";
import { getMyTrustPassport, bandTone } from "@/lib/creditPassport";

const barColor: Record<string, string> = {
  success: "#16A34A",
  info: "#2563EB",
  warning: "#D97706",
  danger: "#DC2626",
};

export default function TrustScoreCard() {
  const passport = getMyTrustPassport();
  const tone = bandTone(passport.band);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <ScoreGauge score={passport.overallScore} tone={tone} label={passport.band} />
          <div>
            <div className="flex items-center gap-2">
              <Award size={16} className="text-slate-400" />
              <h2 className="text-slate-900 font-semibold">Your Lender Trust Score</h2>
            </div>
            <p className="mt-1 max-w-md text-sm text-slate-500">{passport.summary}</p>
            <p className="mt-2 text-xs text-slate-400">
              {passport.borrowersServed.toLocaleString("en-IN")} borrowers served &middot; {passport.yearsActive} years active
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
            <ShieldCheck size={13} />
            Visible to borrowers before they request a loan
          </span>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:underline"
          >
            {expanded ? "Hide breakdown" : "See full breakdown"}
            <ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
          {passport.factors.map((f) => (
            <div key={f.key}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{f.label}</span>
                <span className="font-mono text-xs text-slate-400">{f.score}/100</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${f.score}%`, backgroundColor: barColor[f.score >= 80 ? "success" : f.score >= 65 ? "info" : f.score >= 45 ? "warning" : "danger"] }}
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-500">{f.detail}</p>
              <p className="mt-1 flex items-start gap-1.5 text-xs font-medium text-slate-700">
                <Lightbulb size={12} className="mt-0.5 shrink-0 text-amber-500" />
                {f.tip}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
