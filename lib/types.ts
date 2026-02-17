export type CompoundingFrequency =
  | "daily"
  | "monthly"
  | "quarterly"
  | "annually";

export interface Wallet {
  id: string;
  userId: string;
  name: string;
  balance: number;
  interestRate: number;
  compoundingFrequency: CompoundingFrequency;
  currency: string;
  color: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  walletId: string;
  type: "deposit" | "withdrawal";
  amount: number;
  note: string;
  date: string;
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  walletId: string | null;
  icon: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export type ExpenseRecurrence = "none" | "monthly";

export interface Expense {
  id: string;
  userId: string;
  category: string;
  // Expense is recorded at purchase/accrual time regardless of payment method.
  amount: number;
  note: string;
  date: string;
  createdAt: string;
  recurrence?: ExpenseRecurrence;
  recurrenceEndDate?: string | null;
  paidMonths?: string[];
  recurrenceSourceId?: string;
  paidMonthKey?: MonthKey;
  isRecurringProjection?: boolean;
}

export interface Income {
  id: string;
  userId: string;
  source: string;
  // Income is true earnings only (salary/freelance/gifts), not transfers/deposits.
  amount: number;
  note: string;
  date: string;
  createdAt: string;
}

export interface Loan {
  id: string;
  userId: string;
  lender: string;
  principal: number;
  // Annual APR percent (e.g. 12 means 12% per year).
  interestRate: number;
  termMonths: number;
  startDate: string;
  balance: number;
  // Optional stored scheduled monthly payment; reporting falls back to amortization when absent.
  monthlyPayment?: number | null;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoanPayment {
  id: string;
  userId: string;
  loanId: string;
  // Cash payment applied to debt (principal/interest), including card bill payments.
  amount: number;
  paymentDate: string;
  note: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: "monthly" | "yearly" | "lifetime";
  status: "active" | "inactive" | "canceled" | "expired";
  source: string;
  provider: string | null;
  productId: string | null;
  transactionId: string | null;
  lastVerifiedAt: string | null;
  startedAt: string;
  expiresAt: string | null;
  lifetime: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  totalSavings: number;
  totalExpenses: number;
  totalIncome: number;
  outstandingLoans: number;
  netBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyCashflow: number;
  goalsTargetTotal: number;
  goalsCurrentTotal: number;
}

export type ReportRangeKey = "1M" | "3M" | "6M" | "12M";
// Canonical UTC month key format: YYYY-MM.
export type MonthKey = string;

export type ReportValueFormat = "currency" | "percent" | "number";

export interface ReportMonthlyPoint {
  monthKey: MonthKey;
  label: string;
  income: number;
  expenses: number;
  loanPayments: number;
  netFlow: number;
}

export interface ReportKpi {
  key: string;
  label: string;
  value: number | null;
  format: ReportValueFormat;
  subtitle?: string;
  deltaAbsolute: number | null;
  deltaPercent: number | null;
  higherIsBetter?: boolean;
}

export type GoalFeasibilityStatus = "on_track" | "at_risk" | "off_track";

export interface GoalFeasibility {
  goalId: string;
  goalName: string;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  monthsLeft: number;
  requiredMonthly: number;
  availableCapacity: number;
  status: GoalFeasibilityStatus;
  etaMonthKey: MonthKey | null;
}

export type ReportInsightSeverity = "positive" | "warning" | "danger" | "info";

export interface ReportInsight {
  id: string;
  title: string;
  detail: string;
  severity: ReportInsightSeverity;
}

export interface ReportExpenseSlice {
  key: string;
  label: string;
  color: string;
  value: number;
  share: number | null;
}

export interface ReportSnapshot {
  range: ReportRangeKey;
  asOfIso: string;
  monthKeys: MonthKey[];
  previousMonthKeys: MonthKey[];
  monthlySeries: ReportMonthlyPoint[];
  previousMonthlySeries: ReportMonthlyPoint[];
  totalsCurrent: {
    income: number;
    expenses: number;
    loanPayments: number;
    netFlow: number;
  };
  totalsPrevious: {
    income: number;
    expenses: number;
    loanPayments: number;
    netFlow: number;
  };
  averagesCurrent: {
    income: number;
    expenses: number;
    loanPayments: number;
    netFlow: number;
  };
  averagesPrevious: {
    income: number;
    expenses: number;
    loanPayments: number;
    netFlow: number;
  };
  scheduledMonthlyLoanPayment: number;
  savingsRate: number | null;
  expenseToIncomeRatio: number | null;
  debtServiceRatio: number | null;
  weightedApr: number | null;
  topExpenseCategory: ReportExpenseSlice | null;
  expenseBreakdown: ReportExpenseSlice[];
  goalFeasibility: GoalFeasibility[];
  insights: ReportInsight[];
  executiveKpis: ReportKpi[];
}

export interface ExpenseCategory {
  key: string;
  label: string;
  icon: string;
  color: string;
}

export interface FreePlanStatus {
  limits: {
    wallets: number;
    goals: number;
    loans: number;
    monthlyTransactions: number;
    monthlyExpenses: number;
    monthlyIncomeLogs: number;
    monthlyLoanPayments: number;
  };
  usage: {
    wallets: number;
    goals: number;
    loans: number;
    monthlyTransactions: number;
    monthlyExpenses: number;
    monthlyIncomeLogs: number;
    monthlyLoanPayments: number;
  };
  canCreateWallet: boolean;
  canCreateGoal: boolean;
  canCreateLoan: boolean;
  canCreateTransaction: boolean;
  canCreateExpense: boolean;
  canCreateIncome: boolean;
  canCreateLoanPayment: boolean;
}
