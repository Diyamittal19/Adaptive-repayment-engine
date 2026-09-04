// ─────────────────────────────────────────────────────────────────────────
// CREDIT PASSPORT — shared scoring engine
//
// Built for people with irregular income who don't have a formal credit
// score. Instead of one accept/reject number, this derives a transparent,
// multi-factor score from real repayment behaviour already tracked in the
// app. Every factor is explainable and carries a concrete tip for how to
// improve it — nothing is a black box.
//
// Used by both the borrower pages (own passport + lender trust lookups)
// and the lender pages (own trust passport + borrower passport lookups),
// so a score means exactly the same thing on both sides of the
// marketplace.
// ─────────────────────────────────────────────────────────────────────────

export type Band = "Building" | "Fair" | "Good" | "Excellent";

export interface PassportFactor {
  key: string;
  label: string;
  score: number; // 0-100
  weight: number; // fraction of overall score, sums to 1 across all factors
  detail: string; // plain-language explanation of where they stand
  tip: string; // concrete next step to raise this factor
}

export interface CreditPassport {
  kind: "borrower";
  subjectId: string;
  name: string;
  role: string;
  overallScore: number;
  band: Band;
  summary: string;
  factors: PassportFactor[];
  loansCompleted: number;
  activeLoans: number;
  lendersWorkedWith: number;
  memberSince: string;
  thinFile?: boolean; // true when there isn't much history yet
}

export interface LenderTrustFactor {
  key: string;
  label: string;
  score: number;
  weight: number;
  detail: string;
  tip: string;
}

export interface LenderTrustPassport {
  kind: "lender";
  lenderId: string;
  name: string;
  type?: string;
  overallScore: number;
  band: Band;
  summary: string;
  factors: LenderTrustFactor[];
  verified?: boolean;
  yearsActive: number;
  borrowersServed: number;
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function bandFor(score: number): Band {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 45) return "Fair";
  return "Building";
}

export function bandTone(band: Band): "success" | "info" | "warning" | "danger" {
  if (band === "Excellent") return "success";
  if (band === "Good") return "info";
  if (band === "Fair") return "warning";
  return "danger";
}

type LedgerStatus = "active" | "paid" | "overdue" | "written-off" | "settled-early";

type LedgerLike = {
  status: LedgerStatus;
  loanAmount: number;
  transactions: { type: string; amount: number; note: string; balance: number }[];
};

function scoreLedger(l: LedgerLike) {
  const repayments = l.transactions.filter((t) => t.type === "repayment");
  const penalties = l.transactions.filter((t) => t.type === "penalty");
  const currentBalance = l.transactions.at(-1)?.balance ?? l.loanAmount;

  let onTime = 95;
  onTime -= penalties.length * 30;
  if (l.status === "overdue") onTime -= 25;
  if (l.status === "written-off") onTime -= 45;

  let consistency = 55 + repayments.length * 8;
  if (l.status === "settled-early") consistency += 15;
  if (l.status === "written-off") consistency -= 40;
  consistency -= penalties.length * 20;

  const debtRatio = l.loanAmount > 0 ? currentBalance / l.loanAmount : 0;
  let debtLoad = Math.round((1 - debtRatio) * 100);
  if (l.status === "written-off") debtLoad -= 20;

  const completionMap: Record<LedgerStatus, number> = {
    paid: 100,
    "settled-early": 100,
    active: 72,
    overdue: 40,
    "written-off": 10,
  };
  const completion = completionMap[l.status];

  let goodFaith = 72;
  if (l.status === "settled-early") goodFaith = 96;
  if (repayments.some((r) => /partial/i.test(r.note))) goodFaith += 8;
  if (l.status === "written-off" && repayments.length === 0) goodFaith = 15;
  if (l.status === "overdue" && repayments.length > 0) goodFaith = 58;

  return {
    weight: Math.max(l.loanAmount, 1),
    onTime: clamp(onTime),
    consistency: clamp(consistency),
    debtLoad: clamp(debtLoad),
    completion: clamp(completion),
    goodFaith: clamp(goodFaith),
  };
}

function weightedAvg(values: { weight: number; value: number }[]) {
  const totalWeight = values.reduce((s, v) => s + v.weight, 0) || 1;
  return values.reduce((s, v) => s + v.value * v.weight, 0) / totalWeight;
}

