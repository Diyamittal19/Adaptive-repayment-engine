import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "@/lib/supabaseClient";
import {
  Eye, EyeOff, ArrowLeft, User, Building2,
  AlertCircle, Loader2, Check, Shield,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen = "login" | "signup";
type Role = "borrower" | "lender";

// ─── Masking Utilities ────────────────────────────────────────────────────────

function maskGovId(v: string): string {
  if (!v || v.length <= 4) return v;
  return ("•".repeat(v.length - 4) + v.slice(-4)).replace(/(.{4})(?=.)/g, "$1 ");
}

function maskPhone(v: string): string {
  if (!v || v.length <= 2) return v;
  return "•".repeat(v.length - 2) + v.slice(-2);
}

// ─── Particle Type ────────────────────────────────────────────────────────────

interface Pt {
  x: number; y: number; vx: number; vy: number;
  sz: number; op: number; r: number; g: number; b: number;
}

// ─── Brand Visual (Canvas) ────────────────────────────────────────────────────

function BrandVisual({ compact }: { compact?: boolean }) {
  const cvs = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  const pts = useRef<Pt[]>([]);
  const t = useRef(0);

  useEffect(() => {
    const el = cvs.current;
    if (!el) return;
    const ctx = el.getContext("2d")!;

    const makePts = (W: number, H: number) => {
      pts.current = Array.from({ length: compact ? 18 : 55 }, () => {
        const k = Math.random();
        const [r, g, b] =
          k < 0.34 ? [20, 184, 166] :
          k < 0.64 ? [59, 130, 246] :
          k < 0.84 ? [139, 92, 246] :
                     [168, 85, 247];
        return {
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.15,
          vy: (Math.random() - 0.5) * 0.15,
          sz: Math.random() * 1.4 + 0.3,
          op: Math.random() * 0.36 + 0.06,
          r, g, b,
        };
      });
    };

    const setup = () => {
      const dpr = devicePixelRatio || 1;
      const rc = el.getBoundingClientRect();
      if (!rc.width || !rc.height) return;
      el.width = rc.width * dpr;
      el.height = rc.height * dpr;
      ctx.scale(dpr, dpr);
      makePts(rc.width, rc.height);
    };

    const glow = (cx: number, cy: number, rad: number, c: string, W: number, H: number) => {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, c); g.addColorStop(1, "transparent");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    };

    // Smooth fill under a curve to baseline
    const fill = (ys: number[], N: number, W: number, H: number) => {
      ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, ys[0]);
      for (let i = 0; i < N - 1; i++) {
        const x0 = (i / (N - 1)) * W, x1 = ((i + 1) / (N - 1)) * W;
        ctx.quadraticCurveTo(x0, ys[i], (x0 + x1) / 2, (ys[i] + ys[i + 1]) / 2);
      }
      ctx.lineTo(W, ys[N - 1]); ctx.lineTo(W, H); ctx.closePath();
    };

    // Smooth stroke path
    const line = (ys: number[], N: number, W: number) => {
      ctx.beginPath(); ctx.moveTo(0, ys[0]);
      for (let i = 0; i < N - 1; i++) {
        const x0 = (i / (N - 1)) * W, x1 = ((i + 1) / (N - 1)) * W;
        ctx.quadraticCurveTo(x0, ys[i], (x0 + x1) / 2, (ys[i] + ys[i + 1]) / 2);
      }
      ctx.lineTo(W, ys[N - 1]);
    };

    const draw = () => {
      const rc = el.getBoundingClientRect();
      const W = rc.width, H = rc.height;
      if (!W || !H) return;
      const now = t.current;

      // ── Background
      ctx.fillStyle = "#050A14"; ctx.fillRect(0, 0, W, H);
      glow(W * 0.78, H * 0.14, W * 0.62, "rgba(67,56,202,0.12)", W, H);
      glow(W * 0.12, H * 0.82, W * 0.50, "rgba(20,184,166,0.09)", W, H);
      glow(W * 0.45, H * 0.50, W * 0.34, "rgba(59,130,246,0.06)", W, H);
      glow(W * 0.88, H * 0.78, W * 0.28, "rgba(139,92,246,0.07)", W, H);

      // Subtle grid
      ctx.strokeStyle = "rgba(59,130,246,0.025)"; ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y <= H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      const N = Math.max(Math.ceil(W / 3), 2);

      // ── Income curve — chaotic, high-frequency
      const iy = Array.from({ length: N }, (_, i) => {
        const x = (i / (N - 1)) * W;
        return H * 0.35
          + 68 * Math.sin(x * 0.0065 + now * 0.28)
          + 33 * Math.sin(x * 0.016 + now * 0.55)
          + 19 * Math.sin(x * 0.030 + now * 0.88)
          + 11 * Math.sin(x * 0.048 + now * 0.46)
          + 7 * Math.sin(x * 0.072 + now * 1.10)
          + 4 * Math.sin(x * 0.110 + now * 0.73);
      });

      // ── Repayment curve — smooth, adapts with lag
      const ry = Array.from({ length: N }, (_, i) => {
        const x = (i / (N - 1)) * W;
        return H * 0.63
          + 37 * Math.sin(x * 0.0065 + now * 0.22 + 0.98)
          + 16 * Math.sin(x * 0.013 + now * 0.41 + 0.60)
          + 7 * Math.sin(x * 0.023 + now * 0.63 + 0.34);
      });

      // ── Adaptation connection lines (income → repayment)
      [0.12, 0.36, 0.63, 0.86].forEach((xf, idx) => {
        const xi = Math.min(Math.round(xf * (N - 1)), N - 1);
        const dx = (xi / (N - 1)) * W;
        const pulse = 0.07 + 0.055 * Math.sin(now * 0.52 + idx * 1.25);
        ctx.save(); ctx.globalAlpha = pulse;
        ctx.strokeStyle = "rgba(99,102,241,0.7)"; ctx.lineWidth = 0.75;
        ctx.setLineDash([3, 5]);
        ctx.beginPath(); ctx.moveTo(dx, iy[xi] + 6); ctx.lineTo(dx, ry[xi] - 6); ctx.stroke();
        ctx.setLineDash([]); ctx.restore();
      });

      // ── Income fill
      fill(iy, N, W, H);
      const ig = ctx.createLinearGradient(0, H * 0.05, 0, H * 0.88);
      ig.addColorStop(0, "rgba(20,184,166,0.25)"); ig.addColorStop(0.4, "rgba(59,130,246,0.10)"); ig.addColorStop(1, "rgba(59,130,246,0)");
      ctx.fillStyle = ig; ctx.fill();

      // Income halo
      line(iy, N, W); ctx.strokeStyle = "rgba(20,184,166,0.07)"; ctx.lineWidth = 18; ctx.lineCap = "round"; ctx.stroke();

      // Income stroke
      line(iy, N, W);
      const is = ctx.createLinearGradient(0, 0, W, 0);
      is.addColorStop(0, "rgba(20,184,166,1)"); is.addColorStop(0.28, "rgba(59,130,246,1)"); is.addColorStop(0.60, "rgba(99,102,241,0.95)"); is.addColorStop(1, "rgba(139,92,246,0.80)");
      ctx.strokeStyle = is; ctx.lineWidth = 2.5; ctx.stroke();

      // ── Repayment fill
      fill(ry, N, W, H);
      const rg = ctx.createLinearGradient(0, H * 0.44, 0, H);
      rg.addColorStop(0, "rgba(99,102,241,0.18)"); rg.addColorStop(0.55, "rgba(139,92,246,0.06)"); rg.addColorStop(1, "rgba(139,92,246,0)");
      ctx.fillStyle = rg; ctx.fill();

      // Repayment halo
      line(ry, N, W); ctx.strokeStyle = "rgba(99,102,241,0.07)"; ctx.lineWidth = 12; ctx.stroke();

      // Repayment stroke
      line(ry, N, W);
      const rs = ctx.createLinearGradient(0, 0, W, 0);
      rs.addColorStop(0, "rgba(99,102,241,0.95)"); rs.addColorStop(0.5, "rgba(139,92,246,0.92)"); rs.addColorStop(1, "rgba(168,85,247,0.86)");
      ctx.strokeStyle = rs; ctx.lineWidth = 2; ctx.stroke();

      // ── Particles
      pts.current.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < -12) p.x = W + 12; if (p.x > W + 12) p.x = -12;
        if (p.y < -12) p.y = H + 12; if (p.y > H + 12) p.y = -12;
        const pr = p.sz * 6;
        const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, pr);
        pg.addColorStop(0, `rgba(${p.r},${p.g},${p.b},${p.op})`); pg.addColorStop(1, "transparent");
        ctx.beginPath(); ctx.arc(p.x, p.y, pr, 0, Math.PI * 2); ctx.fillStyle = pg; ctx.fill();
      });

      // ── Floating value pills (full mode)
      if (!compact) {
        const floats = [
          { lbl: "₹20,000", xf: 0.12, up: true },
          { lbl: "₹12,000", xf: 0.36, up: false },
          { lbl: "₹30,000", xf: 0.63, up: true },
          { lbl: "₹40,000", xf: 0.86, up: true },
        ];
        floats.forEach(({ lbl, xf, up }, idx) => {
          const xi = Math.min(Math.round(xf * (N - 1)), N - 1);
          const dx = (xi / (N - 1)) * W;
          const dotY = iy[xi];
          const pillY = dotY - 40 - 8 * Math.sin(now * 0.48 + idx * 1.28);
          const alpha = 0.40 + 0.30 * Math.sin(now * 0.36 + idx * 0.98);

          ctx.save(); ctx.globalAlpha = alpha;

          // Glow halo dot
          const dg = ctx.createRadialGradient(dx, dotY, 0, dx, dotY, 9);
          dg.addColorStop(0, up ? "rgba(20,184,166,0.85)" : "rgba(239,68,68,0.75)"); dg.addColorStop(1, "transparent");
          ctx.beginPath(); ctx.arc(dx, dotY, 9, 0, Math.PI * 2); ctx.fillStyle = dg; ctx.fill();
          ctx.beginPath(); ctx.arc(dx, dotY, 2.5, 0, Math.PI * 2); ctx.fillStyle = up ? "#34D399" : "#F87171"; ctx.fill();

          // Dashed connector
          ctx.globalAlpha = alpha * 0.28;
          ctx.strokeStyle = up ? "rgba(52,211,153,0.5)" : "rgba(248,113,113,0.4)"; ctx.lineWidth = 0.5;
          ctx.setLineDash([2, 4]);
          ctx.beginPath(); ctx.moveTo(dx, dotY - 8); ctx.lineTo(dx, pillY + 11); ctx.stroke();
          ctx.setLineDash([]); ctx.globalAlpha = alpha;

          // Pill
          const pw = 80, ph = 22;
          ctx.beginPath(); ctx.roundRect(dx - pw / 2, pillY - ph / 2, pw, ph, 11);
          ctx.fillStyle = up ? "rgba(20,184,166,0.11)" : "rgba(239,68,68,0.10)"; ctx.fill();
          ctx.strokeStyle = up ? "rgba(52,211,153,0.30)" : "rgba(248,113,113,0.24)"; ctx.lineWidth = 0.5; ctx.stroke();
          ctx.fillStyle = up ? "#6EE7B7" : "#FCA5A5";
          ctx.font = `600 11px "Plus Jakarta Sans", sans-serif`;
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(lbl, dx, pillY);

          ctx.restore();
        });

        // Curve labels
        ctx.save(); ctx.globalAlpha = 0.38;
        ctx.font = `500 9px "Plus Jakarta Sans", sans-serif`; ctx.textAlign = "right"; ctx.textBaseline = "middle";
        ctx.fillStyle = "#2DD4BF"; ctx.fillText("INCOME", W - 12, iy[N - 1] - 14);
        ctx.fillStyle = "#818CF8"; ctx.fillText("REPAYMENT", W - 12, ry[N - 1] - 14);
        ctx.restore();
      }

      // Compact curve labels
      if (compact) {
        ctx.save(); ctx.globalAlpha = 0.32;
        ctx.font = `500 8px "Plus Jakarta Sans", sans-serif`; ctx.textAlign = "right"; ctx.textBaseline = "middle";
        ctx.fillStyle = "#2DD4BF"; ctx.fillText("INCOME", W - 10, iy[N - 1] - 10);
        ctx.fillStyle = "#818CF8"; ctx.fillText("REPAYMENT", W - 10, ry[N - 1] - 10);
        ctx.restore();
      }
    };

    setup();
    const ro = new ResizeObserver(setup);
    ro.observe(el);
    const tick = () => { t.current += 0.0075; draw(); raf.current = requestAnimationFrame(tick); };
    raf.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf.current); ro.disconnect(); };
  }, [compact]);

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: "#050A14" }}>
      <canvas ref={cvs} className="w-full h-full block" />

      {/* Full overlay */}
      {!compact && (
        <div className="absolute inset-0 flex flex-col justify-end pointer-events-none">
          <div className="absolute inset-x-0 bottom-0 h-60 bg-gradient-to-t from-[#050A14]/90 to-transparent" />
          <motion.div
            className="relative px-10 pb-14"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 1.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <p
              className="text-[1.48rem] leading-[1.32] text-white/90 mb-3 max-w-xs"
              style={{ fontFamily: '"Instrument Serif", serif', fontStyle: "italic" }}
            >
              "Income isn't predictable.
              <br />Repayment can adapt."
            </p>
            <p className="text-[11px] text-white/34 tracking-[0.06em] uppercase font-medium">
              Adaptive repayment within lender-approved rules.
            </p>
          </motion.div>
        </div>
      )}

      {/* Compact overlay */}
      {compact && (
        <div className="absolute inset-0 flex items-end pointer-events-none">
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#060B15] to-transparent" />
          <div className="relative px-5 pb-5">
            <p
              className="text-[13px] leading-snug text-white/65"
              style={{ fontFamily: '"Instrument Serif", serif', fontStyle: "italic" }}
            >
              "Income isn't predictable. Repayment can adapt."
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Auth Header ──────────────────────────────────────────────────────────────

function AuthHeader({ goHome }: { goHome: () => void }) {
  return (
    <header className="flex items-center justify-between px-6 sm:px-8 pt-6 pb-2 flex-shrink-0">
      <button onClick={goHome} className="flex items-center gap-2.5 outline-none">
        <div className="w-[30px] h-[30px] rounded-[9px] bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center shadow-lg shadow-blue-500/25 flex-shrink-0">
          <svg viewBox="0 0 20 20" fill="none" className="w-[15px] h-[15px] text-white">
            <path d="M2 14 Q6.5 5 10 9.5 Q13.5 14 18 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="hidden sm:block text-[13px] font-semibold text-white/88 tracking-[-0.01em]">
          Adaptive Repayment Engine
        </span>
      </button>
      <button
        onClick={goHome}
        className="flex items-center gap-1.5 text-[11.5px] font-medium text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowLeft className="w-3 h-3" />
        Home
      </button>
    </header>
  );
}

// ─── Form Primitives ──────────────────────────────────────────────────────────

function Field({ label, error, hint, children }: {
  label: string; error?: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12.5px] font-medium text-slate-400 tracking-tight">{label}</label>
      {children}
      {hint && !error && <p className="text-[11px] text-slate-600 leading-relaxed">{hint}</p>}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1 text-[11px] text-red-400"
        >
          <AlertCircle className="w-3 h-3 flex-shrink-0" />{error}
        </motion.p>
      )}
    </div>
  );
}

