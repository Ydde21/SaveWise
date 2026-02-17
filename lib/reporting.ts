import { calculateMonthlyPayment } from "@/lib/interest";
import {
  Expense,
  ExpenseCategory,
  GoalFeasibility,
  Income,
  Loan,
  LoanPayment,
  MonthKey,
  ReportExpenseSlice,
  ReportInsight,
  ReportKpi,
  ReportMonthlyPoint,
  ReportRangeKey,
  ReportSnapshot,
  SavingsGoal,
  Wallet,
} from "@/lib/types";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const REPORT_RANGE_MONTHS: Record<ReportRangeKey, number> = {
  "1M": 1,
  "3M": 3,
  "6M": 6,
  "12M": 12,
};

interface ReportInputs {
  range: ReportRangeKey;
  wallets: Wallet[];
  // Income contract: true earnings only (salary/freelance/gifts), not transfers/deposits.
  incomes: Income[];
  // Expense contract: accrual/purchase-time spending, regardless of payment method.
  expenses: Expense[];
  loans: Loan[];
  // Loan payment contract: cash payments reducing debt, not transfers and not duplicate expenses.
  loanPayments: LoanPayment[];
  goals: SavingsGoal[];
  asOf?: Date;
  expenseCategories?: ExpenseCategory[];
}

const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategory[] = [];

interface Delta {
  absolute: number | null;
  percent: number | null;
}

interface Totals {
  income: number;
  expenses: number;
  loanPayments: number;
  netFlow: number;
}

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

interface DateInfo {
  monthKey: MonthKey;
  timestamp: number;
  isDateOnly: boolean;
  dateKey: string;
}

function parseDate(value: string): Date | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addUtcMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function daysInUtcMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function addUtcMonthsKeepingDay(date: Date, months: number): Date {
  const monthBase = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + months,
      1,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds()
    )
  );
  const year = monthBase.getUTCFullYear();
  const month = monthBase.getUTCMonth();
  const day = Math.min(date.getUTCDate(), daysInUtcMonth(year, month));
  return new Date(
    Date.UTC(
      year,
      month,
      day,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds()
    )
  );
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function monthKeyFromDate(date: Date): MonthKey {
  return `${date.getUTCFullYear()}-${`${date.getUTCMonth() + 1}`.padStart(2, "0")}`;
}

function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
}

function parseDateInfo(raw: string): DateInfo | null {
  if (DATE_ONLY_REGEX.test(raw)) {
    const [yearRaw, monthRaw, dayRaw] = raw.split("-");
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const day = Number(dayRaw);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      return null;
    }
    const localNoon = new Date(year, month - 1, day, 12, 0, 0, 0);
    return {
      monthKey: `${yearRaw}-${monthRaw}`,
      timestamp: localNoon.getTime(),
      isDateOnly: true,
      dateKey: raw,
    };
  }

  const parsed = parseDate(raw);
  if (!parsed) return null;
  return {
    monthKey: monthKeyFromDate(parsed),
    timestamp: parsed.getTime(),
    isDateOnly: false,
    dateKey: parsed.toISOString().slice(0, 10),
  };
}

function monthLabelFromKey(monthKey: MonthKey): string {
  const [yearRaw, monthRaw] = monthKey.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return monthKey;
  }
  return `${MONTH_LABELS[month - 1]} ${String(year).slice(2)}`;
}

function buildRollingMonthKeys(
  range: ReportRangeKey,
  asOf: Date
): { current: MonthKey[]; previous: MonthKey[] } {
  const monthCount = REPORT_RANGE_MONTHS[range];
  const currentStart = startOfUtcMonth(asOf);
  const previousStart = addUtcMonths(currentStart, -monthCount);

  const current: MonthKey[] = [];
  const previous: MonthKey[] = [];
  for (let i = monthCount - 1; i >= 0; i -= 1) {
    current.push(monthKeyFromDate(addUtcMonths(currentStart, -i)));
    previous.push(monthKeyFromDate(addUtcMonths(previousStart, -i)));
  }

  return { current, previous };
}