const FACTOR_COPY: Record<string, Record<Band, { detail: string; tip: string }>> = {
  onTime: {
    Excellent: { detail: "Has paid on schedule almost every cycle.", tip: "Strongest factor — keep going." },
    Good: { detail: "Most payments land on time, with only the odd late one.", tip: "A reminder near due dates tends to close this gap." },
    Fair: { detail: "Payments have been on time about half the cycles.", tip: "Even the floor-payment amount on time beats paying full but late." },
    Building: { detail: "Late or missed payments have brought this down.", tip: "Contact before a due date, not after — it protects this score." },
  },
  consistency: {
    Excellent: { detail: "Repayment pattern is steady cycle after cycle.", tip: "Low risk of surprise gaps." },
    Good: { detail: "Mostly steady, with a few irregular gaps.", tip: "A fixed due-date reminder tends to smooth this out." },
    Fair: { detail: "Payment timing varies a fair amount cycle to cycle.", tip: "A short on-time streak would move this up a full band." },
    Building: { detail: "Payments have been irregular or interrupted.", tip: "Linking payments to a fixed date right after income lands helps." },
  },
  debtLoad: {
    Excellent: { detail: "Carrying very little outstanding balance relative to the loan.", tip: "Strong position for better terms next time." },
    Good: { detail: "Outstanding balance is manageable relative to the loan.", tip: "Extra payments during high-income months speed this up." },
    Fair: { detail: "A meaningful chunk of the loan is still outstanding.", tip: "A top-up plan during good-income months could help." },
    Building: { detail: "Outstanding balance is high relative to what was borrowed.", tip: "Even small extra payments reduce this ratio." },
  },
  completion: {
    Excellent: { detail: "Has fully repaid or settled loans early before.", tip: "Strongest proof of reliability available." },
    Good: { detail: "Active loan in good standing with no red flags.", tip: "On track for a clean completed record." },
    Fair: { detail: "History includes an overdue period.", tip: "Getting current on the next payment starts rebuilding this." },
    Building: { detail: "A past loan wasn't repaid and was written off.", tip: "Weighs less as newer, positive repayment records are added." },
  },
  goodFaith: {
    Excellent: { detail: "Has settled early or paid down debt proactively.", tip: "Reads as low-risk." },
    Good: { detail: "Generally communicates and pays in good faith.", tip: "No action needed." },
    Fair: { detail: "Has made some effort even during a difficult stretch.", tip: "Asking for help before missing a payment counts in their favour." },
    Building: { detail: "A loan went to default without a repayment attempt on record.", tip: "A proactive partial payment next time rebuilds this quickly." },
  },
};

function factorCopy(key: string, score: number) {
  return FACTOR_COPY[key][bandFor(score)];
}

function buildFactors(agg: {
  onTime: number;
  consistency: number;
  debtLoad: number;
  completion: number;
  goodFaith: number;
}): PassportFactor[] {
  const defs: { key: string; label: string; weight: number }[] = [
    { key: "onTime", label: "On-time repayment rate", weight: 0.3 },
    { key: "consistency", label: "Repayment consistency", weight: 0.2 },
    { key: "debtLoad", label: "Current debt load", weight: 0.15 },
    { key: "completion", label: "Loan completion history", weight: 0.2 },
    { key: "goodFaith", label: "Proactive communication", weight: 0.15 },
  ];
  return defs.map((d) => {
    const score = clamp((agg as Record<string, number>)[d.key]);
    return { ...d, score, ...factorCopy(d.key, score) };
  });
}

function summaryFor(band: Band, name: string) {
  switch (band) {
    case "Excellent":
      return `${name}'s repayment behaviour is highly reliable — a strong signal even without a formal credit score.`;
    case "Good":
      return `${name} repays reliably overall, with room to tighten a couple of factors.`;
    case "Fair":
      return `${name}'s repayment history is mixed — some strong periods, some strain — but shows genuine effort.`;
    default:
      return `${name} is early in building a repayment record, or has had a difficult stretch. This will move as new history comes in.`;
  }
}

