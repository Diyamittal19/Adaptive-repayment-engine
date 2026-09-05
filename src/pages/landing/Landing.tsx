import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "motion/react";
import {
  Menu,
  X,
  Play,
  ArrowRight,
  Shield,
  TrendingUp,
  AlertCircle,
  Users,
  ChevronRight,
  CheckCircle,
  Info,
} from "lucide-react";

// ── Utils ─────────────────────────────────────────────────────────────────────

function fmtK(n: number) {
  return "₹" + (n / 1000).toFixed(0) + "K";
}

function fmtFull(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

type RepaymentResult = {
  payment: number | null;
  kind: "hardship" | "floor" | "normal" | "ceiling";
  deferred: number;
  explanation: string;
};

function computeRepayment(income: number): RepaymentResult {
  const TARGET = 5000;
  if (income <= 10000) {
    return {
      payment: null,
      kind: "hardship",
      deferred: TARGET,
      explanation:
        "Income is below the minimum threshold. A hardship request is raised for the lender to review.",
    };
  }
  if (income <= 12000) {
    return {
      payment: 2000,
      kind: "floor",
      deferred: 3000,
      explanation:
        "Income is low. Payment is set to the lender-approved floor of ₹2,000. The ₹3,000 shortfall is deferred and tracked for catch-up in a stronger month.",
    };
  }
  if (income <= 20000) {
    const t = (income - 12000) / 8000;
    const payment = Math.round(2000 + t * 3000);
    return {
      payment,
      kind: "normal",
      deferred: Math.max(0, TARGET - payment),
      explanation:
        "Income is moderate. Payment scales between the floor and target within lender-approved rules. Any shortfall below ₹5,000 is deferred.",
    };
  }
  if (income <= 30000) {
    const t = (income - 20000) / 10000;
    const payment = Math.round(5000 + t * 1000);
    return {
      payment,
      kind: "normal",
      deferred: 0,
      explanation:
        "Income meets or exceeds the target. Payment is ₹5,000 or above, helping absorb any outstanding deferred balance.",
    };
  }
  if (income <= 40000) {
    const t = (income - 30000) / 10000;
    const payment = Math.round(6000 + t * 1000);
    return {
      payment,
      kind: "ceiling",
      deferred: 0,
      explanation:
        "Income is strong. Payment is elevated toward the ceiling to accelerate catch-up on any deferred balance.",
    };
  }
  return {
    payment: 7000,
    kind: "ceiling",
    deferred: 0,
    explanation:
      "Income is high. Payment is capped at the lender-approved ceiling of ₹7,000.",
  };
}

// ── FadeIn ────────────────────────────────────────────────────────────────────

function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-6% 0px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 22 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────

function Navbar() {
  const [open, setOpen] = useState(false);

  const scrollTo = (id: string) => {
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-foreground text-sm tracking-tight">
            Adaptive Repayment Engine
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-5">
          <button
            onClick={() => scrollTo("demo")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            How It Works
          </button>
          <Link
            to="/login"
            className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            Login
          </Link>
        </nav>

        <button
          className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          onClick={() => setOpen(!open)}
          aria-label="Toggle navigation"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden border-t border-border bg-background px-5 py-4 flex flex-col gap-4"
        >
          <button
            onClick={() => scrollTo("demo")}
            className="text-sm text-left text-muted-foreground hover:text-foreground transition-colors"
          >
            How It Works
          </button>
          <Link
            to="/login"
            className="text-sm font-medium px-4 py-2.5 rounded-lg bg-primary text-white text-center"
          >
            Login
          </Link>
        </motion.div>
      )}
    </header>
  );
}

// ── Hero Repayment Card ───────────────────────────────────────────────────────

const HERO_ROWS = [
  { income: 20000, payment: 5000 },
  { income: 12000, payment: 2000 },
  { income: 30000, payment: 6000 },
  { income: 40000, payment: 7000 },
];

