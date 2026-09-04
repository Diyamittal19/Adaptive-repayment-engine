// ============================================================================
// DEMO MODE — a single switch that makes every screen show rich, realistic
// data instantly, without depending on how much real Supabase data exists.
//
// Turn OFF (false) to go back to the real, fully-wired app — nothing here
// replaces the real Supabase logic in each page, it just short-circuits it
// when this flag is true. Flip it back and every page reads from Supabase
// again exactly as before, with zero rework.
// ============================================================================
export const DEMO_MODE = true;

// ─── Borrower: Dashboard ────────────────────────────────────────────────────
export const demoLoan = {
  id: 9001,
  target_amount: 15000,
  floor: 8000,
  ceiling: 20000,
  due_date: "2026-09-15",
  status: "active",
  outstanding: 42000,
  lender_id: "demo-lender",
};

export const demoLenderName = "Suresh Kumar";

export const demoPayments = [
  { cycle_month: "2026-03-01", amount_due: 15000, amount_paid: 15000, paid_on_time: true, income_that_cycle: 31000 },
  { cycle_month: "2026-04-01", amount_due: 15000, amount_paid: 15000, paid_on_time: true, income_that_cycle: 32000 },
  { cycle_month: "2026-05-01", amount_due: 15000, amount_paid: 15000, paid_on_time: true, income_that_cycle: 30000 },
  { cycle_month: "2026-06-01", amount_due: 15000, amount_paid: 8000, paid_on_time: false, income_that_cycle: 18000 },
  { cycle_month: "2026-07-01", amount_due: 15000, amount_paid: 15000, paid_on_time: true, income_that_cycle: 34000 },
  { cycle_month: "2026-08-01", amount_due: 15000, amount_paid: 12000, paid_on_time: false, income_that_cycle: 26000 },
];

export const demoPendingHardship = true;

// Payment history for the second demo platform loan (Anjali Deshmukh, id 9002) —
// separate from demoPayments above, which belongs to the first loan (id 9001).
export const demoPayments2 = [
  { cycle_month: "2026-06-01", amount_due: 2000, amount_paid: 2000, paid_on_time: true, income_that_cycle: 20000 },
  { cycle_month: "2026-07-01", amount_due: 2000, amount_paid: 2000, paid_on_time: true, income_that_cycle: 21000 },
  { cycle_month: "2026-08-01", amount_due: 2000, amount_paid: 1500, paid_on_time: false, income_that_cycle: 15000 },
];

// ─── Borrower: Tracker ──────────────────────────────────────────────────────
export const demoExpenses = [
  { id: 1, category: "rent" as const, amount: 3000, note: "Monthly room rent", logged_at: "2026-08-03" },
  { id: 2, category: "transport" as const, amount: 900, note: "Fuel for deliveries", logged_at: "2026-08-11" },
  { id: 3, category: "other" as const, amount: 400, note: "Phone screen repair", logged_at: "2026-08-19" },
  { id: 4, category: "stock" as const, amount: 1500, note: "Restocked delivery bag supplies", logged_at: "2026-07-08" },
  { id: 5, category: "transport" as const, amount: 850, note: "Fuel for deliveries", logged_at: "2026-07-14" },
  { id: 6, category: "rent" as const, amount: 3200, note: "Monthly room rent", logged_at: "2026-07-03" },
  { id: 7, category: "transport" as const, amount: 600, note: "Fuel, fewer trips this month", logged_at: "2026-06-15" },
  { id: 8, category: "rent" as const, amount: 3000, note: "Monthly room rent", logged_at: "2026-06-03" },
  { id: 9, category: "family" as const, amount: 500, note: "Sent home for school fees", logged_at: "2026-05-20" },
  { id: 10, category: "transport" as const, amount: 900, note: "Fuel for deliveries", logged_at: "2026-05-12" },
  { id: 11, category: "rent" as const, amount: 3000, note: "Monthly room rent", logged_at: "2026-05-03" },
];

export const demoSavingsBalance = 6000;

// Dated savings deposits/withdrawals — sums to demoSavingsBalance above.
// Positive = deposit ("Log savings"), negative = withdrawal ("Log savings
// used"). Used to break the running balance down by month for the trend
// chart, the same way demoPayments/demoExpenses are.
export const demoSavingsLog = [
  { amount: 2000, date: "2026-06-01" },
  { amount: 2500, date: "2026-07-01" },
  { amount: 1500, date: "2026-08-01" },
];