function passportFromFactors(
  subjectId: string,
  name: string,
  role: string,
  factors: PassportFactor[],
  extra: { loansCompleted: number; activeLoans: number; lendersWorkedWith: number; memberSince: string; thinFile?: boolean },
): CreditPassport {
  const overallScore = clamp(factors.reduce((s, f) => s + f.score * f.weight, 0));
  const band = bandFor(overallScore);
  return {
    kind: "borrower",
    subjectId,
    name,
    role,
    overallScore,
    band,
    summary: extra.thinFile
      ? `${name} is new to this platform — there isn't a repayment track record here yet.`
      : summaryFor(band, name),
    factors,
    ...extra,
  };
}

// ── the logged-in borrower's own passport (Ravi Kumar) ──────────────────
// Derived from the exact ledger data shown on the borrower's Lenders page.

const MY_LEDGERS: LedgerLike[] = [
  { status: "active", loanAmount: 120000, transactions: [
    { type: "loan", amount: 120000, note: "Loan disbursed", balance: 120000 },
    { type: "repayment", amount: 15000, note: "Feb EMI", balance: 105000 },
    { type: "repayment", amount: 15000, note: "Mar EMI", balance: 90000 },
    { type: "interest", amount: 900, note: "Mar interest", balance: 90900 },
    { type: "repayment", amount: 15000, note: "Apr EMI", balance: 75900 },
    { type: "repayment", amount: 15000, note: "May EMI", balance: 60900 },
    { type: "repayment", amount: 15000, note: "Jun EMI", balance: 45900 },
    { type: "repayment", amount: 15000, note: "Jul EMI", balance: 30900 },
  ]},
  { status: "active", loanAmount: 50000, transactions: [
    { type: "loan", amount: 50000, note: "Received cash", balance: 50000 },
    { type: "repayment", amount: 8000, note: "Apr repayment", balance: 42000 },
    { type: "repayment", amount: 8000, note: "May repayment", balance: 34000 },
    { type: "repayment", amount: 8000, note: "Jun repayment", balance: 26000 },
  ]},
  { status: "paid", loanAmount: 200000, transactions: [
    { type: "loan", amount: 200000, note: "Disbursed", balance: 200000 },
    { type: "repayment", amount: 70000, note: "Q1 repayment", balance: 130000 },
    { type: "repayment", amount: 70000, note: "Q2 repayment", balance: 60000 },
    { type: "repayment", amount: 60000, note: "Final repayment", balance: 0 },
  ]},
  { status: "settled-early", loanAmount: 30000, transactions: [
    { type: "loan", amount: 30000, note: "Received", balance: 30000 },
    { type: "repayment", amount: 30000, note: "Full early repayment", balance: 0 },
  ]},
  { status: "overdue", loanAmount: 80000, transactions: [
    { type: "loan", amount: 80000, note: "Disbursed", balance: 80000 },
    { type: "repayment", amount: 20000, note: "Partial", balance: 60000 },
    { type: "penalty", amount: 3000, note: "Overdue penalty", balance: 63000 },
  ]},
];

export function getMyCreditPassport(): CreditPassport {
  const per = MY_LEDGERS.map(scoreLedger);
  const agg = {
    onTime: weightedAvg(per.map((p) => ({ weight: p.weight, value: p.onTime }))),
    consistency: weightedAvg(per.map((p) => ({ weight: p.weight, value: p.consistency }))),
    debtLoad: weightedAvg(per.map((p) => ({ weight: p.weight, value: p.debtLoad }))),
    completion: weightedAvg(per.map((p) => ({ weight: p.weight, value: p.completion }))),
    goodFaith: weightedAvg(per.map((p) => ({ weight: p.weight, value: p.goodFaith }))),
  };
  const factors = buildFactors(agg);
  const overallScore = clamp(factors.reduce((s, f) => s + f.score * f.weight, 0));
  const band = bandFor(overallScore);
  const completed = MY_LEDGERS.filter((l) => l.status === "paid" || l.status === "settled-early").length;
  const active = MY_LEDGERS.filter((l) => l.status === "active" || l.status === "overdue").length;

  return {
    kind: "borrower",
    subjectId: "ravi-kumar",
    name: "Ravi Kumar",
    role: "Auto-rickshaw driver",
    overallScore,
    band,
    summary: summaryFor(band, "You"),
    factors,
    loansCompleted: completed,
    activeLoans: active,
    lendersWorkedWith: MY_LEDGERS.length,
    memberSince: "Jan 2025",
  };
}