function sumByMonthInWindow<T>(params: {
  items: T[];
  monthKeys: MonthKey[];
  getDate: (item: T) => string;
  getAmount: (item: T) => number;
  asOfDate: Date;
  truncateCurrentMonthToAsOf: boolean;
}): Map<MonthKey, number> {
  const { items, monthKeys, getDate, getAmount, asOfDate, truncateCurrentMonthToAsOf } = params;
  const allowedKeys = new Set(monthKeys);
  const currentMonthKey = monthKeys[monthKeys.length - 1] ?? null;
  const asOfLocalDateKey = toLocalDateKey(asOfDate);
  const map = new Map<MonthKey, number>();

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const dateInfo = parseDateInfo(getDate(item));
    if (!dateInfo) continue;
    const monthKey = dateInfo.monthKey;
    if (!allowedKeys.has(monthKey)) continue;

    if (
      truncateCurrentMonthToAsOf &&
      currentMonthKey !== null &&
      monthKey === currentMonthKey
    ) {
      if (dateInfo.isDateOnly) {
        if (dateInfo.dateKey > asOfLocalDateKey) continue;
      } else if (dateInfo.timestamp > asOfDate.getTime()) {
        continue;
      }
    }

    const amount = getAmount(item);
    if (!Number.isFinite(amount)) continue;
    map.set(monthKey, (map.get(monthKey) ?? 0) + amount);
  }

  return map;
}

function buildMonthlySeries(
  monthKeys: MonthKey[],
  incomeByMonth: Map<MonthKey, number>,
  expenseByMonth: Map<MonthKey, number>,
  loanPaymentByMonth: Map<MonthKey, number>
): ReportMonthlyPoint[] {
  return monthKeys.map((monthKey) => {
    const income = incomeByMonth.get(monthKey) ?? 0;
    const expenses = expenseByMonth.get(monthKey) ?? 0;
    const loanPayments = loanPaymentByMonth.get(monthKey) ?? 0;
    const netFlow = income - expenses - loanPayments;
    return {
      monthKey,
      label: monthLabelFromKey(monthKey),
      income: round2(income),
      expenses: round2(expenses),
      loanPayments: round2(loanPayments),
      netFlow: round2(netFlow),
    };
  });
}

function totalsFromSeries(series: ReportMonthlyPoint[]): Totals {
  return {
    income: round2(series.reduce((sum, item) => sum + item.income, 0)),
    expenses: round2(series.reduce((sum, item) => sum + item.expenses, 0)),
    loanPayments: round2(series.reduce((sum, item) => sum + item.loanPayments, 0)),
    netFlow: round2(series.reduce((sum, item) => sum + item.netFlow, 0)),
  };
}

function averageTotals(totals: Totals, months: number): Totals {
  return {
    income: round2(totals.income / months),
    expenses: round2(totals.expenses / months),
    loanPayments: round2(totals.loanPayments / months),
    netFlow: round2(totals.netFlow / months),
  };
}

function safeRatio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

function getDelta(current: number | null, previous: number | null): Delta {
  if (current === null || previous === null) {
    return { absolute: null, percent: null };
  }
  const absolute = current - previous;
  const percent = previous === 0 ? null : absolute / Math.abs(previous);
  return { absolute: round2(absolute), percent };
}

function resolveExpenseBreakdown(params: {
  expenses: Expense[];
  monthKeys: MonthKey[];
  categories: ExpenseCategory[];
  asOfDate: Date;
}): { breakdown: ReportExpenseSlice[]; top: ReportExpenseSlice | null } {
  const { expenses, monthKeys, categories, asOfDate } = params;
  const allowedKeys = new Set(monthKeys);
  const currentMonthKey = monthKeys[monthKeys.length - 1] ?? null;
  const asOfLocalDateKey = toLocalDateKey(asOfDate);
  const totalsByCategory = new Map<string, number>();

  for (let i = 0; i < expenses.length; i += 1) {
    const item = expenses[i];
    const dateInfo = parseDateInfo(item.date);
    if (!dateInfo) continue;
    const monthKey = dateInfo.monthKey;
    if (!allowedKeys.has(monthKey)) continue;
    if (currentMonthKey !== null && monthKey === currentMonthKey) {
      if (dateInfo.isDateOnly) {
        if (dateInfo.dateKey > asOfLocalDateKey) continue;
      } else if (dateInfo.timestamp > asOfDate.getTime()) {
        continue;
      }
    }

    totalsByCategory.set(item.category, (totalsByCategory.get(item.category) ?? 0) + item.amount);
  }

  const knownKeys = new Set<string>();
  const slices: ReportExpenseSlice[] = categories.map((category) => {
    knownKeys.add(category.key);
    return {
      key: category.key,
      label: category.label,
      color: category.color,
      value: round2(totalsByCategory.get(category.key) ?? 0),
      share: null,
    };
  });

  totalsByCategory.forEach((value, key) => {
    if (knownKeys.has(key)) return;
    slices.push({
      key,
      label: key,
      color: "#6B7280",
      value: round2(value),
      share: null,
    });
  });

  const total = slices.reduce((sum, item) => sum + item.value, 0);
  const normalized = slices
    .map((slice) => ({
      ...slice,
      share: total > 0 ? slice.value / total : null,
    }))
    .sort((a, b) => b.value - a.value);

  return {
    breakdown: normalized,
    top: normalized.find((slice) => slice.value > 0) ?? null,
  };
}