const iCls = (err?: string) => [
  "w-full rounded-xl px-4 py-[11px] text-[13.5px] text-white outline-none transition-all duration-200",
  "bg-[#0C1B30] placeholder:text-slate-600/60",
  err
    ? "border border-red-500/40 focus:border-red-500/60 focus:ring-2 focus:ring-red-500/10"
    : "border border-white/[0.07] focus:border-blue-500/55 focus:ring-2 focus:ring-blue-500/[0.08] focus:bg-[#0F2040]",
].join(" ");

function MaskedInput({ value, onChange, mask, placeholder, error }: {
  value: string; onChange: (v: string) => void;
  mask: (v: string) => string; placeholder: string; error?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type="text"
      value={focused ? value : (value ? mask(value) : "")}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className={iCls(error)}
      autoComplete="off"
    />
  );
}

function PasswordInput({ value, onChange, error, placeholder = "••••••••" }: {
  value: string; onChange: (v: string) => void; error?: string; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className={`${iCls(error)} pr-12`}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        tabIndex={-1}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
      >
        {show ? <EyeOff className="w-[15px] h-[15px]" /> : <Eye className="w-[15px] h-[15px]" />}
      </button>
    </div>
  );
}

function ConsentBox({ checked, onChange, error }: {
  checked: boolean; onChange: (v: boolean) => void; error?: string;
}) {
  return (
    <div>
      <label className="flex items-start gap-3 cursor-pointer group select-none">
        <button
          type="button"
          onClick={() => onChange(!checked)}
          className={[
            "mt-0.5 w-[18px] h-[18px] flex-shrink-0 rounded-[5px] border-[1.5px] flex items-center justify-center transition-all duration-200",
            checked ? "bg-blue-500 border-blue-500 shadow-sm shadow-blue-500/30" : "border-white/[0.18] group-hover:border-white/30",
          ].join(" ")}
        >
          {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
        </button>
        <span className="text-[11.5px] text-slate-500 leading-relaxed">
          I consent to sharing my information for this demo and understand how it will be used.
        </span>
      </label>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1 text-[11px] text-red-400 mt-1.5 ml-[30px]"
        >
          <AlertCircle className="w-3 h-3" />{error}
        </motion.p>
      )}
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.14em] flex-shrink-0">{label}</p>
      <div className="flex-1 h-px bg-white/[0.05]" />
    </div>
  );
}