// ── lender trust passports (for lenders the borrower is browsing) ──────

interface LenderSeed {
  id: number;
  name: string;
  type: string;
  rating: number;
  verified: boolean;
  rateMin: number;
  rateMax: number;
  maxAmount: number;
  avgResponseHours: number;
  yearsActive: number;
  hardshipAccommodationPct: number;
  repeatBorrowerPct: number;
  borrowersServed: number;
}

const LENDER_SEEDS: LenderSeed[] = [
  { id: 1, name: "Ashish Kulkarni", type: "Individual lender", rating: 4.8, verified: true, rateMin: 1.5, rateMax: 2.5, maxAmount: 50000, avgResponseHours: 6, yearsActive: 3, hardshipAccommodationPct: 78, repeatBorrowerPct: 62, borrowersServed: 94 },
  { id: 2, name: "Sahayata Microfinance", type: "Microfinance institution", rating: 4.6, verified: true, rateMin: 1.2, rateMax: 2.0, maxAmount: 150000, avgResponseHours: 18, yearsActive: 7, hardshipAccommodationPct: 71, repeatBorrowerPct: 58, borrowersServed: 1240 },
  { id: 3, name: "Jyoti Cooperative Society", type: "Cooperative society", rating: 4.5, verified: true, rateMin: 1.0, rateMax: 1.8, maxAmount: 100000, avgResponseHours: 30, yearsActive: 9, hardshipAccommodationPct: 66, repeatBorrowerPct: 70, borrowersServed: 860 },
  { id: 4, name: "Rekha Deshmukh", type: "Individual lender", rating: 4.3, verified: false, rateMin: 1.8, rateMax: 2.8, maxAmount: 30000, avgResponseHours: 14, yearsActive: 1, hardshipAccommodationPct: 45, repeatBorrowerPct: 33, borrowersServed: 21 },
  { id: 5, name: "Unnati Finance Circle", type: "Microfinance institution", rating: 4.7, verified: true, rateMin: 1.4, rateMax: 2.2, maxAmount: 200000, avgResponseHours: 10, yearsActive: 5, hardshipAccommodationPct: 74, repeatBorrowerPct: 64, borrowersServed: 640 },
  { id: 6, name: "Vikram Sawant", type: "Individual lender", rating: 4.1, verified: false, rateMin: 2.0, rateMax: 3.0, maxAmount: 25000, avgResponseHours: 26, yearsActive: 2, hardshipAccommodationPct: 40, repeatBorrowerPct: 29, borrowersServed: 17 },
];

const LENDER_FACTOR_COPY: Record<string, Record<Band, { detail: string; tip: string }>> = {
  flexibility: {
    Excellent: { detail: "Almost always offers a restructured plan instead of a flat rejection when a borrower asks for help.", tip: "" },
    Good: { detail: "Usually works with borrowers who ask for a payment adjustment.", tip: "" },
    Fair: { detail: "Sometimes accommodates hardship requests, sometimes doesn't.", tip: "" },
    Building: { detail: "Rarely offers flexibility on hardship requests so far.", tip: "" },
  },
  responsiveness: {
    Excellent: { detail: "Typically responds to requests within a few hours.", tip: "" },
    Good: { detail: "Usually responds within a day.", tip: "" },
    Fair: { detail: "Response times can take a day or two.", tip: "" },
    Building: { detail: "Response times have been slow.", tip: "" },
  },
  transparency: {
    Excellent: { detail: "Rates are clear and consistent with what's actually charged.", tip: "" },
    Good: { detail: "Terms are generally clear with minor rate variance.", tip: "" },
    Fair: { detail: "Some borrowers report the final rate differs from what's advertised.", tip: "" },
    Building: { detail: "Wider gap between advertised and applied terms.", tip: "" },
  },
  reputation: {
    Excellent: { detail: "Consistently high ratings from borrowers.", tip: "" },
    Good: { detail: "Solidly rated by past borrowers.", tip: "" },
    Fair: { detail: "Mixed but generally decent ratings.", tip: "" },
    Building: { detail: "Limited or newer rating history.", tip: "" },
  },
  loyalty: {
    Excellent: { detail: "A large share of their borrowers choose to borrow from them again.", tip: "" },
    Good: { detail: "A healthy share of repeat borrowers.", tip: "" },
    Fair: { detail: "Some borrowers return, many don't yet.", tip: "" },
    Building: { detail: "Not enough repeat borrowers yet to show a strong pattern.", tip: "" },
  },
};