// Self-reported income entries via the "Log income" feature. Only covers
// the current cycle (September) — earlier months already have income
// from demoPayments (that data represents the loan's historical payment
// cycles, not self-reported logs), so adding entries there would double-
// count. This is what fills the gap for months with no payment-cycle
// record yet.
export const demoIncomeLog: { id: number; amount: number; frequency: "daily" | "weekly" | "monthly"; loggedAt: string }[] = [
  { id: 1, amount: 20000, frequency: "monthly", loggedAt: "2026-09-04" },
];

export const demoOccupation = "Gig delivery / rideshare";

export const demoGoals = [
  { id: 1, name: "New phone", target: 15000, saved: 4000 },
  { id: 2, name: "Emergency fund", target: 20000, saved: 6000 },
];

// ─── Borrower: Lenders (Platform loans + Manual ledger) ────────────────────
export const demoPlatformLoans = [
  { id: 9001, lenderName: "Suresh Kumar", targetAmount: 15000, floor: 8000, ceiling: 20000, outstanding: 42000, dueDate: "2026-09-15", status: "active" },
  { id: 9002, lenderName: "Anjali Deshmukh", targetAmount: 6000, floor: 3000, ceiling: 8000, outstanding: 12000, dueDate: "2026-09-20", status: "active" },
  { id: 9003, lenderName: "Grameen Sahakari Society", targetAmount: 5000, floor: 2000, ceiling: 5000, outstanding: 0, dueDate: "2026-03-10", status: "paid" },
];

export const demoManualLedgers = [
  {
    id: 5001,
    lenderName: "Ramesh Uncle",
    lenderPhone: "9812345670",
    lenderEmail: "",
    lenderAddress: "",
    loanAmount: 5000,
    interestRate: 0,
    startDate: "2026-05-10",
    dueDate: "2026-10-10",
    note: "Borrowed to cover a medical expense",
    status: "active" as const,
    transactions: [
      { id: 1, date: "2026-05-10", type: "loan" as const, amount: 5000, note: "Received the amount", balance: 5000 },
      { id: 2, date: "2026-07-15", type: "repayment" as const, amount: 2000, note: "Partial repayment", balance: 3000 },
    ],
  },
  {
    id: 5002,
    lenderName: "Priya Aunty",
    lenderPhone: "9800112233",
    lenderEmail: "",
    lenderAddress: "",
    loanAmount: 3000,
    interestRate: 0,
    startDate: "2026-02-01",
    dueDate: "2026-05-01",
    note: "Short-term loan, fully repaid",
    status: "paid" as const,
    transactions: [
      { id: 1, date: "2026-02-01", type: "loan" as const, amount: 3000, note: "Received the amount", balance: 3000 },
      { id: 2, date: "2026-04-15", type: "repayment" as const, amount: 3000, note: "Paid in full", balance: 0 },
    ],
  },
];

// ─── Borrower: Requests (Find lenders + My requests) ───────────────────────
export const demoLenderDirectory = [
  { id: "demo-lender", name: "Suresh Kumar", type: "Individual lender" as const, district: "Bengaluru Urban", city: "Bengaluru", rateMin: 12, rateMax: 18, maxAmount: 200000, rating: 4.6, verified: true },
  { id: "demo-lender-2", name: "Sahayata Microfinance", type: "Microfinance institution" as const, district: "Pune", city: "Pune", rateMin: 14, rateMax: 22, maxAmount: 500000, rating: 4.2, verified: true },
  { id: "demo-lender-3", name: "Anjali Deshmukh", type: "Individual lender" as const, district: "Mumbai Suburban", city: "Mumbai", rateMin: 10, rateMax: 16, maxAmount: 100000, rating: 4.8, verified: false },
  { id: "demo-lender-4", name: "Grameen Sahakari Society", type: "Cooperative society" as const, district: "Nashik", city: "Nashik", rateMin: 11, rateMax: 15, maxAmount: 300000, rating: 4.4, verified: true },
];