function SubmitBtn({ loading, label, loadingLabel, variant = "blue" }: {
  loading: boolean; label: string; loadingLabel: string; variant?: "blue" | "indigo";
}) {
  const g = variant === "indigo"
    ? "from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 shadow-indigo-500/20"
    : "from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-blue-500/20";
  return (
    <button
      type="submit"
      disabled={loading}
      className={`w-full py-[13px] rounded-xl bg-gradient-to-r ${g} text-white font-semibold text-[13.5px] transition-all duration-200 shadow-lg disabled:opacity-50 flex items-center justify-center gap-2`}
    >
      {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{loadingLabel}</> : label}
    </button>
  );
}

// ─── Role Card ────────────────────────────────────────────────────────────────

function RoleCard({ role, selected, onClick, icon, title, description }: {
  role: Role; selected: boolean; onClick: () => void;
  icon: React.ReactNode; title: string; description: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.14 }}
      className={[
        "flex-1 p-4 rounded-xl border text-left transition-all duration-200 relative overflow-hidden",
        selected
          ? "border-blue-500/55 bg-blue-500/[0.07] ring-1 ring-blue-500/[0.18]"
          : "border-white/[0.07] bg-[#0C1B30] hover:border-white/[0.13]",
      ].join(" ")}
    >
      {selected && (
        <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-blue-500/22 flex items-center justify-center">
          <span className="w-2 h-2 rounded-full bg-blue-400" />
        </span>
      )}
      <span className={[
        "mb-2.5 w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-200",
        selected ? "bg-blue-500/15 text-blue-400" : "bg-white/[0.04] text-slate-500",
      ].join(" ")}>
        {icon}
      </span>
      <p className={`text-[13px] font-semibold mb-0.5 transition-colors duration-200 ${selected ? "text-white" : "text-slate-400"}`}>
        {title}
      </p>
      <p className="text-[11px] text-slate-600 leading-snug">{description}</p>
    </motion.button>
  );
}