export function getLenderTrustPassport(name: string): LenderTrustPassport | null {
  const l = LENDER_SEEDS.find((s) => s.name === name);
  if (!l) return null;

  const responsivenessScore = clamp(100 - l.avgResponseHours * 2.2);
  const rateSpreadPenalty = (l.rateMax - l.rateMin) > 1.2 ? 10 : 0;
  const transparencyScore = clamp((l.verified ? 85 : 55) - rateSpreadPenalty);
  const reputationScore = clamp((l.rating / 5) * 100);
  const loyaltyScore = clamp(l.repeatBorrowerPct * 1.15);
  const flexibilityScore = clamp(l.hardshipAccommodationPct * 1.05);

  const defs: { key: string; label: string; weight: number; score: number }[] = [
    { key: "flexibility", label: "Flexibility with hardship requests", weight: 0.25, score: flexibilityScore },
    { key: "responsiveness", label: "Responsiveness", weight: 0.2, score: responsivenessScore },
    { key: "transparency", label: "Rate transparency", weight: 0.2, score: transparencyScore },
    { key: "reputation", label: "Borrower reputation", weight: 0.15, score: reputationScore },
    { key: "loyalty", label: "Repeat-borrower trust", weight: 0.2, score: loyaltyScore },
  ];

  const factors: LenderTrustFactor[] = defs.map((d) => ({
    ...d,
    ...LENDER_FACTOR_COPY[d.key][bandFor(d.score)],
  }));

  const overallScore = clamp(factors.reduce((s, f) => s + f.score * f.weight, 0));
  const band = bandFor(overallScore);

  const summary =
    band === "Excellent"
      ? `${l.name} is highly trusted — flexible with borrowers, responsive, and transparent about terms.`
      : band === "Good"
      ? `${l.name} has a solid track record with borrowers on this platform.`
      : band === "Fair"
      ? `${l.name} has a mixed but workable track record — worth reading the details before you request.`
      : `${l.name} is newer or has a thinner track record on this platform — proceed with a bit more caution and ask questions upfront.`;

  return {
    kind: "lender",
    lenderId: String(l.id),
    name: l.name,
    type: l.type,
    overallScore,
    band,
    summary,
    factors,
    verified: l.verified,
    yearsActive: l.yearsActive,
    borrowersServed: l.borrowersServed,
  };
}

// ── existing borrowers with a full ledger (mirrors lender's Borrowers seed) ──

interface BorrowerLedgerRecord {
  id: string;
  name: string;
  role: string;
  status: LedgerStatus;
  loanAmount: number;
  transactions: { type: string; amount: number; note: string; balance: number }[];
}