function RepaymentCard() {
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-border p-6 w-full max-w-[340px]">
      <div className="flex items-center justify-between mb-5">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
          Repayment Schedule
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
          <CheckCircle className="w-3 h-3" />
          Lender Approved
        </span>
      </div>

      <div className="space-y-3 mb-5">
        {HERO_ROWS.map(({ income, payment }, i) => (
          <motion.div
            key={income}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.6 + i * 0.1 }}
            className="flex items-center gap-3"
          >
            <div className="flex-1 text-right">
              <span className="font-mono text-sm font-medium text-muted-foreground">
                {fmtK(income)}
              </span>
              <div className="text-[10px] text-muted-foreground/50 mt-0.5">income</div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <div className="h-px w-4 bg-border" />
              <ArrowRight className="w-3.5 h-3.5 text-accent" />
              <div className="h-px w-4 bg-border" />
            </div>
            <div className="flex-1">
              <span className="font-mono text-sm font-semibold text-foreground">
                {fmtK(payment)}
              </span>
              <div className="text-[10px] text-muted-foreground/50 mt-0.5">payment</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="text-center">
            <div className="font-mono text-xs font-bold text-blue-600">₹2K</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Floor</div>
          </div>
          <div className="flex-1 relative h-1.5 bg-muted rounded-full overflow-visible">
            <div className="absolute left-[10%] right-[10%] top-0 h-full bg-accent/25 rounded-full" />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-accent border-2 border-white shadow"
              style={{ left: "48%" }}
            />
          </div>
          <div className="text-center">
            <div className="font-mono text-xs font-bold text-accent">₹5K</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Target</div>
          </div>
          <div className="w-px h-5 bg-border flex-shrink-0" />
          <div className="text-center">
            <div className="font-mono text-xs font-bold text-foreground">₹7K</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Ceiling</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 justify-center">
          <Shield className="w-3 h-3 text-accent" />
          <span className="text-[10px] text-muted-foreground font-medium">
            Within lender-approved rules
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function HeroSection() {
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <section className="pt-32 pb-24 px-5">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_auto] gap-14 items-center">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-accent bg-accent/10 border border-accent/20 px-3 py-1.5 rounded-full mb-7">
            <Shield className="w-3 h-3" />
            Lender-controlled adaptive repayment
          </div>

          <h1
            className="text-[2.6rem] md:text-5xl lg:text-[3.2rem] font-bold text-foreground leading-[1.12] mb-6"
            style={{ fontFamily: "'Lora', Georgia, serif" }}
          >
            Your income changes.{" "}
            <span className="text-accent">
              Your repayment
            </span>{" "}
            should too.
          </h1>

          <p className="text-lg text-muted-foreground leading-relaxed mb-9 max-w-lg">
            Flexible, pre-agreed repayment plans for people whose income
            doesn't arrive on a fixed monthly schedule.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => scrollTo("demo")}
              className="px-6 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm"
            >
              See How It Works
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollTo("simulator")}
              className="px-6 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors text-sm"
            >
              Explore the Simulator
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex justify-center lg:justify-end"
        >
          <RepaymentCard />
        </motion.div>
      </div>
    </section>
  );
}

// ── Problem ───────────────────────────────────────────────────────────────────

const PROBLEM_INCOMES = [20000, 12000, 30000, 4000];
const ADAPTIVE_ROWS = [
  { income: 20000, pay: "₹5K", note: "" },
  { income: 12000, pay: "₹2K", note: "floor" },
  { income: 30000, pay: "₹6K", note: "catch-up" },
  { income: 4000, pay: "Hardship", note: "lender reviews" },
];