// ─── Borrower Form ────────────────────────────────────────────────────────────

interface BS { name: string; email: string; govId: string; phone: string; occupation: string; district: string; city: string; frequency: "daily" | "monthly"; amount: string; password: string; consent: boolean; }

function BorrowerForm({ onAuthed }: { onAuthed: () => void }) {
  const [f, setF] = useState<BS>({ name: "", email: "", govId: "", phone: "", occupation: "", district: "", city: "", frequency: "monthly", amount: "", password: "", consent: false });
  const [err, setErr] = useState<Partial<Record<keyof BS, string>>>({});
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const set = (k: keyof BS) => (v: string | boolean) => {
    setF(p => ({ ...p, [k]: v }));
    setErr(e => ({ ...e, [k]: undefined }));
  };

  const validate = () => {
    const e: typeof err = {};
    if (!f.name.trim()) e.name = "Full name is required";
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = "Enter a valid email address";
    if (!f.govId.trim()) e.govId = "Government ID is required";
    if (!/^\d{10}$/.test(f.phone)) e.phone = "Enter a valid 10-digit number";
    if (!f.occupation.trim()) e.occupation = "Occupation is required";
    if (!f.district.trim()) e.district = "District is required";
    if (!f.city.trim()) e.city = "City is required";
    if (!f.amount.trim()) e.amount = "Amount is required";
    if (!f.password || f.password.length < 8) e.password = "Minimum 8 characters";
    if (!f.consent) e.consent = "Please accept to continue";
    setErr(e); return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault(); if (!validate()) return;
    setLoading(true);
    setAuthError(null);
    const { data, error } = await supabase.auth.signUp({
      email: f.email,
      password: f.password,
      options: {
        data: {
          role: "borrower",
          name: f.name,
          district: f.district,
          city: f.city,
          occupation: f.occupation,
          phone: f.phone,
          income_frequency: f.frequency,
          income_amount: parseFloat(f.amount.replace(/[^0-9.]/g, "")) || 0,
        },
      },
    });
    if (error) {
      setAuthError(error.message);
      setLoading(false);
      return;
    }
    if (!data.session) {
      // Email confirmation is required before a session exists. The
      // profile rows can't be created yet (RLS requires being logged in
      // as this user), but everything needed to create them is now
      // attached to the auth user itself as metadata — LoginPage reads
      // it back and finishes profile creation the first time this
      // person actually logs in after confirming.
      setCheckEmail(true);
      setLoading(false);
      return;
    }
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({ id: data.user!.id, role: "borrower", name: f.name });
    if (profileError) {
      setAuthError(profileError.message);
      setLoading(false);
      return;
    }
    const { error: borrowerProfileError } = await supabase
      .from("borrower_profiles")
      .insert({
        borrower_id: data.user!.id,
        district: f.district,
        city: f.city,
        occupation: f.occupation,
        phone: f.phone,
        income_frequency: f.frequency,
        income_amount: parseFloat(f.amount.replace(/[^0-9.]/g, "")) || 0,
      });
    if (borrowerProfileError) {
      setAuthError(borrowerProfileError.message);
      setLoading(false);
      return;
    }
    onAuthed();
  };

  if (checkEmail) {
    return (
      <div className="text-center py-8">
        <p className="text-[14px] text-white font-medium mb-1.5">Check your email</p>
        <p className="text-[13px] text-slate-500">
          We've sent a confirmation link to {f.email}. Confirm it, then come back and log in.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <SectionLabel label="Personal Details" />
        <div className="space-y-3">
          <Field label="Full Name" error={err.name}>
            <input type="text" value={f.name} placeholder="Arjun Sharma" onChange={e => set("name")(e.target.value)} className={iCls(err.name)} />
          </Field>
          <Field label="Government ID" error={err.govId}>
            <MaskedInput value={f.govId} onChange={v => set("govId")(v)} mask={maskGovId} placeholder="Aadhaar / PAN number" error={err.govId} />
          </Field>
          <Field label="Phone Number" error={err.phone}>
            <MaskedInput value={f.phone} onChange={v => set("phone")(v)} mask={maskPhone} placeholder="10-digit mobile number" error={err.phone} />
          </Field>
          <Field label="Occupation" error={err.occupation}>
            <input type="text" value={f.occupation} placeholder="e.g. Freelancer, Gig Worker, Trader" onChange={e => set("occupation")(e.target.value)} className={iCls(err.occupation)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="District" error={err.district}>
              <input type="text" value={f.district} placeholder="e.g. Mumbai Suburban" onChange={e => set("district")(e.target.value)} className={iCls(err.district)} />
            </Field>
            <Field label="City" error={err.city}>
              <input type="text" value={f.city} placeholder="e.g. Mumbai" onChange={e => set("city")(e.target.value)} className={iCls(err.city)} />
            </Field>
          </div>
        </div>
      </div>

      <div>
        <SectionLabel label="Income" />
        <div className="space-y-3">
          <Field label="Income Frequency">
            <div className="flex gap-2">
              {(["daily", "monthly"] as const).map(freq => (
                <button key={freq} type="button"
                  onClick={() => { set("frequency")(freq); set("amount")(""); }}
                  className={[
                    "flex-1 py-[10px] px-4 rounded-xl text-[13px] font-medium transition-all duration-200 border",
                    f.frequency === freq
                      ? "border-blue-500/50 bg-blue-500/10 text-blue-400"
                      : "border-white/[0.07] bg-[#0C1B30] text-slate-500 hover:text-slate-300",
                  ].join(" ")}
                >
                  {freq === "daily" ? "Daily" : "Monthly"}
                </button>
              ))}
            </div>
          </Field>
          <Field
            label={`Expected ${f.frequency === "daily" ? "Daily" : "Monthly"} Amount`}
            error={err.amount}
            hint="Used to understand your income pattern and personalize your repayment experience."
          >
            <input type="text" value={f.amount}
              placeholder={f.frequency === "daily" ? "e.g. ₹1,000" : "e.g. ₹30,000"}
              onChange={e => set("amount")(e.target.value)} className={iCls(err.amount)} />
          </Field>
        </div>
      </div>

      <div>
        <SectionLabel label="Account" />
        <div className="space-y-3">
          <Field label="Email" error={err.email}>
            <input type="email" value={f.email} placeholder="you@example.com" onChange={e => set("email")(e.target.value)} className={iCls(err.email)} />
          </Field>
          <Field label="Password" error={err.password}>
            <PasswordInput value={f.password} onChange={v => set("password")(v)} error={err.password} />
          </Field>
          <ConsentBox checked={f.consent} onChange={v => set("consent")(v)} error={err.consent} />
        </div>
      </div>

      {authError ? (
        <p className="flex items-center gap-1.5 text-[12.5px] text-red-400">
          <AlertCircle className="w-[13px] h-[13px] shrink-0" /> {authError}
        </p>
      ) : null}

      <SubmitBtn loading={loading} label="Create Borrower Account" loadingLabel="Creating Account…" />
    </form>
  );
}

// ─── Lender Form ──────────────────────────────────────────────────────────────

interface LS { org: string; orgType: "Individual lender" | "Microfinance institution" | "Cooperative society"; name: string; email: string; govId: string; phone: string; role: string; district: string; city: string; rateMin: string; rateMax: string; maxAmount: string; password: string; consent: boolean; }

function LenderForm({ onAuthed }: { onAuthed: () => void }) {
  const [f, setF] = useState<LS>({ org: "", orgType: "Individual lender", name: "", email: "", govId: "", phone: "", role: "", district: "", city: "", rateMin: "", rateMax: "", maxAmount: "", password: "", consent: false });
  const [err, setErr] = useState<Partial<Record<keyof LS, string>>>({});
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const set = (k: keyof LS) => (v: string | boolean) => {
    setF(p => ({ ...p, [k]: v })); setErr(e => ({ ...e, [k]: undefined }));
  };

  const validate = () => {
    const e: typeof err = {};
    if (!f.org.trim()) e.org = "Institution name is required";
    if (!f.name.trim()) e.name = "Full name is required";
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = "Enter a valid email address";
    if (!f.govId.trim()) e.govId = "Government ID is required";
    if (!/^\d{10}$/.test(f.phone)) e.phone = "Enter a valid 10-digit number";
    if (!f.role.trim()) e.role = "Role is required";
    if (!f.district.trim()) e.district = "District is required";
    if (!f.city.trim()) e.city = "City is required";
    if (!f.rateMin.trim() || !f.rateMax.trim()) e.rateMin = "Rate range is required";
    if (!f.maxAmount.trim()) e.maxAmount = "Maximum loan amount is required";
    if (!f.password || f.password.length < 8) e.password = "Minimum 8 characters";
    if (!f.consent) e.consent = "Please accept to continue";
    setErr(e); return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault(); if (!validate()) return;
    setLoading(true);
    setAuthError(null);
    const { data, error } = await supabase.auth.signUp({
      email: f.email,
      password: f.password,
      options: {
        data: {
          role: "lender",
          name: f.name,
          org_type: f.orgType,
          district: f.district,
          city: f.city,
          rate_min: parseFloat(f.rateMin) || 0,
          rate_max: parseFloat(f.rateMax) || 0,
          max_amount: parseFloat(f.maxAmount) || 0,
          phone: f.phone,
          job_title: f.role,
        },
      },
    });
    if (error) {
      setAuthError(error.message);
      setLoading(false);
      return;
    }
    if (!data.session) {
      // See the matching comment in BorrowerForm — profile rows finish
      // getting created at login time, from the metadata attached above.
      setCheckEmail(true);
      setLoading(false);
      return;
    }
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({ id: data.user!.id, role: "lender", name: f.name });
    if (profileError) {
      setAuthError(profileError.message);
      setLoading(false);
      return;
    }
    const { error: lenderProfileError } = await supabase
      .from("lender_profiles")
      .insert({
        lender_id: data.user!.id,
        org_type: f.orgType,
        district: f.district,
        city: f.city,
        rate_min: parseFloat(f.rateMin) || 0,
        rate_max: parseFloat(f.rateMax) || 0,
        max_amount: parseFloat(f.maxAmount) || 0,
        verified: false,
        phone: f.phone,
        role: f.role,
      });
    if (lenderProfileError) {
      setAuthError(lenderProfileError.message);
      setLoading(false);
      return;
    }
    onAuthed();
  };

  if (checkEmail) {
    return (
      <div className="text-center py-8">
        <p className="text-[14px] text-white font-medium mb-1.5">Check your email</p>
        <p className="text-[13px] text-slate-500">
          We've sent a confirmation link to {f.email}. Confirm it, then come back and log in.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3.5">
      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-indigo-500/[0.06] border border-indigo-500/[0.18]">
        <Shield className="w-[14px] h-[14px] text-indigo-400 flex-shrink-0 mt-0.5" />
        <p className="text-[11.5px] text-indigo-300/72 leading-relaxed">
          Lender accounts require verification before accessing lender features.
        </p>
      </div>
      <Field label="Institution / Organization Name" error={err.org}>
        <input type="text" value={f.org} placeholder="e.g. HDFC Bank, Bajaj Finance" onChange={e => set("org")(e.target.value)} className={iCls(err.org)} />
      </Field>
      <Field label="Full Name" error={err.name}>
        <input type="text" value={f.name} placeholder="Your full name" onChange={e => set("name")(e.target.value)} className={iCls(err.name)} />
      </Field>
      <Field label="Government ID" error={err.govId}>
        <MaskedInput value={f.govId} onChange={v => set("govId")(v)} mask={maskGovId} placeholder="Aadhaar / PAN number" error={err.govId} />
      </Field>
      <Field label="Phone Number" error={err.phone}>
        <MaskedInput value={f.phone} onChange={v => set("phone")(v)} mask={maskPhone} placeholder="10-digit mobile number" error={err.phone} />
      </Field>
      <Field label="Occupation / Role" error={err.role}>
        <input type="text" value={f.role} placeholder="e.g. Credit Manager, CTO, Risk Analyst" onChange={e => set("role")(e.target.value)} className={iCls(err.role)} />
      </Field>
      <Field label="Institution Type">
        <select
          value={f.orgType}
          onChange={e => set("orgType")(e.target.value)}
          className={iCls(undefined)}
        >
          <option value="Individual lender">Individual lender</option>
          <option value="Microfinance institution">Microfinance institution</option>
          <option value="Cooperative society">Cooperative society</option>
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="District" error={err.district}>
          <input type="text" value={f.district} placeholder="e.g. Mumbai Suburban" onChange={e => set("district")(e.target.value)} className={iCls(err.district)} />
        </Field>
        <Field label="City" error={err.city}>
          <input type="text" value={f.city} placeholder="e.g. Mumbai" onChange={e => set("city")(e.target.value)} className={iCls(err.city)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Min Rate (% p.a.)" error={err.rateMin}>
          <input type="number" step="0.1" value={f.rateMin} placeholder="e.g. 12" onChange={e => set("rateMin")(e.target.value)} className={iCls(err.rateMin)} />
        </Field>
        <Field label="Max Rate (% p.a.)">
          <input type="number" step="0.1" value={f.rateMax} placeholder="e.g. 18" onChange={e => set("rateMax")(e.target.value)} className={iCls(undefined)} />
        </Field>
      </div>
      <Field label="Maximum Loan Amount You Offer" error={err.maxAmount}>
        <input type="number" value={f.maxAmount} placeholder="e.g. 200000" onChange={e => set("maxAmount")(e.target.value)} className={iCls(err.maxAmount)} />
      </Field>
      <Field label="Email" error={err.email}>
        <input type="email" value={f.email} placeholder="you@example.com" onChange={e => set("email")(e.target.value)} className={iCls(err.email)} />
      </Field>
      <Field label="Password" error={err.password}>
        <PasswordInput value={f.password} onChange={v => set("password")(v)} error={err.password} />
      </Field>
      <ConsentBox checked={f.consent} onChange={v => set("consent")(v)} error={err.consent} />
      {authError ? (
        <p className="flex items-center gap-1.5 text-[12.5px] text-red-400">
          <AlertCircle className="w-[13px] h-[13px] shrink-0" /> {authError}
        </p>
      ) : null}
      <SubmitBtn loading={loading} label="Create Lender Account" loadingLabel="Creating Account…" variant="indigo" />
    </form>
  );
}

// ─── Auth Shell ───────────────────────────────────────────────────────────────

function AuthShell({ goHome, children }: { goHome: () => void; children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:h-screen flex flex-col lg:flex-row bg-[#060B15]">
      {/* Mobile visual strip */}
      <div className="lg:hidden relative h-56 w-full flex-shrink-0">
        <BrandVisual compact />
      </div>

      {/* Left — form, scrollable */}
      <div className="flex-1 lg:w-1/2 lg:h-screen lg:overflow-y-auto flex flex-col">
        <AuthHeader goHome={goHome} />
        <div className="flex-1 flex items-start lg:items-center justify-center px-5 sm:px-10 pt-5 pb-16 lg:py-10">
          <div className="w-full max-w-[415px]">{children}</div>
        </div>
      </div>

      {/* Right — brand visual, pinned */}
      <div className="hidden lg:flex lg:w-1/2 lg:flex-shrink-0 lg:h-screen overflow-hidden">
        <BrandVisual />
      </div>
    </div>
  );
}

// ─── Signup Page ──────────────────────────────────────────────────────────────

function SignupPage({ goHome, showScreen, onAuthed }: {
  goHome: () => void; showScreen: (s: Screen) => void; onAuthed: (role: Role) => void;
}) {
  const [role, setRole] = useState<Role>("borrower");
  return (
    <AuthShell goHome={goHome}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.48, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <h1 className="text-[1.6rem] font-bold text-white mb-1.5 tracking-[-0.025em] leading-tight">
          Create your Adaptive account
        </h1>
        <p className="text-[13.5px] text-slate-500 mb-6 leading-relaxed">
          Build a repayment experience around your real income.
        </p>

        <div className="flex gap-2.5 mb-6">
          <RoleCard role="borrower" selected={role === "borrower"} onClick={() => setRole("borrower")}
            icon={<User className="w-[17px] h-[17px]" />} title="Borrower" description="For people with variable income" />
          <RoleCard role="lender" selected={role === "lender"} onClick={() => setRole("lender")}
            icon={<Building2 className="w-[17px] h-[17px]" />} title="Lender" description="For banks, NBFCs and lending institutions" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={role}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
          >
            {role === "borrower" ? <BorrowerForm onAuthed={() => onAuthed("borrower")} /> : <LenderForm onAuthed={() => onAuthed("lender")} />}
          </motion.div>
        </AnimatePresence>

        <p className="text-center text-[12px] text-slate-600 mt-5">
          Already have an account?{" "}
          <button onClick={() => showScreen("login")} className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
            Login
          </button>
        </p>
      </motion.div>
    </AuthShell>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────────────

function LoginPage({ goHome, showScreen, onAuthed }: {
  goHome: () => void; showScreen: (s: Screen) => void; onAuthed: (role: Role) => void;
}) {
  const [loginRole, setLoginRole] = useState<Role>("borrower");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const validate = () => {
    const e: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) e.email = "Enter a valid email address";
    if (!password) e.password = "Password is required";
    setErrors(e); return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault(); if (!validate()) return;
    setLoading(true);
    setAuthError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message);
      setLoading(false);
      return;
    }

    let { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (!profile) {
      // First successful login after confirming a signup that couldn't
      // create its profile rows yet (RLS requires being logged in as
      // this user, which wasn't possible before confirming). Everything
      // needed was attached at signup as user metadata — finish the job
      // now instead of leaving the account stuck.
      const meta = data.user.user_metadata as Record<string, unknown> | null;
      const metaRole = meta?.role as Role | undefined;

      if (!metaRole) {
        setAuthError("Signed in, but no profile was found for this account.");
        setLoading(false);
        return;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .insert({ id: data.user.id, role: metaRole, name: (meta?.name as string) ?? "" });
      if (profileError) {
        setAuthError(profileError.message);
        setLoading(false);
        return;
      }

      if (metaRole === "borrower") {
        await supabase.from("borrower_profiles").insert({
          borrower_id: data.user.id,
          district: meta?.district ?? null,
          city: meta?.city ?? null,
          occupation: meta?.occupation ?? null,
          phone: meta?.phone ?? null,
          income_frequency: meta?.income_frequency ?? null,
          income_amount: meta?.income_amount ?? 0,
        });
      } else {
        await supabase.from("lender_profiles").insert({
          lender_id: data.user.id,
          org_type: (meta?.org_type as string) ?? "Individual lender",
          district: meta?.district ?? null,
          city: meta?.city ?? null,
          rate_min: meta?.rate_min ?? 0,
          rate_max: meta?.rate_max ?? 0,
          max_amount: meta?.max_amount ?? 0,
          verified: false,
          phone: meta?.phone ?? null,
          role: meta?.job_title ?? null,
        });
      }

      profile = { role: metaRole };
    }

    // The real role from the database drives routing — not the tab
    // the person happened to have selected before typing their password.
    onAuthed(profile.role as Role);
  };

  return (
    <AuthShell goHome={goHome}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.48, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <h1 className="text-[1.6rem] font-bold text-white mb-1.5 tracking-[-0.025em] leading-tight">
          Welcome back
        </h1>
        <p className="text-[13.5px] text-slate-500 mb-7">
          Continue to Adaptive Repayment Engine.
        </p>

        {/* Borrower / Lender tab */}
        <div className="flex gap-1 p-[5px] bg-[#0C1B30] rounded-xl border border-white/[0.06] mb-7">
          {(["borrower", "lender"] as Role[]).map(r => (
            <button key={r} type="button" onClick={() => setLoginRole(r)}
              className={[
                "flex-1 py-[9px] px-3 rounded-[9px] text-[13px] font-medium transition-all duration-200",
                loginRole === r ? "bg-[#162B4A] text-white shadow-sm" : "text-slate-500 hover:text-slate-300",
              ].join(" ")}
            >
              {r === "borrower" ? "Borrower" : "Lender"}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Email" error={errors.email}>
            <input type="email" value={email}
              onChange={e => { setEmail(e.target.value); setErrors(er => ({ ...er, email: undefined })); }}
              placeholder="you@example.com" className={iCls(errors.email)} />
          </Field>
          <Field label="Password" error={errors.password}>
            <PasswordInput value={password}
              onChange={v => { setPassword(v); setErrors(e => ({ ...e, password: undefined })); }}
              error={errors.password} />
          </Field>
          <div className="flex justify-end -mt-1">
            <button type="button" className="text-[11.5px] text-blue-400/65 hover:text-blue-400 transition-colors">
              Forgot Password?
            </button>
          </div>
          {authError ? (
            <p className="flex items-center gap-1.5 text-[12.5px] text-red-400">
              <AlertCircle className="w-[13px] h-[13px] shrink-0" /> {authError}
            </p>
          ) : null}
          <SubmitBtn loading={loading} label="Login" loadingLabel="Logging in…" />
        </form>

        <p className="text-center text-[12px] text-slate-600 mt-5">
          Don't have an account?{" "}
          <button onClick={() => showScreen("signup")} className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
            Sign Up
          </button>
        </p>
      </motion.div>
    </AuthShell>
  );
}

// ─── Login (top-level export) ──────────────────────────────────────────────────
//
// Mounted at /login by the app's top-level router. Internally switches
// between the login and signup screens with local state (no separate URL
// needed for that) — the actual marketing landing page lives in its own
// route at "/", and successful auth hands off to the real router so the
// borrower/lender dashboards get a proper client-side transition instead
// of a full page reload.

export default function Login() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("login");

  const goHome = () => navigate("/");
  const onAuthed = (role: Role) => navigate(`/${role}`);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={screen}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="min-h-screen"
      >
        {screen === "signup" ? (
          <SignupPage goHome={goHome} showScreen={setScreen} onAuthed={onAuthed} />
        ) : (
          <LoginPage goHome={goHome} showScreen={setScreen} onAuthed={onAuthed} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}