const BORROWER_LEDGERS: BorrowerLedgerRecord[] = [
  { id: "1", name: "Arjun Nambiar", role: "Home renovation", status: "paid", loanAmount: 120000, transactions: [
    { type: "loan", amount: 120000, note: "Loan disbursed", balance: 120000 },
    { type: "repayment", amount: 60000, note: "Partial repayment", balance: 60000 },
    { type: "repayment", amount: 60000, note: "Final repayment", balance: 0 },
  ]},
  { id: "2", name: "Divya Krishnan", role: "Business expansion", status: "paid", loanAmount: 50000, transactions: [
    { type: "loan", amount: 50000, note: "Loan disbursed", balance: 50000 },
    { type: "repayment", amount: 25000, note: "EMI", balance: 25000 },
    { type: "repayment", amount: 25000, note: "Final payment", balance: 0 },
  ]},
  { id: "3", name: "Ravi Shankar", role: "Medical emergency", status: "written-off", loanAmount: 30000, transactions: [
    { type: "loan", amount: 30000, note: "Loan disbursed", balance: 30000 },
    { type: "repayment", amount: 5000, note: "Partial", balance: 25000 },
  ]},
  { id: "4", name: "Meera Pillai", role: "Beautician, home salon", status: "paid", loanAmount: 75000, transactions: [
    { type: "loan", amount: 75000, note: "Disbursed", balance: 75000 },
    { type: "repayment", amount: 40000, note: "EMI", balance: 35000 },
    { type: "repayment", amount: 35000, note: "Final", balance: 0 },
  ]},
  { id: "5", name: "Karan Mehta", role: "Vehicle purchase loan", status: "active", loanAmount: 200000, transactions: [
    { type: "loan", amount: 200000, note: "Disbursed", balance: 200000 },
    { type: "repayment", amount: 20000, note: "EMI Mar", balance: 180000 },
    { type: "repayment", amount: 20000, note: "EMI Apr", balance: 160000 },
    { type: "interest", amount: 1200, note: "Interest charged", balance: 161200 },
  ]},
  { id: "6", name: "Sneha Joshi", role: "Personal loan", status: "active", loanAmount: 45000, transactions: [
    { type: "loan", amount: 45000, note: "Disbursed", balance: 45000 },
    { type: "repayment", amount: 8000, note: "EMI", balance: 37000 },
  ]},
  { id: "7", name: "Ankit Gupta", role: "Active borrower", status: "active", loanAmount: 90000, transactions: [
    { type: "loan", amount: 90000, note: "Disbursed", balance: 90000 },
    { type: "repayment", amount: 10000, note: "EMI Feb", balance: 80000 },
    { type: "repayment", amount: 10000, note: "EMI Mar", balance: 70000 },
  ]},
  { id: "8", name: "Fatima Sheikh", role: "Settled early", status: "settled-early", loanAmount: 60000, transactions: [
    { type: "loan", amount: 60000, note: "Disbursed", balance: 60000 },
    { type: "repayment", amount: 30000, note: "Partial", balance: 30000 },
    { type: "repayment", amount: 30000, note: "Early settlement", balance: 0 },
  ]},
  { id: "9", name: "Rohan Verma", role: "Overdue account", status: "overdue", loanAmount: 150000, transactions: [
    { type: "loan", amount: 150000, note: "Disbursed", balance: 150000 },
    { type: "repayment", amount: 30000, note: "Partial", balance: 120000 },
    { type: "interest", amount: 5500, note: "Overdue interest", balance: 125500 },
  ]},
  { id: "10", name: "Lakshmi Bai", role: "Settled early", status: "settled-early", loanAmount: 35000, transactions: [
    { type: "loan", amount: 35000, note: "Disbursed", balance: 35000 },
    { type: "repayment", amount: 35000, note: "Full early repayment", balance: 0 },
  ]},
  { id: "11", name: "Vikram Nair", role: "Active borrower", status: "active", loanAmount: 80000, transactions: [
    { type: "loan", amount: 80000, note: "Disbursed", balance: 80000 },
    { type: "repayment", amount: 15000, note: "EMI Apr", balance: 65000 },
  ]},
];

function passportFromLedgerRecord(rec: BorrowerLedgerRecord): CreditPassport {
  const per = scoreLedger(rec);
  const factors = buildFactors({
    onTime: per.onTime,
    consistency: per.consistency,
    debtLoad: per.debtLoad,
    completion: per.completion,
    goodFaith: per.goodFaith,
  });
  const completed = rec.status === "paid" || rec.status === "settled-early" ? 1 : 0;
  const active = rec.status === "active" || rec.status === "overdue" ? 1 : 0;
  return passportFromFactors(rec.id, rec.name, rec.role, factors, {
    loansCompleted: completed,
    activeLoans: active,
    lendersWorkedWith: 1,
    memberSince: "on this platform",
  });
}

// ── hardship / repayment-adjustment requesters ──────────────────────────

interface HardshipSeed {
  name: string;
  role: string;
  loanId: string;
  repeat: boolean;
  status: "Pending" | "Approved" | "Rejected";
}

const HARDSHIP_SEEDS: HardshipSeed[] = [
  { name: "Priya Menon", role: "Commission sales", loanId: "LN-2287", repeat: true, status: "Pending" },
  { name: "Karan Malhotra", role: "Auto-rickshaw driver", loanId: "LN-2299", repeat: false, status: "Pending" },
  { name: "Sneha Iyer", role: "Home tutor", loanId: "LN-2255", repeat: false, status: "Pending" },
  { name: "Farhan Sheikh", role: "Freelance designer", loanId: "LN-2304", repeat: true, status: "Approved" },
];