function isActiveLoan(loan: Loan, asOfDate: Date): boolean {
  if (!Number.isFinite(loan.balance) || loan.balance <= 0) return false;
  if (!Number.isFinite(loan.termMonths) || loan.termMonths <= 0) return false;
  const startDate = parseDate(loan.startDate);
  if (!startDate) return false;
  return startDate.getTime() <= asOfDate.getTime();
}

function resolveScheduledMonthlyPayment(loan: Loan): number | null {
  const storedMonthlyPayment =
    "monthlyPayment" in loan && typeof loan.monthlyPayment === "number"
      ? loan.monthlyPayment
      : null;
  if (
    storedMonthlyPayment !== null &&
    Number.isFinite(storedMonthlyPayment) &&
    storedMonthlyPayment > 0
  ) {
    return storedMonthlyPayment;
  }

  if (!Number.isFinite(loan.principal) || loan.principal <= 0) return null;
  if (!Number.isFinite(loan.interestRate) || loan.interestRate < 0) return null;
  if (!Number.isFinite(loan.termMonths) || loan.termMonths <= 0) return null;

  if (loan.interestRate === 0) {
    return loan.principal / loan.termMonths;
  }

  const payment = calculateMonthlyPayment(loan.principal, loan.interestRate, loan.termMonths);
  if (!Number.isFinite(payment) || payment <= 0) return null;
  return payment;
}

function monthsLeftToDeadline(deadlineIso: string, asOfDate: Date): number {
  const deadline = parseDate(deadlineIso);
  if (!deadline) return 1;
  if (deadline.getTime() <= asOfDate.getTime()) return 1;

  let wholeMonths =
    (deadline.getUTCFullYear() - asOfDate.getUTCFullYear()) * 12 +
    (deadline.getUTCMonth() - asOfDate.getUTCMonth());
  if (wholeMonths < 0) return 1;

  let anchor = addUtcMonthsKeepingDay(asOfDate, wholeMonths);
  if (anchor.getTime() > deadline.getTime()) {
    wholeMonths -= 1;
    anchor = addUtcMonthsKeepingDay(asOfDate, wholeMonths);
  }

  const hasPartialMonth = deadline.getTime() > anchor.getTime();
  return Math.max(1, wholeMonths + (hasPartialMonth ? 1 : 0));
}

function resolveEffectiveGoalCurrentAmount(
  goal: SavingsGoal,
  walletById: Map<string, Wallet>
): number {
  if (goal.walletId) {
    const linkedWallet = walletById.get(goal.walletId);
    if (linkedWallet && Number.isFinite(linkedWallet.balance)) {
      return linkedWallet.balance;
    }
  }
  return Number.isFinite(goal.currentAmount) ? goal.currentAmount : 0;
}

