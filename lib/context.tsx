import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import NetInfo from "@react-native-community/netinfo";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  buildEffectiveExpenses,
  getExpenseRecurrence,
  getUtcMonthKey,
  isRecurringExpenseActiveForMonth,
  normalizeMonthKeys,
  upsertPaidMonth,
} from "@/lib/expense-recurrence";
import {
  expenseRepository,
  goalRepository,
  incomeRepository,
  loanPaymentRepository,
  loanRepository,
  subscriptionRepository,
  transactionRepository,
  walletRepository,
} from "@/lib/repositories";
import {
  clearLegacyFinancialData,
  getSettings,
  isOnboarded,
  saveSettings,
  setOnboarded,
} from "@/lib/storage";
import { FREE_PLAN_LIMITS, getFreeLimitMessage } from "@/lib/premium";
import { captureError } from "@/lib/monitoring";
import {
  configureBilling,
  getBillingUnavailableMessage,
  hasActivePremiumEntitlement,
  isBillingSupportedPlatform,
  logOutBillingUser,
  purchaseBillingProduct,
  refreshBillingCustomerInfo,
  restoreBillingPurchases,
} from "@/lib/billing";
import {
  getSession,
  onAuthStateChange,
  signIn as signInAuth,
  signOut as signOutAuth,
  signUp as signUpAuth,
} from "@/lib/auth";
import type {
  DashboardSummary,
  Expense,
  FreePlanStatus,
  Income,
  Loan,
  LoanPayment,
  SavingsGoal,
  Subscription,
  Transaction,
  Wallet,
} from "@/lib/types";
import { beginLoadGuard, isLoadGuardActive } from "@/lib/load-guards";

interface AppContextValue {
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  isPremium: boolean;
  isOnline: boolean;
  hasOnboarded: boolean;
  isLoading: boolean;
  currency: string;
  currencySymbol: string;
  wallets: Wallet[];
  transactions: Transaction[];
  goals: SavingsGoal[];
  expenses: Expense[];
  recurringExpenses: Expense[];
  incomes: Income[];
  loans: Loan[];
  loanPayments: LoanPayment[];
  subscriptions: Subscription[];
  totalBalance: number;
  dashboardSummary: DashboardSummary;
  freePlanStatus: FreePlanStatus;
  refreshData: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  addWallet: (
    data: Omit<Wallet, "id" | "userId" | "createdAt" | "updatedAt">
  ) => Promise<Wallet>;
  editWallet: (
    id: string,
    data: Partial<Omit<Wallet, "id" | "userId" | "createdAt" | "updatedAt">>
  ) => Promise<void>;
  removeWallet: (id: string) => Promise<void>;
  addTransaction: (
    data: Omit<Transaction, "id" | "userId" | "createdAt">
  ) => Promise<Transaction>;
  removeTransaction: (id: string) => Promise<void>;
  addGoal: (
    data: Omit<SavingsGoal, "id" | "userId" | "createdAt" | "updatedAt">
  ) => Promise<SavingsGoal>;
  editGoal: (
    id: string,
    data: Partial<
      Omit<SavingsGoal, "id" | "userId" | "createdAt" | "updatedAt">
    >
  ) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
  addExpense: (
    data: Omit<Expense, "id" | "userId" | "createdAt">
  ) => Promise<Expense>;
  editExpense: (
    id: string,
    data: Partial<Omit<Expense, "id" | "userId" | "createdAt">>
  ) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;
  markRecurringExpensePaid: (id: string, monthKey?: string) => Promise<void>;
  markRecurringExpenseUnpaid: (id: string, monthKey?: string) => Promise<void>;
  addIncome: (
    data: Omit<Income, "id" | "userId" | "createdAt">
  ) => Promise<Income>;
  editIncome: (
    id: string,
    data: Partial<Omit<Income, "id" | "userId" | "createdAt">>
  ) => Promise<void>;
  removeIncome: (id: string) => Promise<void>;
  addLoan: (
    data: Omit<Loan, "id" | "userId" | "createdAt" | "updatedAt">
  ) => Promise<Loan>;
  editLoan: (
    id: string,
    data: Partial<Omit<Loan, "id" | "userId" | "createdAt" | "updatedAt">>
  ) => Promise<void>;
  removeLoan: (id: string) => Promise<void>;
  addLoanPayment: (
    data: Omit<LoanPayment, "id" | "userId" | "createdAt">
  ) => Promise<LoanPayment>;
  removeLoanPayment: (id: string) => Promise<void>;
  purchasePremium: (productId: string) => Promise<void>;
  restorePremium: () => Promise<void>;
  refreshPremiumStatus: () => Promise<void>;
  exportPremiumCsv: () => Promise<string>;
  setCurrency: (currency: string, symbol: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  hasOnboarded: boolean;
  isLoading: boolean;
}

interface NetworkContextValue {
  isOnline: boolean;
}

interface PreferencesContextValue {
  currency: string;
  currencySymbol: string;
}

interface SubscriptionContextValue {
  subscriptions: Subscription[];
  isPremium: boolean;
}

interface FinanceMetricsContextValue {
  totalBalance: number;
  dashboardSummary: DashboardSummary;
  freePlanStatus: FreePlanStatus;
}

interface ActionsContextValue {
  refreshData: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  addWallet: AppContextValue["addWallet"];
  editWallet: AppContextValue["editWallet"];
  removeWallet: AppContextValue["removeWallet"];
  addTransaction: AppContextValue["addTransaction"];
  removeTransaction: AppContextValue["removeTransaction"];
  addGoal: AppContextValue["addGoal"];
  editGoal: AppContextValue["editGoal"];
  removeGoal: AppContextValue["removeGoal"];
  addExpense: AppContextValue["addExpense"];
  editExpense: AppContextValue["editExpense"];
  removeExpense: AppContextValue["removeExpense"];
  markRecurringExpensePaid: AppContextValue["markRecurringExpensePaid"];
  markRecurringExpenseUnpaid: AppContextValue["markRecurringExpenseUnpaid"];
  addIncome: AppContextValue["addIncome"];
  editIncome: AppContextValue["editIncome"];
  removeIncome: AppContextValue["removeIncome"];
  addLoan: AppContextValue["addLoan"];
  editLoan: AppContextValue["editLoan"];
  removeLoan: AppContextValue["removeLoan"];
  addLoanPayment: AppContextValue["addLoanPayment"];
  removeLoanPayment: AppContextValue["removeLoanPayment"];
  purchasePremium: (productId: string) => Promise<void>;
  restorePremium: () => Promise<void>;
  refreshPremiumStatus: () => Promise<void>;
  exportPremiumCsv: () => Promise<string>;
  setCurrency: (currency: string, symbol: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const NetworkContext = createContext<NetworkContextValue | null>(null);
const PreferencesContext = createContext<PreferencesContextValue | null>(null);
const WalletsContext = createContext<Wallet[] | null>(null);
const TransactionsContext = createContext<Transaction[] | null>(null);
const GoalsContext = createContext<SavingsGoal[] | null>(null);
const ExpensesContext = createContext<Expense[] | null>(null);
const RecurringExpensesContext = createContext<Expense[] | null>(null);
const IncomesContext = createContext<Income[] | null>(null);
const LoansContext = createContext<Loan[] | null>(null);
const LoanPaymentsContext = createContext<LoanPayment[] | null>(null);
const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);
const FinanceMetricsContext = createContext<FinanceMetricsContextValue | null>(null);
const ActionsContext = createContext<ActionsContextValue | null>(null);

function areFlatObjectsEqual(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i += 1) {
    const key = aKeys[i];
    if (a[key] !== b[key]) return false;
  }
  return true;
}

function areEntityListsEqual<T extends { id: string }>(a: T[], b: T[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].id !== b[i].id) return false;
    if (
      !areFlatObjectsEqual(
        a[i] as unknown as Record<string, unknown>,
        b[i] as unknown as Record<string, unknown>
      )
    ) {
      return false;
    }
  }
  return true;
}