function passportFromHardship(h: HardshipSeed): CreditPassport {
  const onTime = h.repeat ? 55 : 68;
  const consistency = h.repeat ? 48 : 62;
  const debtLoad = 55;
  const completion = h.status === "Approved" ? 70 : 60;
  const goodFaith = h.repeat ? 74 : 80;

  const factors = buildFactors({ onTime, consistency, debtLoad, completion, goodFaith });
  return passportFromFactors(h.loanId, h.name, h.role, factors, {
    loansCompleted: 0,
    activeLoans: 1,
    lendersWorkedWith: 1,
    memberSince: "on this platform",
  });
}

// ── brand-new applicants with no repayment history yet ("thin file") ────

export function passportFromApplication(opts: {
  id: string;
  name: string;
  role: string;
  requestedAmount: number;
  documents: string[];
}): CreditPassport {
  const completeness = clamp((opts.documents.length / 3) * 100);
  const amountReasonableness = clamp(100 - Math.max(0, (opts.requestedAmount - 40000) / 1000));
  const identitySignal = opts.documents.some((d) => /id proof/i.test(d)) ? 80 : 50;
  const historyLength = 25;

  const defs: { key: string; label: string; weight: number; score: number; detail: string; tip: string }[] = [
    { key: "onTime", label: "On-time repayment rate", weight: 0.3, score: historyLength, detail: "No repayment history yet on this platform.", tip: "Score updates automatically after the first EMI cycle." },
    { key: "consistency", label: "Repayment consistency", weight: 0.2, score: historyLength, detail: "Not enough cycles yet to measure consistency.", tip: "Builds up after 2-3 on-time payments." },
    { key: "debtLoad", label: "Requested amount vs. profile", weight: 0.15, score: amountReasonableness, detail: amountReasonableness > 70 ? "Requested amount is in a typical range for this profile." : "Requested amount is on the higher side for a first loan.", tip: "" },
    { key: "completion", label: "Application completeness", weight: 0.2, score: completeness, detail: completeness >= 90 ? "All requested documents were submitted." : "Some supporting documents are still missing.", tip: "" },
    { key: "goodFaith", label: "Identity & document verification", weight: 0.15, score: identitySignal, detail: identitySignal >= 80 ? "ID proof is on file." : "ID proof hasn't been confirmed yet.", tip: "" },
  ];

  return passportFromFactors(opts.id, opts.name, opts.role, defs, {
    loansCompleted: 0,
    activeLoans: 0,
    lendersWorkedWith: 0,
    memberSince: "New applicant",
    thinFile: true,
  });
}

export function getBorrowerPassportByName(name: string): CreditPassport | null {
  const ledger = BORROWER_LEDGERS.find((b) => b.name === name);
  if (ledger) return passportFromLedgerRecord(ledger);
  const hardship = HARDSHIP_SEEDS.find((h) => h.name === name);
  if (hardship) return passportFromHardship(hardship);
  return null;
}

export function getBorrowerPassportById(id: string): CreditPassport | null {
  const ledger = BORROWER_LEDGERS.find((b) => b.id === id);
  if (ledger) return passportFromLedgerRecord(ledger);
  return null;
}

// ── the logged-in lender's own trust passport ───────────────────────────

const LENDER_STATS = {
  name: "Sahayata Microfinance",
  hardshipRequestsReceived: 42,
  hardshipRequestsAccommodated: 31,
  avgResponseHours: 14,
  rateVarianceComplaints: 2,
  disputesRaised: 5,
  disputesResolvedAmicably: 4,
  totalBorrowers: 1240,
  repeatBorrowers: 720,
  yearsActive: 7,
};