export const demoMyRequests = [
  {
    id: 1,
    kind: "hardship" as const,
    lenderId: "demo-lender",
    lenderName: "Suresh Kumar",
    lenderType: "Individual lender" as const,
    amount: 9000,
    purpose: "Bike broke down, lost a week of work getting it repaired",
    tenure: "This cycle only",
    sentOn: "Aug 20, 2026",
    sentOnDate: "2026-08-20",
    status: "Pending" as const,
    history: [],
  },
  {
    id: 2,
    kind: "hardship" as const,
    lenderId: "demo-lender",
    lenderName: "Suresh Kumar",
    lenderType: "Individual lender" as const,
    amount: 8000,
    purpose: "Fewer gig deliveries this month, festival season slowdown",
    tenure: "This cycle only",
    sentOn: "Jun 3, 2026",
    sentOnDate: "2026-06-03",
    status: "Approved" as const,
    history: [],
  },
  {
    id: 3,
    kind: "application" as const,
    lenderId: "demo-lender",
    lenderName: "Suresh Kumar",
    lenderType: "Individual lender" as const,
    amount: 20000,
    purpose: "Buy a delivery bike",
    tenure: "12 months",
    sentOn: "Aug 25, 2026",
    sentOnDate: "2026-08-25",
    status: "Negotiating" as const,
    history: [
      { id: 1, from: "borrower" as const, amount: 25000, note: "Would really help get a reliable bike for deliveries", date: "Aug 25, 2026" },
      { id: 2, from: "lender" as const, amount: 20000, note: "Can approve 20,000 to start — can revisit after 3 on-time cycles", date: "Aug 26, 2026" },
    ],
  },
  {
    id: 4,
    kind: "application" as const,
    lenderId: "demo-lender-2",
    lenderName: "Sahayata Microfinance",
    lenderType: "Microfinance institution" as const,
    amount: 30000,
    purpose: "Working capital for a small side business",
    tenure: "18 months",
    sentOn: "Jul 10, 2026",
    sentOnDate: "2026-07-10",
    status: "Approved" as const,
    history: [],
  },
  {
    id: 5,
    kind: "application" as const,
    lenderId: "demo-lender-4",
    lenderName: "Grameen Sahakari Society",
    lenderType: "Cooperative society" as const,
    amount: 12000,
    purpose: "Medical emergency",
    tenure: "6 months",
    sentOn: "May 2, 2026",
    sentOnDate: "2026-05-02",
    status: "Rejected" as const,
    history: [],
  },
];

// ─── Lender: PortfolioOverview ──────────────────────────────────────────────
export const demoLenderLoans = [
  { id: 9001, borrower_id: "b1", target_amount: 15000, floor: 8000, due_date: "2026-09-01", status: "active" },
  { id: 9002, borrower_id: "b2", target_amount: 9000, floor: 5000, due_date: "2026-09-03", status: "active" },
  { id: 9003, borrower_id: "b3", target_amount: 20000, floor: 12000, due_date: "2026-09-05", status: "active" },
  { id: 9004, borrower_id: "b4", target_amount: 7000, floor: 4000, due_date: "2026-08-30", status: "overdue" },
  { id: 9005, borrower_id: "b5", target_amount: 11000, floor: 6000, due_date: "2026-09-08", status: "active" },
];

export const demoBorrowerNames: Record<string, string> = {
  b1: "Rajat Sharma",
  b2: "Kavya Reddy",
  b3: "Manoj Tiwari",
  b4: "Sunita Yadav",
  b5: "Arjun Nair",
};
export const demoBorrowerOccupations: Record<string, string> = {
  b1: "Delivery Partner",
  b2: "Tailor",
  b3: "Auto Driver",
  b4: "Street Vendor",
  b5: "Freelance Photographer",
};

