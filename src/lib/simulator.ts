export type Borrower = {
  id: string;
  name: string;
  firstName: string;
  loanId: string;
  target: number;
  baseIncome: number;
  floor: number;
  ceiling: number;
  deferredBalance: number;
  floorHits: number;
  floorHitWindow: number;
  hardshipRequests: number;
};

export const BORROWERS: Borrower[] = [
  {
    id: "ar-1042",
    name: "Ananya Rao",
    firstName: "Ananya",
    loanId: "AR-1042",
    target: 5000,
    baseIncome: 12500,
    floor: 2000,
    ceiling: 7000,
    deferredBalance: 3200,
    floorHits: 2,
    floorHitWindow: 3,
    hardshipRequests: 1,
  },
  {
    id: "ar-1088",
    name: "Rahul Mehta",
    firstName: "Rahul",
    loanId: "AR-1088",
    target: 7500,
    baseIncome: 18000,
    floor: 3000,
    ceiling: 9000,
    deferredBalance: 0,
    floorHits: 0,
    floorHitWindow: 3,
    hardshipRequests: 0,
  },
  {
    id: "ar-1103",
    name: "Priya Nair",
    firstName: "Priya",
    loanId: "AR-1103",
    target: 4200,
    baseIncome: 11000,
    floor: 1800,
    ceiling: 6000,
    deferredBalance: 5600,
    floorHits: 3,
    floorHitWindow: 4,
    hardshipRequests: 2,
  },
];

export const PORTFOLIO = {
  activeLoans: 1248,
  avgTarget: 5400,
  avgIncome: 13500,
  collectionRate: 96.2,
  totalDeferred: 1840000,
};

export type Severity = "good" | "warn" | "bad";

export function inr(value: number, decimals = 0) {
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function computeAllowed(opts: {
  target: number;
  income: number;
  floor: number;
  ceiling: number;
}) {
  const capacity = opts.income * 0.4;
  const belowFloor = capacity < opts.floor;
  const allowed = Math.min(opts.ceiling, Math.min(opts.target, Math.max(opts.floor, capacity)));
  return { allowed: Math.round(allowed), belowFloor, capacity };
}

export function simulateIndividual(b: Borrower, shock: number, floor: number, ceiling: number) {
  const income = b.baseIncome * (1 - shock / 100);
  const { allowed, belowFloor, capacity } = computeAllowed({
    target: b.target,
    income,
    floor,
    ceiling,
  });
  const deferred = Math.max(0, b.target - allowed);
  const extraMonths = Math.ceil(deferred / b.target);
  const severity: Severity = shock >= 80 ? "bad" : shock >= 40 || belowFloor ? "warn" : "good";
  return { income, allowed, belowFloor, capacity, deferred, extraMonths, severity };
}

export function simulatePortfolio(
  shock: number,
  floor: number,
  ceiling: number,
  affectedShare: number,
) {
  const affectedLoans = Math.round(PORTFOLIO.activeLoans * (affectedShare / 100));
  const unaffected = PORTFOLIO.activeLoans - affectedLoans;
  const income = PORTFOLIO.avgIncome * (1 - shock / 100);
  const { allowed, belowFloor, capacity } = computeAllowed({
    target: PORTFOLIO.avgTarget,
    income,
    floor,
    ceiling,
  });
  const newDeferred = Math.max(0, PORTFOLIO.avgTarget - allowed) * affectedLoans;
  const collectionRate =
    ((unaffected * PORTFOLIO.avgTarget + affectedLoans * allowed) /
      (PORTFOLIO.activeLoans * PORTFOLIO.avgTarget)) *
    100;
  const scaled = Math.min(collectionRate, PORTFOLIO.collectionRate);
  const drop = PORTFOLIO.collectionRate - scaled;
  const exceptions = Math.round(affectedLoans * (belowFloor ? 0.35 : 0.08));
  const severity: Severity = drop >= 6 ? "bad" : drop >= 2 ? "warn" : "good";
  return {
    affectedLoans,
    income,
    allowed,
    belowFloor,
    capacity,
    newDeferred,
    collectionRate: scaled,
    drop,
    exceptions,
    severity,
  };
}