const MY_LENDER_FACTOR_COPY: Record<string, Record<Band, { detail: string; tip: string }>> = {
  flexibility: {
    Excellent: { detail: "Almost always offers a restructured plan instead of a flat rejection.", tip: "Keep documenting these accommodations — they're your strongest trust signal." },
    Good: { detail: "Usually works with borrowers who ask for a payment adjustment.", tip: "Approving a few more borderline hardship cases would push this to Excellent." },
    Fair: { detail: "Sometimes accommodates hardship requests, sometimes doesn't.", tip: "A clearer internal policy for when to offer a grace period would raise this." },
    Building: { detail: "Hardship requests have mostly been rejected outright so far.", tip: "Offering even a partial restructure instead of a flat reject raises this quickly." },
  },
  responsiveness: {
    Excellent: { detail: "Typically responds to requests within a few hours.", tip: "Borrowers notice this — keep it up." },
    Good: { detail: "Usually responds within a day.", tip: "Responding within a few hours would move this to Excellent." },
    Fair: { detail: "Response times can take a day or two.", tip: "Turning around Pending requests faster is the single biggest lever here." },
    Building: { detail: "Response times have been slow.", tip: "Even an acknowledgement message within a few hours improves how this reads." },
  },
  transparency: {
    Excellent: { detail: "Rates charged consistently match what's advertised.", tip: "No action needed — this is a strong differentiator." },
    Good: { detail: "Terms are generally clear with only minor rate variance.", tip: "Fewer than a handful of complaints keeps this in Good." },
    Fair: { detail: "A few borrowers have reported the final rate differing from what's advertised.", tip: "Reviewing where the rate quote diverges from what's applied would help." },
    Building: { detail: "Rate variance complaints are pulling this down.", tip: "Standardising the quoted-vs-applied rate is the fastest fix." },
  },
  disputes: {
    Excellent: { detail: "Disputes are rare and resolved amicably when they happen.", tip: "Keep resolving quickly and in the borrower's favour when warranted." },
    Good: { detail: "Most disputes get resolved without escalation.", tip: "Closing out the remaining open dispute would help." },
    Fair: { detail: "A meaningful share of disputes go unresolved.", tip: "Following up on outstanding disputes directly raises this." },
    Building: { detail: "Several disputes remain unresolved.", tip: "Prioritising these builds trust fastest." },
  },
  loyalty: {
    Excellent: { detail: "A large share of borrowers choose to borrow again.", tip: "This is the strongest possible trust signal — no action needed." },
    Good: { detail: "A healthy share of repeat borrowers.", tip: "Checking in with past borrowers ahead of their next need could raise this." },
    Fair: { detail: "Some borrowers return, many don't yet.", tip: "Understanding why one-time borrowers don't come back would help." },
    Building: { detail: "Not many repeat borrowers yet.", tip: "This often follows once flexibility and responsiveness improve." },
  },
};

export function getMyTrustPassport(): LenderTrustPassport {
  const s = LENDER_STATS;
  const flexibilityScore = clamp((s.hardshipRequestsAccommodated / s.hardshipRequestsReceived) * 100);
  const responsivenessScore = clamp(100 - s.avgResponseHours * 2.2);
  const transparencyScore = clamp(100 - s.rateVarianceComplaints * 12);
  const disputesScore = clamp((s.disputesResolvedAmicably / Math.max(s.disputesRaised, 1)) * 100 - 5);
  const loyaltyScore = clamp((s.repeatBorrowers / s.totalBorrowers) * 100 * 1.1);

  const defs: { key: string; label: string; weight: number; score: number }[] = [
    { key: "flexibility", label: "Flexibility with hardship requests", weight: 0.25, score: flexibilityScore },
    { key: "responsiveness", label: "Responsiveness", weight: 0.2, score: responsivenessScore },
    { key: "transparency", label: "Rate transparency", weight: 0.2, score: transparencyScore },
    { key: "disputes", label: "Dispute resolution", weight: 0.15, score: disputesScore },
    { key: "loyalty", label: "Repeat-borrower trust", weight: 0.2, score: loyaltyScore },
  ];

  const factors: LenderTrustFactor[] = defs.map((d) => ({ ...d, ...MY_LENDER_FACTOR_COPY[d.key][bandFor(d.score)] }));
  const overallScore = clamp(factors.reduce((sum, f) => sum + f.score * f.weight, 0));
  const band = bandFor(overallScore);

  const summary =
    band === "Excellent"
      ? "You're highly trusted by borrowers — flexible, responsive, and transparent about terms."
      : band === "Good"
      ? "You have a solid trust record with your borrowers."
      : band === "Fair"
      ? "Your trust score is workable but has clear room to improve — see the breakdown below."
      : "Your trust score needs attention — borrowers are seeing this before they even request a loan.";

  return {
    kind: "lender",
    lenderId: "me",
    name: s.name,
    overallScore,
    band,
    summary,
    factors,
    borrowersServed: s.totalBorrowers,
    yearsActive: s.yearsActive,
  };
}