function resolveGoalFeasibility(params: {
  goals: SavingsGoal[];
  walletById: Map<string, Wallet>;
  asOfDate: Date;
  availableCapacity: number;
}): GoalFeasibility[] {
  const { goals, walletById, asOfDate, availableCapacity } = params;
  const currentMonthStart = startOfUtcMonth(asOfDate);

  return goals
    .map((goal) => {
      const effectiveCurrent = resolveEffectiveGoalCurrentAmount(goal, walletById);
      const remainingAmount = Math.max(0, goal.targetAmount - effectiveCurrent);
      const monthsLeft = monthsLeftToDeadline(goal.deadline, asOfDate);
      const requiredMonthly = remainingAmount > 0 ? remainingAmount / monthsLeft : 0;

      let status: GoalFeasibility["status"] = "on_track";
      if (remainingAmount > 0) {
        if (requiredMonthly <= availableCapacity * 0.9) {
          status = "on_track";
        } else if (requiredMonthly <= availableCapacity * 1.2) {
          status = "at_risk";
        } else {
          status = "off_track";
        }
      }

      let etaMonthKey: MonthKey | null = null;
      if (remainingAmount <= 0) {
        etaMonthKey = monthKeyFromDate(currentMonthStart);
      } else if (availableCapacity > 0) {
        const etaMonths = Math.ceil(remainingAmount / Math.max(availableCapacity, 1));
        etaMonthKey = monthKeyFromDate(addUtcMonths(currentMonthStart, etaMonths));
      }

      return {
        goalId: goal.id,
        goalName: goal.name,
        targetAmount: round2(goal.targetAmount),
        currentAmount: round2(effectiveCurrent),
        remainingAmount: round2(remainingAmount),
        monthsLeft,
        requiredMonthly: round2(requiredMonthly),
        availableCapacity: round2(availableCapacity),
        status,
        etaMonthKey,
      };
    })
    .sort((a, b) => {
      const order: Record<GoalFeasibility["status"], number> = {
        off_track: 0,
        at_risk: 1,
        on_track: 2,
      };
      return order[a.status] - order[b.status];
    });
}

function buildExecutiveKpis(args: {
  totalsCurrent: Totals;
  totalsPrevious: Totals;
  savingsRate: number | null;
  savingsRatePrev: number | null;
  expenseToIncomeRatio: number | null;
  expenseToIncomePrev: number | null;
  debtServiceRatio: number | null;
  debtServiceRatioPrev: number | null;
}): ReportKpi[] {
  const {
    totalsCurrent,
    totalsPrevious,
    savingsRate,
    savingsRatePrev,
    expenseToIncomeRatio,
    expenseToIncomePrev,
    debtServiceRatio,
    debtServiceRatioPrev,
  } = args;

  const incomeDelta = getDelta(totalsCurrent.income, totalsPrevious.income);
  const netFlowDelta = getDelta(totalsCurrent.netFlow, totalsPrevious.netFlow);
  const savingsRateDelta = getDelta(savingsRate, savingsRatePrev);
  const expenseRatioDelta = getDelta(expenseToIncomeRatio, expenseToIncomePrev);
  const dsrDelta = getDelta(debtServiceRatio, debtServiceRatioPrev);

  return [
    {
      key: "net_flow",
      label: "Net Flow",
      value: totalsCurrent.netFlow,
      format: "currency",
      subtitle: "income - expenses - loan payments",
      deltaAbsolute: netFlowDelta.absolute,
      deltaPercent: netFlowDelta.percent,
      higherIsBetter: true,
    },
    {
      key: "income",
      label: "Income",
      value: totalsCurrent.income,
      format: "currency",
      subtitle: "total for selected period",
      deltaAbsolute: incomeDelta.absolute,
      deltaPercent: incomeDelta.percent,
      higherIsBetter: true,
    },
    {
      key: "savings_rate",
      label: "Savings Rate",
      value: savingsRate,
      format: "percent",
      subtitle: "net flow as % of income",
      deltaAbsolute: savingsRateDelta.absolute,
      deltaPercent: savingsRateDelta.percent,
      higherIsBetter: true,
    },
    {
      key: "expense_ratio",
      label: "Expense-to-Income",
      value: expenseToIncomeRatio,
      format: "percent",
      subtitle: "lower is better",
      deltaAbsolute: expenseRatioDelta.absolute,
      deltaPercent: expenseRatioDelta.percent,
      higherIsBetter: false,
    },
    {
      key: "debt_service_ratio",
      label: "Debt Service Ratio",
      value: debtServiceRatio,
      format: "percent",
      subtitle: "scheduled debt vs avg income",
      deltaAbsolute: dsrDelta.absolute,
      deltaPercent: dsrDelta.percent,
      higherIsBetter: false,
    },
  ];
}