export const demoLenderPayments = [
  ...["2026-04-01", "2026-05-01", "2026-07-01", "2026-08-01"].flatMap((m) => [
    { loan_id: 9001, cycle_month: m, amount_due: 15000, amount_paid: 15000, paid_on_time: true },
  ]),
  { loan_id: 9001, cycle_month: "2026-06-01", amount_due: 15000, amount_paid: 8000, paid_on_time: false },
  ...["2026-04-01", "2026-05-01", "2026-06-01", "2026-07-01", "2026-08-01"].map((m) => ({
    loan_id: 9002, cycle_month: m, amount_due: 9000, amount_paid: 9000, paid_on_time: true,
  })),
  ...["2026-04-01", "2026-06-01", "2026-08-01"].map((m) => ({
    loan_id: 9003, cycle_month: m, amount_due: 20000, amount_paid: 12000, paid_on_time: true,
  })),
  ...["2026-05-01", "2026-07-01"].map((m) => ({
    loan_id: 9003, cycle_month: m, amount_due: 20000, amount_paid: 20000, paid_on_time: true,
  })),
  ...["2026-04-01", "2026-05-01", "2026-06-01", "2026-07-01"].map((m) => ({
    loan_id: 9004, cycle_month: m, amount_due: 7000, amount_paid: 4000, paid_on_time: false,
  })),
  ...["2026-04-01", "2026-05-01", "2026-06-01", "2026-07-01", "2026-08-01"].map((m) => ({
    loan_id: 9005, cycle_month: m, amount_due: 11000, amount_paid: 11000, paid_on_time: true,
  })),
];

export const demoHardshipForPortfolio = [
  { id: 1, loan_id: 9001, status: "Pending" },
  { id: 2, loan_id: 9004, status: "Pending" },
  { id: 3, loan_id: 9002, status: "Approved" },
];

// ─── Lender: Borrowers (Platform borrowers + Manual ledger) ────────────────
export const demoPlatformBorrowers = [
  { id: 9001, borrowerName: "Rajat Sharma", targetAmount: 15000, floor: 8000, ceiling: 20000, outstanding: 42000, dueDate: "2026-09-15", status: "active" },
  { id: 9002, borrowerName: "Kavya Reddy", targetAmount: 9000, floor: 5000, ceiling: 12000, outstanding: 9000, dueDate: "2026-09-03", status: "active" },
  { id: 9003, borrowerName: "Manoj Tiwari", targetAmount: 20000, floor: 12000, ceiling: 25000, outstanding: 60000, dueDate: "2026-09-05", status: "active" },
  { id: 9004, borrowerName: "Sunita Yadav", targetAmount: 7000, floor: 4000, ceiling: 9000, outstanding: 21000, dueDate: "2026-08-30", status: "overdue" },
  { id: 9005, borrowerName: "Arjun Nair", targetAmount: 11000, floor: 6000, ceiling: 15000, outstanding: 55000, dueDate: "2026-09-08", status: "active" },
  { id: 9006, borrowerName: "Deepa Iyer", targetAmount: 6000, floor: 3000, ceiling: 8000, outstanding: 0, dueDate: "2026-06-01", status: "paid" },
];

export const demoLenderManualLedgers = [
  {
    id: 6001,
    name: "Meena Devi",
    phone: "9876540011",
    email: "",
    address: "",
    loanAmount: 10000,
    interestRate: 2,
    startDate: "2026-05-01",
    dueDate: "2026-11-01",
    note: "Small tailoring business top-up",
    status: "active" as const,
    transactions: [
      { id: 1, date: "2026-05-01", type: "loan" as const, amount: 10000, note: "Initial disbursal", balance: 10000 },
      { id: 2, date: "2026-07-01", type: "repayment" as const, amount: 4000, note: "First repayment", balance: 6000 },
    ],
  },
  {
    id: 6002,
    name: "Faruk Ahmed",
    phone: "9822001199",
    email: "",
    address: "",
    loanAmount: 4000,
    interestRate: 1.5,
    startDate: "2026-03-01",
    dueDate: "2026-06-01",
    note: "Cart repair loan, fully repaid",
    status: "paid" as const,
    transactions: [
      { id: 1, date: "2026-03-01", type: "loan" as const, amount: 4000, note: "Initial disbursal", balance: 4000 },
      { id: 2, date: "2026-05-20", type: "repayment" as const, amount: 4000, note: "Paid in full", balance: 0 },
    ],
  },
];

