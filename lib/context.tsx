import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  ReactNode,
} from "react";
import {
  Wallet,
  Transaction,
  SavingsGoal,
  getWallets,
  getTransactions,
  getGoals,
  createWallet as createWalletStorage,
  updateWallet as updateWalletStorage,
  deleteWallet as deleteWalletStorage,
  createTransaction as createTransactionStorage,
  deleteTransaction as deleteTransactionStorage,
  createGoal as createGoalStorage,
  updateGoal as updateGoalStorage,
  deleteGoal as deleteGoalStorage,
  getSettings,
  saveSettings,
  isOnboarded,
  setOnboarded,
} from "./storage";

interface AppContextValue {
  wallets: Wallet[];
  transactions: Transaction[];
  goals: SavingsGoal[];
  currency: string;
  currencySymbol: string;
  hasOnboarded: boolean;
  isLoading: boolean;
  totalBalance: number;
  refreshData: () => Promise<void>;
  addWallet: (
    data: Omit<Wallet, "id" | "createdAt" | "updatedAt">
  ) => Promise<Wallet>;
  editWallet: (id: string, data: Partial<Wallet>) => Promise<void>;
  removeWallet: (id: string) => Promise<void>;
  addTransaction: (
    data: Omit<Transaction, "id" | "createdAt">
  ) => Promise<Transaction>;
  removeTransaction: (id: string) => Promise<void>;
  addGoal: (
    data: Omit<SavingsGoal, "id" | "createdAt" | "updatedAt">
  ) => Promise<SavingsGoal>;
  editGoal: (id: string, data: Partial<SavingsGoal>) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
  setCurrency: (currency: string, symbol: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [currency, setCurrencyState] = useState("USD");
  const [currencySymbol, setCurrencySymbol] = useState("$");
  const [hasOnboarded, setHasOnboarded] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const refreshData = useCallback(async () => {
    const [w, t, g, s, o] = await Promise.all([
      getWallets(),
      getTransactions(),
      getGoals(),
      getSettings(),
      isOnboarded(),
    ]);
    setWallets(w);
    setTransactions(t);
    setGoals(g);
    setCurrencyState(s.currency);
    setCurrencySymbol(s.currencySymbol);
    setHasOnboarded(o);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const totalBalance = useMemo(
    () => wallets.reduce((sum, w) => sum + w.balance, 0),
    [wallets]
  );

  const addWallet = useCallback(
    async (data: Omit<Wallet, "id" | "createdAt" | "updatedAt">) => {
      const wallet = await createWalletStorage(data);
      setWallets((prev) => [...prev, wallet]);
      return wallet;
    },
    []
  );

  const editWallet = useCallback(
    async (id: string, data: Partial<Wallet>) => {
      await updateWalletStorage(id, data);
      setWallets((prev) =>
        prev.map((w) => (w.id === id ? { ...w, ...data } : w))
      );
    },
    []
  );

  const removeWallet = useCallback(
    async (id: string) => {
      await deleteWalletStorage(id);
      setWallets((prev) => prev.filter((w) => w.id !== id));
      setTransactions((prev) => prev.filter((t) => t.walletId !== id));
    },
    []
  );

  const addTransaction = useCallback(
    async (data: Omit<Transaction, "id" | "createdAt">) => {
      const transaction = await createTransactionStorage(data);
      setTransactions((prev) => [...prev, transaction]);
      await refreshData();
      return transaction;
    },
    [refreshData]
  );

  const removeTransaction = useCallback(
    async (id: string) => {
      await deleteTransactionStorage(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      await refreshData();
    },
    [refreshData]
  );

  const addGoal = useCallback(
    async (data: Omit<SavingsGoal, "id" | "createdAt" | "updatedAt">) => {
      const goal = await createGoalStorage(data);
      setGoals((prev) => [...prev, goal]);
      return goal;
    },
    []
  );

  const editGoal = useCallback(
    async (id: string, data: Partial<SavingsGoal>) => {
      await updateGoalStorage(id, data);
      setGoals((prev) =>
        prev.map((g) => (g.id === id ? { ...g, ...data } : g))
      );
    },
    []
  );

  const removeGoal = useCallback(
    async (id: string) => {
      await deleteGoalStorage(id);
      setGoals((prev) => prev.filter((g) => g.id !== id));
    },
    []
  );

  const setCurrency = useCallback(
    async (cur: string, sym: string) => {
      await saveSettings({ currency: cur, currencySymbol: sym });
      setCurrencyState(cur);
      setCurrencySymbol(sym);
    },
    []
  );

  const completeOnboarding = useCallback(async () => {
    await setOnboarded();
    setHasOnboarded(true);
  }, []);

  const value = useMemo(
    () => ({
      wallets,
      transactions,
      goals,
      currency,
      currencySymbol,
      hasOnboarded,
      isLoading,
      totalBalance,
      refreshData,
      addWallet,
      editWallet,
      removeWallet,
      addTransaction,
      removeTransaction,
      addGoal,
      editGoal,
      removeGoal,
      setCurrency,
      completeOnboarding,
    }),
    [
      wallets,
      transactions,
      goals,
      currency,
      currencySymbol,
      hasOnboarded,
      isLoading,
      totalBalance,
      refreshData,
      addWallet,
      editWallet,
      removeWallet,
      addTransaction,
      removeTransaction,
      addGoal,
      editGoal,
      removeGoal,
      setCurrency,
      completeOnboarding,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