function buildInsights(params: {
  savingsRate: number | null;
  debtServiceRatio: number | null;
  topExpenseCategory: ReportExpenseSlice | null;
  goalFeasibility: GoalFeasibility[];
  netFlowDelta: Delta;
}): ReportInsight[] {
  const { savingsRate, debtServiceRatio, topExpenseCategory, goalFeasibility, netFlowDelta } =
    params;
  const insights: ReportInsight[] = [];

  if (savingsRate !== null && savingsRate < 0.1) {
    insights.push({
      id: "low-savings-rate",
      title: "Low savings rate",
      detail:
        "Net savings are below 10% of income in this period. Consider trimming discretionary spending.",
      severity: "warning",
    });
  }

  if (debtServiceRatio !== null && debtServiceRatio > 0.35) {
    insights.push({
      id: "high-dsr",
      title: "Debt pressure is high",
      detail:
        "Debt service exceeds 35% of average monthly income. Prioritize payoff or refinancing.",
      severity: "danger",
    });
  }

  if (topExpenseCategory && topExpenseCategory.share !== null && topExpenseCategory.share > 0.4) {
    insights.push({
      id: "expense-concentration",
      title: "Expense concentration risk",
      detail: `${topExpenseCategory.label} is over 40% of expenses. Diversify or cap this category.`,
      severity: "warning",
    });
  }

  const offTrackCount = goalFeasibility.filter((item) => item.status === "off_track").length;
  if (offTrackCount > 0) {
    insights.push({
      id: "goals-off-track",
      title: "Goals need adjustment",
      detail: `${offTrackCount} goal${offTrackCount > 1 ? "s are" : " is"} off-track. Increase contribution pace or extend timeline.`,
      severity: "warning",
    });
  }

  if (netFlowDelta.percent !== null && netFlowDelta.percent >= 0.15) {
    insights.push({
      id: "netflow-momentum",
      title: "Positive momentum",
      detail: "Net flow improved by at least 15% versus the previous period.",
      severity: "positive",
    });
  }

  if (!insights.length) {
    insights.push({
      id: "stable-performance",
      title: "Performance is stable",
      detail: "No high-risk signals triggered in this period. Continue monitoring trends.",
      severity: "info",
    });
  }

  return insights;
}