// ─── Lender: Requests (New applications + Existing borrowers) ─────────────
export const demoApplications = [
  {
    id: 1,
    borrowerId: "b1",
    name: "Rajat Sharma",
    role: "Delivery Partner",
    requestedOn: "Aug 25, 2026",
    requestedAmount: 20000,
    purpose: "Buy a delivery bike",
    tenure: "12 months",
    status: "Negotiating" as const,
    interestRate: null,
    offers: [
      { id: 1, from: "borrower" as const, amount: 25000, note: "Would really help get a reliable bike for deliveries", date: "Aug 25, 2026" },
      { id: 2, from: "lender" as const, amount: 20000, note: "Can approve 20,000 to start — can revisit after 3 on-time cycles", date: "Aug 26, 2026" },
    ],
  },
  {
    id: 2,
    borrowerId: "b6",
    name: "Neha Kulkarni",
    role: "Home Baker",
    requestedOn: "Aug 28, 2026",
    requestedAmount: 15000,
    purpose: "New oven for baking orders",
    tenure: "9 months",
    status: "Pending" as const,
    interestRate: null,
    offers: [],
  },
  {
    id: 3,
    borrowerId: "b7",
    name: "Vikram Singh",
    role: "Auto Driver",
    requestedOn: "Aug 20, 2026",
    requestedAmount: 18000,
    purpose: "Vehicle maintenance",
    tenure: "12 months",
    status: "Approved" as const,
    interestRate: 14,
    offers: [],
  },
  {
    id: 4,
    borrowerId: "b8",
    name: "Farhan Sheikh",
    role: "Street Vendor",
    requestedOn: "Aug 5, 2026",
    requestedAmount: 25000,
    purpose: "Expand cart inventory",
    tenure: "12 months",
    status: "Rejected" as const,
    interestRate: null,
    offers: [],
  },
];

export const demoHardshipRequests = [
  {
    id: 1,
    loanRowId: 9001,
    name: "Rajat Sharma",
    role: "Delivery Partner",
    loanId: "LN-9001",
    reason: "Bike broke down, lost a week of work getting it repaired",
    requestedOn: "Aug 20, 2026",
    currentPayment: 15000,
    requestedPayment: 9000,
    repeat: false,
    status: "Pending" as const,
  },
  {
    id: 2,
    loanRowId: 9004,
    name: "Sunita Yadav",
    role: "Street Vendor",
    loanId: "LN-9004",
    reason: "Local market closed for repairs, no sales for two weeks",
    requestedOn: "Aug 22, 2026",
    currentPayment: 7000,
    requestedPayment: 4000,
    repeat: true,
    status: "Pending" as const,
  },
  {
    id: 3,
    loanRowId: 9002,
    name: "Kavya Reddy",
    role: "Tailor",
    loanId: "LN-9002",
    reason: "Fewer gig deliveries this month, festival season slowdown",
    requestedOn: "Jun 3, 2026",
    currentPayment: 9000,
    requestedPayment: 5000,
    repeat: false,
    status: "Approved" as const,
  },
];

// ─── Lender: Audit Log ──────────────────────────────────────────────────────
export const demoAuditEntries = [
  { id: 1, actorName: "You", action: "Approved" as const, actionText: "Approved hardship request for", entity: "Kavya Reddy (₹5,000)", createdAt: "2026-06-04" },
  { id: 2, actorName: "Rajat Sharma", action: "Created" as const, actionText: "Submitted a new loan application for", entity: "₹25,000", createdAt: "2026-08-25" },
  { id: 3, actorName: "You", action: "Modified" as const, actionText: "Countered loan application offer for", entity: "₹20,000", createdAt: "2026-08-26" },
  { id: 4, actorName: "Vikram Singh", action: "Created" as const, actionText: "Submitted a new loan application for", entity: "₹18,000", createdAt: "2026-08-20" },
  { id: 5, actorName: "You", action: "Approved" as const, actionText: "Approved loan application for", entity: "Vikram Singh (₹18,000)", createdAt: "2026-08-21" },
  { id: 6, actorName: "Farhan Sheikh", action: "Created" as const, actionText: "Submitted a new loan application for", entity: "₹25,000", createdAt: "2026-08-05" },
  { id: 7, actorName: "You", action: "Rejected" as const, actionText: "Rejected loan application for", entity: "Farhan Sheikh", createdAt: "2026-08-06" },
  { id: 8, actorName: "Sunita Yadav", action: "Created" as const, actionText: "Submitted a hardship request for", entity: "LN-9004", createdAt: "2026-08-22" },
  { id: 9, actorName: "You", action: "Flagged" as const, actionText: "Flagged repeat hardship pattern for", entity: "Sunita Yadav", createdAt: "2026-08-22" },
  { id: 10, actorName: "You", action: "Modified" as const, actionText: "Adjusted floor amount for", entity: "LN-9003 (Manoj Tiwari)", createdAt: "2026-07-15" },
];