function ProblemSection() {
  return (
    <section className="py-24 px-5 bg-[#0D1C30] text-white">
      <div className="max-w-5xl mx-auto">
        <FadeIn className="text-center mb-14">
          <h2
            className="text-3xl md:text-4xl font-bold mb-5 leading-tight"
            style={{ fontFamily: "'Lora', Georgia, serif" }}
          >
            A fixed EMI doesn't understand variable income.
          </h2>
          <p className="text-white/55 max-w-2xl mx-auto text-lg leading-relaxed">
            Tutors, freelancers, commission workers, and self-employed
            professionals earn repeatedly — but not evenly. Today's loan
            structure wasn't designed for that reality.
          </p>
        </FadeIn>

        <div className="grid md:grid-cols-2 gap-5 mb-12">
          <FadeIn delay={0.1}>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-full">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                <span className="text-sm font-medium text-white/75">Traditional Fixed EMI</span>
              </div>
              <div className="space-y-4">
                {PROBLEM_INCOMES.map((inc, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-20 text-right">
                      <span className="font-mono text-sm text-white/55">{fmtK(inc)}</span>
                      <div className="text-[10px] text-white/25 mt-0.5">income</div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
                    <div className="flex-1 flex items-center justify-between">
                      <div>
                        <span className="font-mono text-sm font-semibold text-white">₹5K</span>
                        <div className="text-[10px] text-white/25 mt-0.5">payment</div>
                      </div>
                      {inc < 5000 && (
                        <span className="text-[11px] text-red-400 font-medium bg-red-400/10 px-2 py-0.5 rounded-full">
                          default risk
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-4 border-t border-white/10">
                <p className="text-xs text-red-400">
                  Same payment regardless of income — stress when it's low, missed opportunity when it's high.
                </p>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.18}>
            <div className="bg-accent/10 border border-accent/30 rounded-2xl p-6 h-full">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                <span className="text-sm font-medium text-white/75">Adaptive Repayment</span>
              </div>
              <div className="space-y-4">
                {ADAPTIVE_ROWS.map(({ income, pay, note }, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-20 text-right">
                      <span className="font-mono text-sm text-white/55">{fmtK(income)}</span>
                      <div className="text-[10px] text-white/25 mt-0.5">income</div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                    <div>
                      <span
                        className={`font-mono text-sm font-semibold ${
                          pay === "Hardship" ? "text-amber-400" : "text-white"
                        }`}
                      >
                        {pay}
                      </span>
                      {note && (
                        <div className="text-[10px] text-white/35 mt-0.5">{note}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-4 border-t border-accent/20">
                <p className="text-xs text-accent">
                  Payment responds to income — within lender-approved limits.
                </p>
              </div>
            </div>
          </FadeIn>
        </div>

        <FadeIn delay={0.25}>
          <p
            className="text-center text-xl font-medium text-white/85 max-w-xl mx-auto leading-snug"
            style={{ fontFamily: "'Lora', Georgia, serif" }}
          >
            What if repayment could respond to income —{" "}
            <em className="not-italic text-accent">within lender-approved rules?</em>
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

// ── Demo ──────────────────────────────────────────────────────────────────────

const FLOW_STEPS = ["Income Signal", "Recommendation", "Payment", "Balance Update"];

function DemoSection() {
  return (
    <section id="demo" className="py-24 px-5">
      <div className="max-w-4xl mx-auto">
        <FadeIn className="text-center mb-12">
          <h2
            className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight"
            style={{ fontFamily: "'Lora', Georgia, serif" }}
          >
            Watch repayment adapt to real income.
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            See the engine in action — from income signal to lender confirmation.
          </p>
        </FadeIn>

        <FadeIn delay={0.12}>
  <div className="relative rounded-2xl overflow-hidden bg-[#0D1C30] aspect-video shadow-2xl border border-border">
    <video
      className="w-full h-full object-cover"
      controls
      preload="metadata"
    >
      <source src="/Demo Video for landing page.mp4" type="video/mp4" />
      Your browser does not support the video tag.
    </video>
  </div>
</FadeIn>

        <FadeIn delay={0.22} className="mt-8">
          <div className="flex items-center justify-center flex-wrap gap-2">
            {FLOW_STEPS.map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span className="text-sm font-medium text-foreground">{step}</span>
                </div>
                {i < FLOW_STEPS.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────────

const HOW_STEPS = [
  {
    label: "Borrower",
    desc: "Shares consented income signals each repayment cycle",
    Icon: Users,
    iconClass: "bg-blue-50 text-blue-600 border-blue-100",
  },
  {
    label: "Adaptive Engine",
    desc: "Applies lender-defined rules and produces a recommendation",
    Icon: TrendingUp,
    iconClass: "bg-cyan-50 text-cyan-700 border-cyan-100",
  },
  {
    label: "Lender",
    desc: "Confirms the payment within agreed contractual terms",
    Icon: Shield,
    iconClass: "bg-indigo-50 text-indigo-600 border-indigo-100",
  },
  {
    label: "Repayment",
    desc: "Borrower pays through the lender's platform",
    Icon: CheckCircle,
    iconClass: "bg-emerald-50 text-emerald-600 border-emerald-100",
  },
];

function HowItWorksSection() {
  return (
    <section className="py-24 px-5 bg-secondary/40">
      <div className="max-w-5xl mx-auto">
        <FadeIn className="text-center mb-16">
          <h2
            className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight"
            style={{ fontFamily: "'Lora', Georgia, serif" }}
          >
            Three parties. One transparent agreement.
          </h2>
        </FadeIn>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
          {HOW_STEPS.map(({ label, desc, Icon, iconClass }, i) => (
            <FadeIn key={label} delay={i * 0.09} className="flex flex-col items-center text-center">
              <div
                className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-3.5 ${iconClass}`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <div className="font-semibold text-foreground text-sm mb-1.5">{label}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{desc}</div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.36}>
          <div className="hidden md:flex items-center justify-center gap-1 mb-10">
            {HOW_STEPS.map((s, i) => (
              <div key={s.label} className="flex items-center gap-1">
                <div className="text-[11px] font-medium text-muted-foreground px-2">{s.label}</div>
                {i < HOW_STEPS.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-accent flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </FadeIn>

        <FadeIn delay={0.42}>
          <div className="bg-white rounded-2xl border border-border p-5 text-center max-w-2xl mx-auto flex items-start gap-2.5 justify-center">
            <Info className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              The engine recommends within lender-defined rules. It does not
              override loan contracts.
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    Icon: TrendingUp,
    title: "Adaptive Payments",
    desc: "Recommendations adjust each cycle using verified income signals and lender-approved rules. No manual intervention required.",
    iconClass: "bg-cyan-50 text-cyan-600",
  },
  {
    Icon: Shield,
    title: "Floor & Ceiling",
    desc: "Payments always stay within predefined limits set by the lender at origination. Floor ₹2K · Target ₹5K · Ceiling ₹7K.",
    iconClass: "bg-indigo-50 text-indigo-600",
  },
  {
    Icon: AlertCircle,
    title: "Hardship Requests",
    desc: "When even the floor is unaffordable, borrowers can request help. The lender reviews and decides — the engine facilitates, it doesn't approve.",
    iconClass: "bg-amber-50 text-amber-600",
  },
  {
    Icon: Users,
    title: "Family Visibility",
    desc: "Optional household view of income, expenses, and cash-flow health — for better planning, without creating joint loan liability.",
    iconClass: "bg-emerald-50 text-emerald-600",
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-5">
      <div className="max-w-5xl mx-auto">
        <FadeIn className="text-center mb-14">
          <h2
            className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight"
            style={{ fontFamily: "'Lora', Georgia, serif" }}
          >
            Built for income that doesn't follow a schedule.
          </h2>
        </FadeIn>

        <div className="grid md:grid-cols-2 gap-5">
          {FEATURES.map(({ Icon, title, desc, iconClass }, i) => (
            <FadeIn key={title} delay={i * 0.09}>
              <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-md transition-shadow h-full">
                <div className={`w-11 h-11 rounded-xl ${iconClass} flex items-center justify-center mb-4`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-foreground mb-2 text-base">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Simulator ─────────────────────────────────────────────────────────────────

const KIND_LABEL: Record<string, string> = {
  hardship: "Hardship Request",
  floor: "Floor (minimum)",
  normal: "Adaptive",
  ceiling: "Ceiling (maximum)",
};

const KIND_COLOR: Record<string, string> = {
  hardship: "text-amber-400",
  floor: "text-blue-400",
  normal: "text-cyan-400",
  ceiling: "text-indigo-400",
};

function SimulatorSection() {
  const [income, setIncome] = useState(20000);
  const result = computeRepayment(income);

  return (
    <section id="simulator" className="py-24 px-5 bg-[#0D1C30] text-white">
      <div className="max-w-2xl mx-auto">
        <FadeIn className="text-center mb-12">
          <h2
            className="text-3xl md:text-4xl font-bold mb-4 leading-tight"
            style={{ fontFamily: "'Lora', Georgia, serif" }}
          >
            What happens when your income changes?
          </h2>
          <p className="text-white/50 text-lg">
            Move the slider to see how the engine recommends payment.
          </p>
        </FadeIn>

        <FadeIn delay={0.12}>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-7">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-white/60">Monthly Income</label>
                <span className="font-mono text-2xl font-bold text-white tabular-nums">
                  {fmtFull(income)}
                </span>
              </div>
              <input
                type="range"
                min={8000}
                max={50000}
                step={500}
                value={income}
                onChange={(e) => setIncome(Number(e.target.value))}
                className="w-full cursor-pointer accent-cyan-400"
                style={{ accentColor: "#0891B2" }}
              />
              <div className="flex justify-between text-xs text-white/25 mt-1.5 font-mono">
                <span>₹8K</span>
                <span>₹50K</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-white/5 rounded-xl p-4">
                <div className="text-[10px] text-white/35 mb-1.5 font-mono uppercase tracking-widest">
                  Verified Income
                </div>
                <div className="font-mono text-xl font-bold text-white tabular-nums">
                  {fmtFull(income)}
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4">
                <div className="text-[10px] text-white/35 mb-1.5 font-mono uppercase tracking-widest">
                  Recommended
                </div>
                <div className={`font-mono text-xl font-bold tabular-nums ${KIND_COLOR[result.kind]}`}>
                  {result.payment !== null ? fmtFull(result.payment) : "Hardship"}
                </div>
                <div className={`text-[11px] mt-0.5 ${KIND_COLOR[result.kind]}`}>
                  {KIND_LABEL[result.kind]}
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4">
                <div className="text-[10px] text-white/35 mb-1.5 font-mono uppercase tracking-widest">
                  Deferred Balance
                </div>
                <div className="font-mono text-xl font-bold text-white tabular-nums">
                  {result.deferred > 0 ? fmtFull(result.deferred) : "—"}
                </div>
                {result.deferred > 0 && (
                  <div className="text-[11px] text-white/35 mt-0.5">tracked for catch-up</div>
                )}
              </div>

              <div className="bg-white/5 rounded-xl p-4">
                <div className="text-[10px] text-white/35 mb-1.5 font-mono uppercase tracking-widest">
                  Status
                </div>
                <div className="text-sm text-white/70 leading-snug font-medium">
                  {result.kind === "hardship"
                    ? "Sent to lender for review"
                    : result.deferred > 0
                    ? "Catch-up in stronger months"
                    : result.kind === "ceiling"
                    ? "Accelerating catch-up"
                    : "On track"}
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/8">
              <div className="text-[10px] text-white/35 mb-1.5 font-mono uppercase tracking-widest">
                Explanation
              </div>
              <p className="text-sm text-white/60 leading-relaxed">{result.explanation}</p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.22} className="mt-5 text-center">
          <p className="text-xs text-white/25">
            Simulation only. Actual repayment depends on lender-approved terms.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

// ── Personas ──────────────────────────────────────────────────────────────────

const PERSONAS = [
  {
    emoji: "🎓",
    role: "Private Tutor",
    income: "Uneven monthly income",
    quote:
      "My students pay at different times. Some months I earn ₹25K, some months ₹10K. A fixed EMI would mean stress every low month.",
  },
  {
    emoji: "💻",
    role: "Freelancer",
    income: "Project-based income",
    quote:
      "Projects close in batches. I might have nothing for six weeks, then three projects land at once. My cash flow is real, just not linear.",
  },
  {
    emoji: "📊",
    role: "Commission Worker",
    income: "Variable earnings",
    quote:
      "Good quarters are great. Lean quarters are hard. I don't need forgiveness — I need a repayment plan that understands the sales cycle.",
  },
];

function PersonasSection() {
  return (
    <section className="py-24 px-5">
      <div className="max-w-5xl mx-auto">
        <FadeIn className="text-center mb-14">
          <h2
            className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight"
            style={{ fontFamily: "'Lora', Georgia, serif" }}
          >
            Designed around real income patterns.
          </h2>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-5">
          {PERSONAS.map(({ emoji, role, income, quote }, i) => (
            <FadeIn key={role} delay={i * 0.1}>
              <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-md transition-shadow h-full flex flex-col">
                <div className="text-3xl mb-4">{emoji}</div>
                <div className="font-semibold text-foreground text-base">{role}</div>
                <div className="text-xs text-muted-foreground mt-0.5 mb-5">{income}</div>
                <p className="text-sm text-muted-foreground leading-relaxed italic flex-1">
                  "{quote}"
                </p>
                <div className="mt-5 pt-4 border-t border-border">
                  <div className="text-[10px] text-muted-foreground/45 font-medium uppercase tracking-wide">
                    Persona voice — illustrative only
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Trust ─────────────────────────────────────────────────────────────────────

const TRUST_SIGNALS = [
  "Consent-based data",
  "Explainable recommendations",
  "Lender-controlled exceptions",
];

function TrustBar() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });

  const bars = [
    { label: "Floor", value: "₹2K", h: "h-10", color: "bg-blue-100 border-blue-200", text: "text-blue-600" },
    { label: "Target", value: "₹5K", h: "h-20", color: "bg-accent/20 border-accent/40", text: "text-accent", highlight: true },
    { label: "Ceiling", value: "₹7K", h: "h-28", color: "bg-foreground/10 border-foreground/20", text: "text-foreground" },
  ];

  return (
    <div ref={ref} className="flex items-end gap-4 justify-center mb-6">
      {bars.map(({ label, value, h, color, text, highlight }, i) => (
        <div key={label} className="flex flex-col items-center gap-2">
          <div className={`font-mono text-sm font-bold ${text}`}>{value}</div>
          <motion.div
            initial={{ scaleY: 0 }}
            animate={inView ? { scaleY: 1 } : {}}
            transition={{ duration: 0.5, delay: i * 0.12, ease: "easeOut" }}
            style={{ originY: 1 }}
            className={`w-16 ${h} rounded-xl border-2 ${color} ${highlight ? "ring-2 ring-accent/30" : ""}`}
          />
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      ))}
    </div>
  );
}

function TrustSection() {
  return (
    <section className="py-24 px-5 bg-secondary/40">
      <div className="max-w-4xl mx-auto">
        <FadeIn className="text-center mb-14">
          <h2
            className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight"
            style={{ fontFamily: "'Lora', Georgia, serif" }}
          >
            Flexible for borrowers. Controlled by lenders.
          </h2>
        </FadeIn>

        <div className="max-w-md mx-auto">
          <FadeIn delay={0.1}>
            <div className="bg-card border border-border rounded-2xl p-7 mb-5">
              <TrustBar />

              <div className="flex justify-center mb-4">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-px h-6 bg-border" />
                  <div className="w-5 h-5 rounded-full bg-accent/15 border-2 border-accent flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                  </div>
                  <div className="w-px h-6 bg-border" />
                </div>
              </div>

              <div className="bg-[#0D1C30] rounded-xl p-4 text-center text-white mb-4">
                <div className="font-semibold text-sm">Adaptive Engine</div>
                <div className="text-xs text-white/40 mt-0.5">
                  Applies rules · Produces recommendation
                </div>
              </div>

              <div className="flex justify-center mb-4">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-px h-6 bg-border" />
                  <div className="w-5 h-5 rounded-full bg-accent/15 border-2 border-accent flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                  </div>
                  <div className="w-px h-6 bg-border" />
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <div className="font-semibold text-sm text-emerald-800">
                  Explainable Recommendation
                </div>
                <div className="text-xs text-emerald-600 mt-0.5">
                  Lender confirms · Borrower pays
                </div>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.2}>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {TRUST_SIGNALS.map((s) => (
                <div key={s} className="bg-card border border-border rounded-xl p-3.5 text-center">
                  <CheckCircle className="w-4 h-4 text-accent mx-auto mb-1.5" />
                  <div className="text-[11px] font-medium text-foreground leading-snug">{s}</div>
                </div>
              ))}
            </div>
          </FadeIn>

          <FadeIn delay={0.3}>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 items-start">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800 leading-relaxed">
                Adaptive repayment must be part of lender-approved loan terms
                from the beginning. The app does not modify an existing fixed
                EMI.
              </p>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

// ── Final CTA ─────────────────────────────────────────────────────────────────

function CTASection() {
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <section className="py-28 px-5 bg-[#0D1C30] text-white text-center">
      <div className="max-w-xl mx-auto">
        <FadeIn>
          <h2
            className="text-3xl md:text-4xl font-bold mb-4 leading-tight"
            style={{ fontFamily: "'Lora', Georgia, serif" }}
          >
            Make repayment fit real income.
          </h2>
          <p className="text-white/45 mb-10 text-lg leading-relaxed">
            A technology layer for adaptive, lender-approved repayment.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => scrollTo("demo")}
              className="px-7 py-3.5 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-colors flex items-center gap-2 text-sm"
            >
              Explore the Demo
              <Play className="w-4 h-4" fill="currentColor" />
            </button>
            <button
              onClick={() => scrollTo("demo")}
              className="px-7 py-3.5 rounded-xl border border-white/20 text-white font-medium hover:bg-white/5 transition-colors text-sm"
            >
              See How It Works
            </button>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <footer className="py-12 px-5 border-t border-border bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold text-foreground text-sm">
                Adaptive Repayment Engine
              </span>
            </div>
            <p className="text-xs text-muted-foreground italic">
              A technology layer for adaptive, lender-approved repayment.
            </p>
          </div>

          <nav className="flex flex-wrap gap-6 items-center">
            <button
              onClick={() => scrollTo("demo")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollTo("simulator")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Simulator
            </button>
            <Link
              to="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Login
            </Link>
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground/50 font-medium tracking-wide">
            Hackathon MVP · Not a financial product
          </p>
          <p className="text-xs text-muted-foreground/35">
            © 2025 Adaptive Repayment Engine
          </p>
        </div>
      </div>
    </footer>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function Landing() {
  return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar />
      <main>
        <HeroSection />
        <ProblemSection />
        <DemoSection />
        <HowItWorksSection />
        <FeaturesSection />
        <SimulatorSection />
        <PersonasSection />
        <TrustSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