export function buildReportSnapshot(inputs: ReportInputs): ReportSnapshot {
  const {
    range,
    wallets,
    incomes,
    expenses,
    loans,
    loanPayments,
    goals,
    asOf = new Date(),
    expenseCategories = DEFAULT_EXPENSE_CATEGORIES,
  } = inputs;
  const asOfDate = new Date(asOf);
  const { current: monthKeys, previous: previousMonthKeys } = buildRollingMonthKeys(range, asOfDate);
  const monthCount = REPORT_RANGE_MONTHS[range];

  const incomeByMonth = sumByMonthInWindow({
    items: incomes,
    monthKeys,
    getDate: (item) => item.date,
    getAmount: (item) => item.amount,
    asOfDate,
    truncateCurrentMonthToAsOf: true,
  });
  const expenseByMonth = sumByMonthInWindow({
    items: expenses,
    monthKeys,
    getDate: (item) => item.date,
    getAmount: (item) => item.amount,
    asOfDate,
    truncateCurrentMonthToAsOf: true,
  });
  const loanPaymentByMonth = sumByMonthInWindow({
    items: loanPayments,
    monthKeys,
    getDate: (item) => item.paymentDate,
    getAmount: (item) => item.amount,
    asOfDate,
    truncateCurrentMonthToAsOf: true,
  });

  const previousIncomeByMonth = sumByMonthInWindow({
    items: incomes,
    monthKeys: previousMonthKeys,
    getDate: (item) => item.date,
    getAmount: (item) => item.amount,
    asOfDate,
    truncateCurrentMonthToAsOf: false,
  });
  const previousExpenseByMonth = sumByMonthInWindow({
    items: expenses,
    monthKeys: previousMonthKeys,
    getDate: (item) => item.date,
    getAmount: (item) => item.amount,
    asOfDate,
    truncateCurrentMonthToAsOf: false,
  });
  const previousLoanPaymentByMonth = sumByMonthInWindow({
    items: loanPayments,
    monthKeys: previousMonthKeys,
    getDate: (item) => item.paymentDate,
    getAmount: (item) => item.amount,
    asOfDate,
    truncateCurrentMonthToAsOf: false,
  });

  const monthlySeries = buildMonthlySeries(monthKeys, incomeByMonth, expenseByMonth, loanPaymentByMonth);
  const previousMonthlySeries = buildMonthlySeries(
    previousMonthKeys,
    previousIncomeByMonth,
    previousExpenseByMonth,
    previousLoanPaymentByMonth
  );

  const totalsCurrent = totalsFromSeries(monthlySeries);
  const totalsPrevious = totalsFromSeries(previousMonthlySeries);
  const averagesCurrent = averageTotals(totalsCurrent, monthCount);
  const averagesPrevious = averageTotals(totalsPrevious, monthCount);

  const activeLoans = loans.filter((loan) => isActiveLoan(loan, asOfDate));
  const scheduledMonthlyLoanPayment = round2(
    activeLoans.reduce((sum, loan) => {
      const payment = resolveScheduledMonthlyPayment(loan);
      return payment === null ? sum : sum + payment;
    }, 0)
  );

  const savingsRate = safeRatio(totalsCurrent.netFlow, totalsCurrent.income);
  const savingsRatePrev = safeRatio(totalsPrevious.netFlow, totalsPrevious.income);
  const expenseToIncomeRatio = safeRatio(totalsCurrent.expenses, totalsCurrent.income);
  const expenseToIncomePrev = safeRatio(totalsPrevious.expenses, totalsPrevious.income);
  const debtServiceRatio = safeRatio(scheduledMonthlyLoanPayment, averagesCurrent.income);
  const debtServiceRatioPrev = safeRatio(scheduledMonthlyLoanPayment, averagesPrevious.income);

  const weightedAprBase = activeLoans.reduce(
    (acc, loan) => {
      if (!Number.isFinite(loan.interestRate) || loan.interestRate < 0) return acc;
      acc.balance += loan.balance;
      acc.weightedRate += loan.balance * loan.interestRate;
      return acc;
    },
    { balance: 0, weightedRate: 0 }
  );
  const weightedApr =
    weightedAprBase.balance > 0 ? weightedAprBase.weightedRate / weightedAprBase.balance : null;

  const { breakdown: expenseBreakdown, top: topExpenseCategory } = resolveExpenseBreakdown({
    expenses,
    monthKeys,
    categories: expenseCategories,
    asOfDate,
  });

  const availableCapacity = Math.max(
    0,
    averagesCurrent.income - averagesCurrent.expenses - scheduledMonthlyLoanPayment
  );
  const walletById = new Map(wallets.map((wallet) => [wallet.id, wallet] as const));
  const goalFeasibility = resolveGoalFeasibility({
    goals,
    walletById,
    asOfDate,
    availableCapacity,
  });
  const netFlowDelta = getDelta(totalsCurrent.netFlow, totalsPrevious.netFlow);

  const insights = buildInsights({
    savingsRate,
    debtServiceRatio,
    topExpenseCategory,
    goalFeasibility,
    netFlowDelta,
  });

  const executiveKpis = buildExecutiveKpis({
    totalsCurrent,
    totalsPrevious,
    savingsRate,
    savingsRatePrev,
    expenseToIncomeRatio,
    expenseToIncomePrev,
    debtServiceRatio,
    debtServiceRatioPrev,
  });

  return {
    range,
    asOfIso: asOfDate.toISOString(),
    monthKeys,
    previousMonthKeys,
    monthlySeries,
    previousMonthlySeries,
    totalsCurrent,
    totalsPrevious,
    averagesCurrent,
    averagesPrevious,
    scheduledMonthlyLoanPayment,
    savingsRate,
    expenseToIncomeRatio,
    debtServiceRatio,
    weightedApr: weightedApr === null ? null : round2(weightedApr),
    topExpenseCategory,
    expenseBreakdown,
    goalFeasibility,
    insights,
    executiveKpis,
  };
}