function getMonthKey(dateValue: string): string {
  const d = new Date(dateValue);
  return `${d.getUTCFullYear()}-${`${d.getUTCMonth() + 1}`.padStart(2, "0")}`;
}

function isSubscriptionActive(subscription: Subscription): boolean {
  if (subscription.status !== "active") return false;
  if (subscription.lifetime || subscription.plan === "lifetime") return true;
  if (!subscription.expiresAt) return false;
  return new Date(subscription.expiresAt).getTime() > Date.now();
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [expenseEntries, setExpenseEntries] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loanPayments, setLoanPayments] = useState<LoanPayment[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [currency, setCurrencyState] = useState("USD");
  const [currencySymbol, setCurrencySymbol] = useState("$");
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const clearedLegacyUserRef = useRef<string | null>(null);
  const tableRefreshTimersRef = useRef<
    Partial<Record<string, ReturnType<typeof setTimeout>>>
  >({});
  const isRefreshingRef = useRef(false);
  const queuedRefreshRef = useRef(false);
  const activeLoadIdRef = useRef(0);
  const userIdRef = useRef<string | null>(null);

  userIdRef.current = user?.id ?? null;

  const clearRemoteData = useCallback(() => {
    setWallets((prev) => (prev.length > 0 ? [] : prev));
    setTransactions((prev) => (prev.length > 0 ? [] : prev));
    setGoals((prev) => (prev.length > 0 ? [] : prev));
    setExpenseEntries((prev) => (prev.length > 0 ? [] : prev));
    setIncomes((prev) => (prev.length > 0 ? [] : prev));
    setLoans((prev) => (prev.length > 0 ? [] : prev));
    setLoanPayments((prev) => (prev.length > 0 ? [] : prev));
    setSubscriptions((prev) => (prev.length > 0 ? [] : prev));
  }, []);

  const requireUser = useCallback((): User => {
    if (!user) throw new Error("You must be signed in to perform this action.");
    return user;
  }, [user]);

  const assertOnlineForWrite = useCallback(() => {
    if (!isOnline) {
      throw new Error("You are offline. Reconnect to make changes.");
    }
  }, [isOnline]);

  const loadSettingsAndOnboarding = useCallback(async () => {
    const [settings, onboarded] = await Promise.all([
      getSettings(),
      isOnboarded(),
    ]);
    setCurrencyState(settings.currency);
    setCurrencySymbol(settings.currencySymbol);
    setHasOnboarded(onboarded);
  }, []);

  const loadRemoteData = useCallback(async () => {
    const userIdAtStart = userIdRef.current;
    if (!userIdAtStart) {
      clearRemoteData();
      return;
    }

    const guard = beginLoadGuard(activeLoadIdRef, userIdAtStart);

    const [
      walletsData,
      transactionsData,
      goalsData,
      expensesData,
      incomesData,
      loansData,
      loanPaymentsData,
      subscriptionsData,
    ] = await Promise.all([
      walletRepository.list({ limit: 200 }),
      transactionRepository.list({ limit: 400 }),
      goalRepository.list({ limit: 200 }),
      expenseRepository.list({ limit: 500 }),
      incomeRepository.list({ limit: 500 }),
      loanRepository.list({ limit: 200 }),
      loanPaymentRepository.list({ limit: 500 }),
      subscriptionRepository.list({ limit: 100 }),
    ]);

    if (!isLoadGuardActive(activeLoadIdRef, userIdRef.current, guard)) {
      return;
    }

    setWallets((prev) =>
      areEntityListsEqual(prev, walletsData) ? prev : walletsData
    );
    setTransactions((prev) =>
      areEntityListsEqual(prev, transactionsData) ? prev : transactionsData
    );
    setGoals((prev) => (areEntityListsEqual(prev, goalsData) ? prev : goalsData));
    setExpenseEntries((prev) =>
      areEntityListsEqual(prev, expensesData) ? prev : expensesData
    );
    setIncomes((prev) =>
      areEntityListsEqual(prev, incomesData) ? prev : incomesData
    );
    setLoans((prev) => (areEntityListsEqual(prev, loansData) ? prev : loansData));
    setLoanPayments((prev) =>
      areEntityListsEqual(prev, loanPaymentsData) ? prev : loanPaymentsData
    );
    setSubscriptions((prev) =>
      areEntityListsEqual(prev, subscriptionsData) ? prev : subscriptionsData
    );
  }, [clearRemoteData]);

  const refreshWallets = useCallback(async (expectedUserId?: string) => {
    const userIdAtStart = expectedUserId ?? userIdRef.current;
    if (!userIdAtStart) return;
    const guard = beginLoadGuard(activeLoadIdRef, userIdAtStart);
    const data = await walletRepository.list({ limit: 200 });
    if (!isLoadGuardActive(activeLoadIdRef, userIdRef.current, guard)) return;
    setWallets((prev) => (areEntityListsEqual(prev, data) ? prev : data));
  }, []);

  const refreshTransactions = useCallback(async (expectedUserId?: string) => {
    const userIdAtStart = expectedUserId ?? userIdRef.current;
    if (!userIdAtStart) return;
    const guard = beginLoadGuard(activeLoadIdRef, userIdAtStart);
    const data = await transactionRepository.list({ limit: 400 });
    if (!isLoadGuardActive(activeLoadIdRef, userIdRef.current, guard)) return;
    setTransactions((prev) => (areEntityListsEqual(prev, data) ? prev : data));
  }, []);

  const refreshGoals = useCallback(async (expectedUserId?: string) => {
    const userIdAtStart = expectedUserId ?? userIdRef.current;
    if (!userIdAtStart) return;
    const guard = beginLoadGuard(activeLoadIdRef, userIdAtStart);
    const data = await goalRepository.list({ limit: 200 });
    if (!isLoadGuardActive(activeLoadIdRef, userIdRef.current, guard)) return;
    setGoals((prev) => (areEntityListsEqual(prev, data) ? prev : data));
  }, []);

  const refreshExpenses = useCallback(async (expectedUserId?: string) => {
    const userIdAtStart = expectedUserId ?? userIdRef.current;
    if (!userIdAtStart) return;
    const guard = beginLoadGuard(activeLoadIdRef, userIdAtStart);
    const data = await expenseRepository.list({ limit: 500 });
    if (!isLoadGuardActive(activeLoadIdRef, userIdRef.current, guard)) return;
    setExpenseEntries((prev) => (areEntityListsEqual(prev, data) ? prev : data));
  }, []);

  const refreshIncomes = useCallback(async (expectedUserId?: string) => {
    const userIdAtStart = expectedUserId ?? userIdRef.current;
    if (!userIdAtStart) return;
    const guard = beginLoadGuard(activeLoadIdRef, userIdAtStart);
    const data = await incomeRepository.list({ limit: 500 });
    if (!isLoadGuardActive(activeLoadIdRef, userIdRef.current, guard)) return;
    setIncomes((prev) => (areEntityListsEqual(prev, data) ? prev : data));
  }, []);

  const refreshLoans = useCallback(async (expectedUserId?: string) => {
    const userIdAtStart = expectedUserId ?? userIdRef.current;
    if (!userIdAtStart) return;
    const guard = beginLoadGuard(activeLoadIdRef, userIdAtStart);
    const data = await loanRepository.list({ limit: 200 });
    if (!isLoadGuardActive(activeLoadIdRef, userIdRef.current, guard)) return;
    setLoans((prev) => (areEntityListsEqual(prev, data) ? prev : data));
  }, []);

  const refreshLoanPayments = useCallback(async (expectedUserId?: string) => {
    const userIdAtStart = expectedUserId ?? userIdRef.current;
    if (!userIdAtStart) return;
    const guard = beginLoadGuard(activeLoadIdRef, userIdAtStart);
    const data = await loanPaymentRepository.list({ limit: 500 });
    if (!isLoadGuardActive(activeLoadIdRef, userIdRef.current, guard)) return;
    setLoanPayments((prev) => (areEntityListsEqual(prev, data) ? prev : data));
  }, []);

  const refreshSubscriptions = useCallback(async (expectedUserId?: string) => {
    const userIdAtStart = expectedUserId ?? userIdRef.current;
    if (!userIdAtStart) return;
    const guard = beginLoadGuard(activeLoadIdRef, userIdAtStart);
    const data = await subscriptionRepository.list({ limit: 100 });
    if (!isLoadGuardActive(activeLoadIdRef, userIdRef.current, guard)) return;
    setSubscriptions((prev) => (areEntityListsEqual(prev, data) ? prev : data));
  }, []);

  const runRefresh = useCallback(async () => {
    if (isRefreshingRef.current) {
      queuedRefreshRef.current = true;
      return;
    }

    isRefreshingRef.current = true;
    try {
      await loadRemoteData();
    } finally {
      isRefreshingRef.current = false;
      if (queuedRefreshRef.current) {
        queuedRefreshRef.current = false;
        await runRefresh();
      }
    }
  }, [loadRemoteData]);

  const refreshData = useCallback(async () => {
    await runRefresh();
  }, [runRefresh]);

  const refreshTable = useCallback(
    async (
      table:
        | "wallets"
        | "transactions"
        | "goals"
        | "expenses"
        | "incomes"
        | "loans"
        | "loanPayments"
        | "subscriptions",
      expectedUserId?: string
    ) => {
      switch (table) {
        case "wallets":
          await refreshWallets(expectedUserId);
          break;
        case "transactions":
          await refreshTransactions(expectedUserId);
          break;
        case "goals":
          await refreshGoals(expectedUserId);
          break;
        case "expenses":
          await refreshExpenses(expectedUserId);
          break;
        case "incomes":
          await refreshIncomes(expectedUserId);
          break;
        case "loans":
          await refreshLoans(expectedUserId);
          break;
        case "loanPayments":
          await refreshLoanPayments(expectedUserId);
          break;
        case "subscriptions":
          await refreshSubscriptions(expectedUserId);
          break;
      }
    },
    [
      refreshExpenses,
      refreshGoals,
      refreshIncomes,
      refreshLoanPayments,
      refreshLoans,
      refreshSubscriptions,
      refreshTransactions,
      refreshWallets,
    ]
  );

  const scheduleTableRefresh = useCallback(
    (
      table:
        | "wallets"
        | "transactions"
        | "goals"
        | "expenses"
        | "incomes"
        | "loans"
        | "loanPayments"
        | "subscriptions",
      expectedUserId?: string
    ) => {
      const timers = tableRefreshTimersRef.current;
      const existing = timers[table];
      if (existing) {
        clearTimeout(existing);
      }

      timers[table] = setTimeout(() => {
        delete timers[table];
        void refreshTable(table, expectedUserId);
      }, 150);
    },
    [refreshTable]
  );

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected !== false;
      const reachable = state.isInternetReachable !== false;
      setIsOnline(connected && reachable);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    return () => {
      const timers = tableRefreshTimersRef.current;
      Object.values(timers).forEach((timer) => {
        if (timer) {
          clearTimeout(timer);
        }
      });
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        await loadSettingsAndOnboarding();
        const sessionData = await getSession();
        if (!mounted) return;
        setSession(sessionData);
        setUser(sessionData?.user ?? null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    bootstrap();

    const {
      data: { subscription },
    } = onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadSettingsAndOnboarding]);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      if (!user) {
        clearRemoteData();
        return;
      }

      if (clearedLegacyUserRef.current !== user.id) {
        await clearLegacyFinancialData();
        clearedLegacyUserRef.current = user.id;
      }

      await loadRemoteData();
      if (!cancelled) {
        setIsLoading(false);
      }
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [clearRemoteData, user, loadRemoteData]);

  useEffect(() => {
    if (!user || !isBillingSupportedPlatform()) return;
    configureBilling(user.id).catch((error) => {
      captureError(error, {
        scope: "billing",
        operation: "configure_billing",
      });
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`savewise-sync-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` },
        () => {
          scheduleTableRefresh("wallets", user.id);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "savings_transactions",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          scheduleTableRefresh("transactions", user.id);
          scheduleTableRefresh("wallets", user.id);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "savings_goals", filter: `user_id=eq.${user.id}` },
        () => {
          scheduleTableRefresh("goals", user.id);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses", filter: `user_id=eq.${user.id}` },
        () => {
          scheduleTableRefresh("expenses", user.id);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incomes", filter: `user_id=eq.${user.id}` },
        () => {
          scheduleTableRefresh("incomes", user.id);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "loans", filter: `user_id=eq.${user.id}` },
        () => {
          scheduleTableRefresh("loans", user.id);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "loan_payments", filter: `user_id=eq.${user.id}` },
        () => {
          scheduleTableRefresh("loanPayments", user.id);
          scheduleTableRefresh("loans", user.id);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
        () => {
          scheduleTableRefresh("subscriptions", user.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [scheduleTableRefresh, user]);

  const totalBalance = useMemo(
    () => wallets.reduce((sum, w) => sum + w.balance, 0),
    [wallets]
  );

  const recurringExpenses = useMemo(
    () =>
      expenseEntries
        .filter((item) => getExpenseRecurrence(item) === "monthly")
        .slice()
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [expenseEntries]
  );

  const expenses = useMemo(
    () => buildEffectiveExpenses(expenseEntries),
    [expenseEntries]
  );

  const dashboardSummary = useMemo<DashboardSummary>(() => {
    const now = new Date();
    const currentMonthKey = getUtcMonthKey(now);
    const totalSavings = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
    const totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0);
    const outstandingLoans = loans.reduce((sum, loan) => sum + loan.balance, 0);
    const monthlyIncome = incomes
      .filter((item) => getMonthKey(item.date) === currentMonthKey)
      .reduce((sum, item) => sum + item.amount, 0);
    const monthlyExpenses = expenses
      .filter((item) => getMonthKey(item.date) === currentMonthKey)
      .reduce((sum, item) => sum + item.amount, 0);
    const goalsTargetTotal = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
    const goalsCurrentTotal = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);

    return {
      totalSavings,
      totalExpenses,
      totalIncome,
      outstandingLoans,
      netBalance: totalSavings - totalExpenses - outstandingLoans,
      monthlyIncome,
      monthlyExpenses,
      monthlyCashflow: monthlyIncome - monthlyExpenses,
      goalsTargetTotal,
      goalsCurrentTotal,
    };
  }, [expenses, goals, incomes, loans, wallets]);

  const isPremium = useMemo(
    () => subscriptions.some((subscription) => isSubscriptionActive(subscription)),
    [subscriptions]
  );

  const monthlyUsage = useMemo(() => {
    const currentMonthKey = getUtcMonthKey(new Date());

    return {
      monthlyTransactions: transactions.filter(
        (item) => getMonthKey(item.date) === currentMonthKey
      ).length,
      monthlyExpenses: expenseEntries.filter(
        (item) => getMonthKey(item.date) === currentMonthKey
      ).length,
      monthlyIncomeLogs: incomes.filter(
        (item) => getMonthKey(item.date) === currentMonthKey
      ).length,
      monthlyLoanPayments: loanPayments.filter(
        (item) => getMonthKey(item.paymentDate) === currentMonthKey
      ).length,
    };
  }, [expenseEntries, incomes, loanPayments, transactions]);

  const freePlanStatus = useMemo<FreePlanStatus>(() => {
    const usage = {
      wallets: wallets.length,
      goals: goals.length,
      loans: loans.length,
      monthlyTransactions: monthlyUsage.monthlyTransactions,
      monthlyExpenses: monthlyUsage.monthlyExpenses,
      monthlyIncomeLogs: monthlyUsage.monthlyIncomeLogs,
      monthlyLoanPayments: monthlyUsage.monthlyLoanPayments,
    };

    const unlimited = isPremium;
    return {
      limits: FREE_PLAN_LIMITS,
      usage,
      canCreateWallet: unlimited || usage.wallets < FREE_PLAN_LIMITS.wallets,
      canCreateGoal: unlimited || usage.goals < FREE_PLAN_LIMITS.goals,
      canCreateLoan: unlimited || usage.loans < FREE_PLAN_LIMITS.loans,
      canCreateTransaction:
        unlimited || usage.monthlyTransactions < FREE_PLAN_LIMITS.monthlyTransactions,
      canCreateExpense:
        unlimited || usage.monthlyExpenses < FREE_PLAN_LIMITS.monthlyExpenses,
      canCreateIncome:
        unlimited || usage.monthlyIncomeLogs < FREE_PLAN_LIMITS.monthlyIncomeLogs,
      canCreateLoanPayment:
        unlimited || usage.monthlyLoanPayments < FREE_PLAN_LIMITS.monthlyLoanPayments,
    };
  }, [goals.length, isPremium, loans.length, monthlyUsage, wallets.length]);

  const assertPremiumLimit = useCallback(
    (condition: boolean, feature: Parameters<typeof getFreeLimitMessage>[0]) => {
      if (!isPremium && !condition) {
        throw new Error(getFreeLimitMessage(feature));
      }
    },
    [isPremium]
  );

  const signIn = useCallback(async (email: string, password: string) => {
    assertOnlineForWrite();
    try {
      const nextSession = await signInAuth(email, password);
      setSession(nextSession);
      setUser(nextSession.user);
    } catch (error) {
      captureError(error, { scope: "auth", operation: "sign_in" });
      throw error;
    }
  }, [assertOnlineForWrite]);

  const signUp = useCallback(async (email: string, password: string) => {
    assertOnlineForWrite();
    try {
      const nextSession = await signUpAuth(email, password);
      if (nextSession) {
        setSession(nextSession);
        setUser(nextSession.user);
      }
    } catch (error) {
      captureError(error, { scope: "auth", operation: "sign_up" });
      throw error;
    }
  }, [assertOnlineForWrite]);

  const signOut = useCallback(async () => {
    assertOnlineForWrite();
    try {
      await signOutAuth();
    } catch (error) {
      captureError(error, { scope: "auth", operation: "sign_out" });
      throw error;
    }
    if (isBillingSupportedPlatform()) {
      try {
        await logOutBillingUser();
      } catch (error) {
        captureError(error, {
          scope: "billing",
          operation: "logout_billing_user",
        });
      }
    }
    setSession(null);
    setUser(null);
  }, [assertOnlineForWrite]);

  const deleteAccount = useCallback(async () => {
    assertOnlineForWrite();
    requireUser();
    try {
      const { error } = await supabase.functions.invoke("delete-account", {
        body: { confirm: true },
      });
      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      captureError(error, { scope: "auth", operation: "delete_account" });
      throw error;
    }
    if (isBillingSupportedPlatform()) {
      try {
        await logOutBillingUser();
      } catch (billingError) {
        captureError(billingError, {
          scope: "billing",
          operation: "logout_billing_user_after_delete",
        });
      }
    }
    setSession(null);
    setUser(null);
    clearRemoteData();
  }, [assertOnlineForWrite, requireUser, clearRemoteData]);

  const addWallet = useCallback(
    async (data: Omit<Wallet, "id" | "userId" | "createdAt" | "updatedAt">) => {
      assertOnlineForWrite();
      assertPremiumLimit(freePlanStatus.canCreateWallet, "wallets");
      const currentUser = requireUser();
      const wallet = await walletRepository.create({
        userId: currentUser.id,
        ...data,
      });
      setWallets((prev) => [wallet, ...prev]);
      return wallet;
    },
    [assertOnlineForWrite, assertPremiumLimit, freePlanStatus.canCreateWallet, requireUser]
  );

  const editWallet = useCallback(
    async (
      id: string,
      data: Partial<Omit<Wallet, "id" | "userId" | "createdAt" | "updatedAt">>
    ) => {
      assertOnlineForWrite();
      const wallet = await walletRepository.update(id, data);
      setWallets((prev) => prev.map((item) => (item.id === id ? wallet : item)));
    },
    [assertOnlineForWrite]
  );

  const removeWallet = useCallback(
    async (id: string) => {
      assertOnlineForWrite();
      await walletRepository.remove(id);
      setWallets((prev) => prev.filter((item) => item.id !== id));
      setTransactions((prev) => prev.filter((item) => item.walletId !== id));
      setGoals((prev) =>
        prev.map((goal) => (goal.walletId === id ? { ...goal, walletId: null } : goal))
      );
    },
    [assertOnlineForWrite]
  );

  const addTransaction = useCallback(
    async (data: Omit<Transaction, "id" | "userId" | "createdAt">) => {
      assertOnlineForWrite();
      assertPremiumLimit(freePlanStatus.canCreateTransaction, "transactions");
      const currentUser = requireUser();
      const transaction = await transactionRepository.create({
        userId: currentUser.id,
        ...data,
      });

      const updatedWallet = await walletRepository.getById(data.walletId);
      if (updatedWallet) {
        setWallets((prev) =>
          prev.map((item) =>
            item.id === updatedWallet.id ? updatedWallet : item
          )
        );
      }

      setTransactions((prev) => [transaction, ...prev]);
      return transaction;
    },
    [
      assertOnlineForWrite,
      assertPremiumLimit,
      freePlanStatus.canCreateTransaction,
      requireUser,
    ]
  );

  const removeTransaction = useCallback(
    async (id: string) => {
      assertOnlineForWrite();
      const tx = transactions.find((item) => item.id === id);
      await transactionRepository.remove(id);
      setTransactions((prev) => prev.filter((item) => item.id !== id));

      if (tx) {
        const updatedWallet = await walletRepository.getById(tx.walletId);
        if (updatedWallet) {
          setWallets((prev) =>
            prev.map((item) =>
              item.id === updatedWallet.id ? updatedWallet : item
            )
          );
        }
      }
    },
    [assertOnlineForWrite, transactions]
  );

  const addGoal = useCallback(
    async (
      data: Omit<SavingsGoal, "id" | "userId" | "createdAt" | "updatedAt">
    ) => {
      assertOnlineForWrite();
      assertPremiumLimit(freePlanStatus.canCreateGoal, "goals");
      const currentUser = requireUser();
      const goal = await goalRepository.create({ userId: currentUser.id, ...data });
      setGoals((prev) => [goal, ...prev]);
      return goal;
    },
    [assertOnlineForWrite, assertPremiumLimit, freePlanStatus.canCreateGoal, requireUser]
  );

  const editGoal = useCallback(
    async (
      id: string,
      data: Partial<
        Omit<SavingsGoal, "id" | "userId" | "createdAt" | "updatedAt">
      >
    ) => {
      assertOnlineForWrite();
      const goal = await goalRepository.update(id, data);
      setGoals((prev) => prev.map((item) => (item.id === id ? goal : item)));
    },
    [assertOnlineForWrite]
  );

  const removeGoal = useCallback(
    async (id: string) => {
      assertOnlineForWrite();
      await goalRepository.remove(id);
      setGoals((prev) => prev.filter((item) => item.id !== id));
    },
    [assertOnlineForWrite]
  );

  const addExpense = useCallback(
    async (data: Omit<Expense, "id" | "userId" | "createdAt">) => {
      assertOnlineForWrite();
      assertPremiumLimit(freePlanStatus.canCreateExpense, "expenses");
      const currentUser = requireUser();
      const recurrence = getExpenseRecurrence(data);
      const paidMonths =
        recurrence === "monthly" ? normalizeMonthKeys(data.paidMonths) : [];
      const expense = await expenseRepository.create({
        userId: currentUser.id,
        category: data.category,
        amount: data.amount,
        note: data.note,
        date: data.date,
        recurrence,
        recurrenceEndDate:
          recurrence === "monthly" ? data.recurrenceEndDate ?? null : null,
        paidMonths,
      });
      setExpenseEntries((prev) => [expense, ...prev]);
      return expense;
    },
    [assertOnlineForWrite, assertPremiumLimit, freePlanStatus.canCreateExpense, requireUser]
  );

  const editExpense = useCallback(
    async (
      id: string,
      data: Partial<Omit<Expense, "id" | "userId" | "createdAt">>
    ) => {
      assertOnlineForWrite();
      const current = expenseEntries.find((item) => item.id === id);
      if (!current) {
        throw new Error("Expense entry not found.");
      }
      const nextRecurrence =
        data.recurrence !== undefined
          ? getExpenseRecurrence(data)
          : getExpenseRecurrence(current);

      const updated = await expenseRepository.update(id, {
        category: data.category,
        amount: data.amount,
        note: data.note,
        date: data.date,
        recurrence: nextRecurrence,
        recurrenceEndDate:
          nextRecurrence === "monthly"
            ? data.recurrenceEndDate ?? current.recurrenceEndDate ?? null
            : null,
        paidMonths:
          nextRecurrence === "monthly"
            ? normalizeMonthKeys(data.paidMonths ?? current.paidMonths)
            : [],
      });
      setExpenseEntries((prev) =>
        prev.map((item) => (item.id === id ? updated : item))
      );
    },
    [assertOnlineForWrite, expenseEntries]
  );

  const removeExpense = useCallback(
    async (id: string) => {
      assertOnlineForWrite();
      await expenseRepository.remove(id);
      setExpenseEntries((prev) => prev.filter((item) => item.id !== id));
    },
    [assertOnlineForWrite]
  );

  const markRecurringExpensePaid = useCallback(
    async (id: string, monthKey?: string) => {
      assertOnlineForWrite();
      const expense = expenseEntries.find((item) => item.id === id);
      if (!expense || getExpenseRecurrence(expense) !== "monthly") {
        throw new Error("Recurring expense not found.");
      }
      const targetMonthKey = monthKey ?? getUtcMonthKey(new Date());
      if (!isRecurringExpenseActiveForMonth(expense, targetMonthKey)) {
        throw new Error("Recurring expense is not active for this month.");
      }

      const updated = await expenseRepository.update(id, {
        paidMonths: upsertPaidMonth(expense.paidMonths, targetMonthKey, true),
      });
      setExpenseEntries((prev) =>
        prev.map((item) => (item.id === id ? updated : item))
      );
    },
    [assertOnlineForWrite, expenseEntries]
  );

  const markRecurringExpenseUnpaid = useCallback(
    async (id: string, monthKey?: string) => {
      assertOnlineForWrite();
      const expense = expenseEntries.find((item) => item.id === id);
      if (!expense || getExpenseRecurrence(expense) !== "monthly") {
        throw new Error("Recurring expense not found.");
      }
      const targetMonthKey = monthKey ?? getUtcMonthKey(new Date());
      const updated = await expenseRepository.update(id, {
        paidMonths: upsertPaidMonth(expense.paidMonths, targetMonthKey, false),
      });
      setExpenseEntries((prev) =>
        prev.map((item) => (item.id === id ? updated : item))
      );
    },
    [assertOnlineForWrite, expenseEntries]
  );

  const addIncome = useCallback(
    async (data: Omit<Income, "id" | "userId" | "createdAt">) => {
      assertOnlineForWrite();
      assertPremiumLimit(freePlanStatus.canCreateIncome, "incomes");
      const currentUser = requireUser();
      const income = await incomeRepository.create({
        userId: currentUser.id,
        ...data,
      });
      setIncomes((prev) => [income, ...prev]);
      return income;
    },
    [assertOnlineForWrite, assertPremiumLimit, freePlanStatus.canCreateIncome, requireUser]
  );

  const editIncome = useCallback(
    async (
      id: string,
      data: Partial<Omit<Income, "id" | "userId" | "createdAt">>
    ) => {
      assertOnlineForWrite();
      const updated = await incomeRepository.update(id, data);
      setIncomes((prev) => prev.map((item) => (item.id === id ? updated : item)));
    },
    [assertOnlineForWrite]
  );

  const removeIncome = useCallback(
    async (id: string) => {
      assertOnlineForWrite();
      await incomeRepository.remove(id);
      setIncomes((prev) => prev.filter((item) => item.id !== id));
    },
    [assertOnlineForWrite]
  );

  const addLoan = useCallback(
    async (data: Omit<Loan, "id" | "userId" | "createdAt" | "updatedAt">) => {
      assertOnlineForWrite();
      assertPremiumLimit(freePlanStatus.canCreateLoan, "loans");
      const currentUser = requireUser();
      const loan = await loanRepository.create({ userId: currentUser.id, ...data });
      setLoans((prev) => [loan, ...prev]);
      return loan;
    },
    [assertOnlineForWrite, assertPremiumLimit, freePlanStatus.canCreateLoan, requireUser]
  );

  const editLoan = useCallback(
    async (
      id: string,
      data: Partial<Omit<Loan, "id" | "userId" | "createdAt" | "updatedAt">>
    ) => {
      assertOnlineForWrite();
      const updated = await loanRepository.update(id, data);
      setLoans((prev) => prev.map((item) => (item.id === id ? updated : item)));
    },
    [assertOnlineForWrite]
  );

  const removeLoan = useCallback(
    async (id: string) => {
      assertOnlineForWrite();
      await loanRepository.remove(id);
      setLoans((prev) => prev.filter((item) => item.id !== id));
      setLoanPayments((prev) => prev.filter((item) => item.loanId !== id));
    },
    [assertOnlineForWrite]
  );

  const addLoanPayment = useCallback(
    async (data: Omit<LoanPayment, "id" | "userId" | "createdAt">) => {
      assertOnlineForWrite();
      assertPremiumLimit(freePlanStatus.canCreateLoanPayment, "loan_payments");
      const currentUser = requireUser();
      const payment = await loanPaymentRepository.create({
        userId: currentUser.id,
        ...data,
      });

      const updatedLoan = await loanRepository.getById(data.loanId);
      if (updatedLoan) {
        setLoans((prev) =>
          prev.map((item) => (item.id === updatedLoan.id ? updatedLoan : item))
        );
      }

      setLoanPayments((prev) => [payment, ...prev]);
      return payment;
    },
    [
      assertOnlineForWrite,
      assertPremiumLimit,
      freePlanStatus.canCreateLoanPayment,
      requireUser,
    ]
  );

  const removeLoanPayment = useCallback(
    async (id: string) => {
      assertOnlineForWrite();
      const payment = loanPayments.find((item) => item.id === id);
      await loanPaymentRepository.remove(id);
      setLoanPayments((prev) => prev.filter((item) => item.id !== id));

      if (payment) {
        const updatedLoan = await loanRepository.getById(payment.loanId);
        if (updatedLoan) {
          setLoans((prev) =>
            prev.map((item) =>
              item.id === updatedLoan.id ? updatedLoan : item
            )
          );
        }
      }
    },
    [assertOnlineForWrite, loanPayments]
  );

  const syncSubscriptionsFromServer = useCallback(async () => {
    const { error } = await supabase.functions.invoke("subscription-sync");
    if (error) {
      captureError(error, {
        scope: "billing",
        operation: "subscription_sync",
      });
      throw new Error(error.message);
    }
  }, []);

  const refreshPremiumStatus = useCallback(async () => {
    try {
      if (!isOnline) {
        throw new Error("You are offline. Reconnect to refresh premium status.");
      }
      if (!isBillingSupportedPlatform()) {
        throw new Error(
          getBillingUnavailableMessage() ??
            "In-app purchases are not available in this build."
        );
      }
      const currentUser = requireUser();
      await configureBilling(currentUser.id);
      const customerInfo = await refreshBillingCustomerInfo();
      if (hasActivePremiumEntitlement(customerInfo)) {
        await syncSubscriptionsFromServer();
      }
      const subscriptionsData = await subscriptionRepository.list({ limit: 100 });
      setSubscriptions((prev) =>
        areEntityListsEqual(prev, subscriptionsData) ? prev : subscriptionsData
      );
    } catch (error) {
      captureError(error, {
        scope: "billing",
        operation: "refresh_premium_status",
      });
      throw error;
    }
  }, [isOnline, requireUser, syncSubscriptionsFromServer]);

  const purchasePremium = useCallback(
    async (productId: string) => {
      try {
        assertOnlineForWrite();
        const currentUser = requireUser();
        if (!isBillingSupportedPlatform()) {
          throw new Error(
            getBillingUnavailableMessage() ??
              "In-app purchases are not available in this build."
          );
        }

        await configureBilling(currentUser.id);
        const customerInfo = await purchaseBillingProduct(productId);
        if (!hasActivePremiumEntitlement(customerInfo)) {
          throw new Error(
            "Purchase completed but premium entitlement is not active yet."
          );
        }
        await syncSubscriptionsFromServer();
        await refreshPremiumStatus();
      } catch (error) {
        captureError(error, {
          scope: "billing",
          operation: "purchase_premium",
          extra: { productId },
        });
        throw error;
      }
    },
    [
      assertOnlineForWrite,
      requireUser,
      syncSubscriptionsFromServer,
      refreshPremiumStatus,
    ]
  );

  const restorePremium = useCallback(async () => {
    try {
      assertOnlineForWrite();
      const currentUser = requireUser();
      if (!isBillingSupportedPlatform()) {
        throw new Error(
          getBillingUnavailableMessage() ??
            "In-app purchases are not available in this build."
        );
      }

      await configureBilling(currentUser.id);
      const customerInfo = await restoreBillingPurchases();
      if (hasActivePremiumEntitlement(customerInfo)) {
        await syncSubscriptionsFromServer();
      }
      await refreshPremiumStatus();
    } catch (error) {
      captureError(error, {
        scope: "billing",
        operation: "restore_premium",
      });
      throw error;
    }
  }, [
    assertOnlineForWrite,
    requireUser,
    refreshPremiumStatus,
    syncSubscriptionsFromServer,
  ]);

  const exportPremiumCsv = useCallback(async () => {
    const lines = ["Type,Name/Note,Category/Source,Amount,Date,Related"];

    wallets.forEach((wallet) => {
      lines.push(
        `Wallet,"${wallet.name}",,${wallet.balance.toFixed(2)},"${wallet.createdAt}",`
      );
    });

    transactions.forEach((tx) => {
      const wallet = wallets.find((item) => item.id === tx.walletId);
      lines.push(
        `${tx.type},"${tx.note}",,${tx.amount.toFixed(2)},"${tx.date}","${wallet?.name ?? ""}"`
      );
    });

    incomes.forEach((income) => {
      lines.push(
        `Income,"${income.note}","${income.source}",${income.amount.toFixed(2)},"${income.date}",`
      );
    });

    expenses.forEach((expense) => {
      lines.push(
        `Expense,"${expense.note}","${expense.category}",${expense.amount.toFixed(2)},"${expense.date}",`
      );
    });

    loans.forEach((loan) => {
      lines.push(
        `Loan,"${loan.lender}",,${loan.principal.toFixed(2)},"${loan.startDate}","Balance: ${loan.balance.toFixed(2)}"`
      );
    });

    loanPayments.forEach((payment) => {
      const loan = loans.find((item) => item.id === payment.loanId);
      lines.push(
        `LoanPayment,"${payment.note}",,${payment.amount.toFixed(2)},"${payment.paymentDate}","${loan?.lender ?? ""}"`
      );
    });

    goals.forEach((goal) => {
      lines.push(
        `Goal,"${goal.name}",,${goal.targetAmount.toFixed(2)},"${goal.deadline}",`
      );
    });

    return lines.join("\n");
  }, [expenses, goals, incomes, loanPayments, loans, transactions, wallets]);

  const setCurrency = useCallback(async (cur: string, sym: string) => {
    await saveSettings({ currency: cur, currencySymbol: sym });
    setCurrencyState(cur);
    setCurrencySymbol(sym);
  }, []);

  const completeOnboarding = useCallback(async () => {
    await setOnboarded();
    setHasOnboarded(true);
  }, []);

  const authValue = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      isAuthenticated: Boolean(session?.user),
      hasOnboarded,
      isLoading,
    }),
    [session, user, hasOnboarded, isLoading]
  );

  const networkValue = useMemo<NetworkContextValue>(
    () => ({ isOnline }),
    [isOnline]
  );

  const preferencesValue = useMemo<PreferencesContextValue>(
    () => ({ currency, currencySymbol }),
    [currency, currencySymbol]
  );

  const subscriptionValue = useMemo<SubscriptionContextValue>(
    () => ({ subscriptions, isPremium }),
    [subscriptions, isPremium]
  );

  const financeMetricsValue = useMemo<FinanceMetricsContextValue>(
    () => ({ totalBalance, dashboardSummary, freePlanStatus }),
    [totalBalance, dashboardSummary, freePlanStatus]
  );

  const actionsValue = useMemo<ActionsContextValue>(
    () => ({
      refreshData,
      signIn,
      signUp,
      signOut,
      deleteAccount,
      addWallet,
      editWallet,
      removeWallet,
      addTransaction,
      removeTransaction,
      addGoal,
      editGoal,
      removeGoal,
      addExpense,
      editExpense,
      removeExpense,
      markRecurringExpensePaid,
      markRecurringExpenseUnpaid,
      addIncome,
      editIncome,
      removeIncome,
      addLoan,
      editLoan,
      removeLoan,
      addLoanPayment,
      removeLoanPayment,
      purchasePremium,
      restorePremium,
      refreshPremiumStatus,
      exportPremiumCsv,
      setCurrency,
      completeOnboarding,
    }),
    [
      refreshData,
      signIn,
      signUp,
      signOut,
      deleteAccount,
      addWallet,
      editWallet,
      removeWallet,
      addTransaction,
      removeTransaction,
      addGoal,
      editGoal,
      removeGoal,
      addExpense,
      editExpense,
      removeExpense,
      markRecurringExpensePaid,
      markRecurringExpenseUnpaid,
      addIncome,
      editIncome,
      removeIncome,
      addLoan,
      editLoan,
      removeLoan,
      addLoanPayment,
      removeLoanPayment,
      purchasePremium,
      restorePremium,
      refreshPremiumStatus,
      exportPremiumCsv,
      setCurrency,
      completeOnboarding,
    ]
  );

  return (
    <AuthContext.Provider value={authValue}>
      <NetworkContext.Provider value={networkValue}>
        <PreferencesContext.Provider value={preferencesValue}>
          <WalletsContext.Provider value={wallets}>
            <TransactionsContext.Provider value={transactions}>
              <GoalsContext.Provider value={goals}>
                <ExpensesContext.Provider value={expenses}>
                  <RecurringExpensesContext.Provider value={recurringExpenses}>
                    <IncomesContext.Provider value={incomes}>
                      <LoansContext.Provider value={loans}>
                        <LoanPaymentsContext.Provider value={loanPayments}>
                          <SubscriptionContext.Provider value={subscriptionValue}>
                            <FinanceMetricsContext.Provider value={financeMetricsValue}>
                              <ActionsContext.Provider value={actionsValue}>
                                {children}
                              </ActionsContext.Provider>
                            </FinanceMetricsContext.Provider>
                          </SubscriptionContext.Provider>
                        </LoanPaymentsContext.Provider>
                      </LoansContext.Provider>
                    </IncomesContext.Provider>
                  </RecurringExpensesContext.Provider>
                </ExpensesContext.Provider>
              </GoalsContext.Provider>
            </TransactionsContext.Provider>
          </WalletsContext.Provider>
        </PreferencesContext.Provider>
      </NetworkContext.Provider>
    </AuthContext.Provider>
  );
}

function useRequiredContext<T>(
  context: React.Context<T | null>,
  name: string
): T {
  const value = useContext(context);
  if (!value) {
    throw new Error(`${name} must be used inside AppProvider.`);
  }
  return value;
}

export function useAuth() {
  return useRequiredContext(AuthContext, "useAuth");
}

export function useNetwork() {
  return useRequiredContext(NetworkContext, "useNetwork");
}

export function usePreferences() {
  return useRequiredContext(PreferencesContext, "usePreferences");
}

export function useWallets() {
  return useRequiredContext(WalletsContext, "useWallets");
}

export function useTransactions() {
  return useRequiredContext(TransactionsContext, "useTransactions");
}

export function useGoals() {
  return useRequiredContext(GoalsContext, "useGoals");
}

export function useExpenses() {
  return useRequiredContext(ExpensesContext, "useExpenses");
}

export function useRecurringExpenses() {
  return useRequiredContext(RecurringExpensesContext, "useRecurringExpenses");
}

export function useIncomes() {
  return useRequiredContext(IncomesContext, "useIncomes");
}

export function useLoans() {
  return useRequiredContext(LoansContext, "useLoans");
}

export function useLoanPayments() {
  return useRequiredContext(LoanPaymentsContext, "useLoanPayments");
}

export function useSubscriptionState() {
  return useRequiredContext(SubscriptionContext, "useSubscriptionState");
}

export function useFinanceMetrics() {
  return useRequiredContext(FinanceMetricsContext, "useFinanceMetrics");
}

export function useActions() {
  return useRequiredContext(ActionsContext, "useActions");
}

export function useWalletsSelector<T>(selector: (wallets: Wallet[]) => T): T {
  return selector(useWallets());
}

export function useExpensesSelector<T>(selector: (expenses: Expense[]) => T): T {
  return selector(useExpenses());
}

// Legacy aggregate hook kept for compatibility.
// Prefer focused hooks in UI code to avoid broad subscriptions and unnecessary rerenders.
export function useApp(): AppContextValue {
  const auth = useAuth();
  const network = useNetwork();
  const preferences = usePreferences();
  const wallets = useWallets();
  const transactions = useTransactions();
  const goals = useGoals();
  const expenses = useExpenses();
  const recurringExpenses = useRecurringExpenses();
  const incomes = useIncomes();
  const loans = useLoans();
  const loanPayments = useLoanPayments();
  const { subscriptions, isPremium } = useSubscriptionState();
  const { totalBalance, dashboardSummary, freePlanStatus } = useFinanceMetrics();
  const actions = useActions();

  return {
    ...auth,
    ...network,
    ...preferences,
    wallets,
    transactions,
    goals,
    expenses,
    recurringExpenses,
    incomes,
    loans,
    loanPayments,
    subscriptions,
    isPremium,
    totalBalance,
    dashboardSummary,
    freePlanStatus,
    ...actions,
  };
}
