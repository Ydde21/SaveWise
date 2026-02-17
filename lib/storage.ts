import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

export interface Wallet {
  id: string;
  name: string;
  balance: number;
  interestRate: number;
  compoundingFrequency: "daily" | "monthly" | "quarterly" | "annually";
  currency: string;
  color: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  walletId: string;
  type: "deposit" | "withdrawal";
  amount: number;
  note: string;
  date: string;
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
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

export interface Expense {
  id: string;
  category: string;
  amount: number;
  note: string;
  date: string;
  createdAt: string;
}

export interface Loan {
  id: string;
  lender: string;
  principal: number;
  interestRate: number;
  termMonths: number;
  startDate: string;
  balance: number;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoanPayment {
  id: string;
  loanId: string;
  amount: number;
  paymentDate: string;
  note: string;
  createdAt: string;
}

export interface MonthlySnapshot {
  id: string;
  walletId: string;
  month: string;
  balance: number;
  interestEarned: number;
  deposited: number;
  withdrawn: number;
}

export const EXPENSE_CATEGORIES = [
  { key: "food", label: "Food & Dining", icon: "restaurant", color: "#F59E0B" },
  { key: "transport", label: "Transport", icon: "car", color: "#3B82F6" },
  { key: "bills", label: "Bills & Utilities", icon: "flash", color: "#EF4444" },
  { key: "shopping", label: "Shopping", icon: "bag-handle", color: "#EC4899" },
  { key: "health", label: "Health", icon: "heart", color: "#10B981" },
  { key: "entertainment", label: "Entertainment", icon: "game-controller", color: "#8B5CF6" },
  { key: "education", label: "Education", icon: "school", color: "#06B6D4" },
  { key: "rent", label: "Rent / Housing", icon: "home", color: "#F97316" },
  { key: "insurance", label: "Insurance", icon: "shield-checkmark", color: "#14B8A6" },
  { key: "subscriptions", label: "Subscriptions", icon: "card", color: "#6366F1" },
  { key: "travel", label: "Travel", icon: "airplane", color: "#0EA5E9" },
  { key: "personal", label: "Personal Care", icon: "person", color: "#D946EF" },
  { key: "gifts", label: "Gifts & Donations", icon: "gift", color: "#F43F5E" },
  { key: "other", label: "Other", icon: "ellipsis-horizontal", color: "#6B7280" },
];

const KEYS = {
  WALLETS: "savewise_wallets",
  TRANSACTIONS: "savewise_transactions",
  GOALS: "savewise_goals",
  EXPENSES: "savewise_expenses",
  LOANS: "savewise_loans",
  LOAN_PAYMENTS: "savewise_loan_payments",
  SNAPSHOTS: "savewise_snapshots",
  SETTINGS: "savewise_settings",
  ONBOARDED: "savewise_onboarded",
};

const LEGACY_FINANCIAL_KEYS = [
  KEYS.WALLETS,
  KEYS.TRANSACTIONS,
  KEYS.GOALS,
  KEYS.EXPENSES,
  KEYS.LOANS,
  KEYS.LOAN_PAYMENTS,
  KEYS.SNAPSHOTS,
];

function generateId(): string {
  return Crypto.randomUUID();
}

export const WALLET_COLORS = [
  "#0D6E4F",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#F59E0B",
  "#EF4444",
  "#06B6D4",
  "#84CC16",
];

export const WALLET_ICONS = [
  "wallet",
  "cash",
  "card",
  "business",
  "home",
  "car",
  "airplane",
  "school",
];

export const GOAL_ICONS = [
  "flag",
  "trophy",
  "star",
  "heart",
  "diamond",
  "rocket",
  "gift",
  "bulb",
];

async function getItems<T>(key: string): Promise<T[]> {
  const data = await AsyncStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

async function setItems<T>(key: string, items: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(items));
}

export async function getWallets(): Promise<Wallet[]> {
  return getItems<Wallet>(KEYS.WALLETS);
}

export async function getWallet(id: string): Promise<Wallet | undefined> {
  const wallets = await getWallets();
  return wallets.find((w) => w.id === id);
}

export async function createWallet(
  data: Omit<Wallet, "id" | "createdAt" | "updatedAt">
): Promise<Wallet> {
  const wallets = await getWallets();
  const wallet: Wallet = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  wallets.push(wallet);
  await setItems(KEYS.WALLETS, wallets);
  return wallet;
}

export async function updateWallet(
  id: string,
  data: Partial<Wallet>
): Promise<Wallet | undefined> {
  const wallets = await getWallets();
  const index = wallets.findIndex((w) => w.id === id);
  if (index === -1) return undefined;
  wallets[index] = {
    ...wallets[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };
  await setItems(KEYS.WALLETS, wallets);
  return wallets[index];
}

export async function deleteWallet(id: string): Promise<void> {
  let wallets = await getWallets();
  wallets = wallets.filter((w) => w.id !== id);
  await setItems(KEYS.WALLETS, wallets);
  let transactions = await getTransactions();
  transactions = transactions.filter((t) => t.walletId !== id);
  await setItems(KEYS.TRANSACTIONS, transactions);
}

export async function getTransactions(walletId?: string): Promise<Transaction[]> {
  const transactions = await getItems<Transaction>(KEYS.TRANSACTIONS);
  if (walletId) return transactions.filter((t) => t.walletId === walletId);
  return transactions;
}

export async function createTransaction(
  data: Omit<Transaction, "id" | "createdAt">
): Promise<Transaction> {
  const transactions = await getTransactions();
  const transaction: Transaction = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  transactions.push(transaction);
  await setItems(KEYS.TRANSACTIONS, transactions);

  const wallet = await getWallet(data.walletId);
  if (wallet) {
    const newBalance =
      data.type === "deposit"
        ? wallet.balance + data.amount
        : wallet.balance - data.amount;
    await updateWallet(data.walletId, { balance: Math.max(0, newBalance) });
  }

  return transaction;
}

export async function deleteTransaction(id: string): Promise<void> {
  const transactions = await getTransactions();
  const transaction = transactions.find((t) => t.id === id);
  if (transaction) {
    const wallet = await getWallet(transaction.walletId);
    if (wallet) {
      const revertBalance =
        transaction.type === "deposit"
          ? wallet.balance - transaction.amount
          : wallet.balance + transaction.amount;
      await updateWallet(transaction.walletId, {
        balance: Math.max(0, revertBalance),
      });
    }
  }
  await setItems(
    KEYS.TRANSACTIONS,
    transactions.filter((t) => t.id !== id)
  );
}

export async function getGoals(): Promise<SavingsGoal[]> {
  return getItems<SavingsGoal>(KEYS.GOALS);
}

export async function createGoal(
  data: Omit<SavingsGoal, "id" | "createdAt" | "updatedAt">
): Promise<SavingsGoal> {
  const goals = await getGoals();
  const goal: SavingsGoal = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  goals.push(goal);
  await setItems(KEYS.GOALS, goals);
  return goal;
}

export async function updateGoal(
  id: string,
  data: Partial<SavingsGoal>
): Promise<SavingsGoal | undefined> {
  const goals = await getGoals();
  const index = goals.findIndex((g) => g.id === id);
  if (index === -1) return undefined;
  goals[index] = {
    ...goals[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };
  await setItems(KEYS.GOALS, goals);
  return goals[index];
}

export async function deleteGoal(id: string): Promise<void> {
  let goals = await getGoals();
  goals = goals.filter((g) => g.id !== id);
  await setItems(KEYS.GOALS, goals);
}

export async function getExpenses(): Promise<Expense[]> {
  return getItems<Expense>(KEYS.EXPENSES);
}

export async function createExpense(
  data: Omit<Expense, "id" | "createdAt">
): Promise<Expense> {
  const expenses = await getExpenses();
  const expense: Expense = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  expenses.push(expense);
  await setItems(KEYS.EXPENSES, expenses);
  return expense;
}

export async function deleteExpense(id: string): Promise<void> {
  let expenses = await getExpenses();
  expenses = expenses.filter((e) => e.id !== id);
  await setItems(KEYS.EXPENSES, expenses);
}

export async function getLoans(): Promise<Loan[]> {
  return getItems<Loan>(KEYS.LOANS);
}

export async function getLoan(id: string): Promise<Loan | undefined> {
  const loans = await getLoans();
  return loans.find((l) => l.id === id);
}

export async function createLoan(
  data: Omit<Loan, "id" | "createdAt" | "updatedAt">
): Promise<Loan> {
  const loans = await getLoans();
  const loan: Loan = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  loans.push(loan);
  await setItems(KEYS.LOANS, loans);
  return loan;
}

export async function updateLoan(
  id: string,
  data: Partial<Loan>
): Promise<Loan | undefined> {
  const loans = await getLoans();
  const index = loans.findIndex((l) => l.id === id);
  if (index === -1) return undefined;
  loans[index] = {
    ...loans[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };
  await setItems(KEYS.LOANS, loans);
  return loans[index];
}

export async function deleteLoan(id: string): Promise<void> {
  let loans = await getLoans();
  loans = loans.filter((l) => l.id !== id);
  await setItems(KEYS.LOANS, loans);
  let payments = await getLoanPayments();
  payments = payments.filter((p) => p.loanId !== id);
  await setItems(KEYS.LOAN_PAYMENTS, payments);
}

export async function getLoanPayments(loanId?: string): Promise<LoanPayment[]> {
  const payments = await getItems<LoanPayment>(KEYS.LOAN_PAYMENTS);
  if (loanId) return payments.filter((p) => p.loanId === loanId);
  return payments;
}

export async function createLoanPayment(
  data: Omit<LoanPayment, "id" | "createdAt">
): Promise<LoanPayment> {
  const payments = await getLoanPayments();
  const payment: LoanPayment = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  payments.push(payment);
  await setItems(KEYS.LOAN_PAYMENTS, payments);

  const loan = await getLoan(data.loanId);
  if (loan) {
    const newBalance = Math.max(0, loan.balance - data.amount);
    await updateLoan(data.loanId, { balance: newBalance });
  }

  return payment;
}

export async function deleteLoanPayment(id: string): Promise<void> {
  const payments = await getLoanPayments();
  const payment = payments.find((p) => p.id === id);
  if (payment) {
    const loan = await getLoan(payment.loanId);
    if (loan) {
      await updateLoan(payment.loanId, {
        balance: loan.balance + payment.amount,
      });
    }
  }
  await setItems(
    KEYS.LOAN_PAYMENTS,
    payments.filter((p) => p.id !== id)
  );
}

export async function isOnboarded(): Promise<boolean> {
  const value = await AsyncStorage.getItem(KEYS.ONBOARDED);
  return value === "true";
}

export async function setOnboarded(): Promise<void> {
  await AsyncStorage.setItem(KEYS.ONBOARDED, "true");
}

export async function getSettings(): Promise<{
  currency: string;
  currencySymbol: string;
}> {
  const data = await AsyncStorage.getItem(KEYS.SETTINGS);
  return data ? JSON.parse(data) : { currency: "USD", currencySymbol: "$" };
}

export async function saveSettings(settings: {
  currency: string;
  currencySymbol: string;
}): Promise<void> {
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

export async function clearLegacyFinancialData(): Promise<void> {
  await AsyncStorage.multiRemove(LEGACY_FINANCIAL_KEYS);
}

export async function exportData(): Promise<string> {
  const wallets = await getWallets();
  const transactions = await getTransactions();
  const goals = await getGoals();
  const expenses = await getExpenses();
  const loans = await getLoans();
  const loanPayments = await getLoanPayments();

  let csv = "Type,Name/Note,Category,Amount,Date,Related\n";

  for (const w of wallets) {
    csv += `Wallet,"${w.name}",,${w.balance},${w.createdAt},\n`;
  }

  for (const t of transactions) {
    const wallet = wallets.find((w) => w.id === t.walletId);
    csv += `${t.type},"${t.note}",,${t.amount},${t.date},"${wallet?.name || ""}"\n`;
  }

  for (const e of expenses) {
    csv += `Expense,"${e.note}","${e.category}",${e.amount},${e.date},\n`;
  }

  for (const l of loans) {
    csv += `Loan,"${l.lender}",,${l.principal},${l.startDate},Balance: ${l.balance}\n`;
  }

  for (const p of loanPayments) {
    const loan = loans.find((l) => l.id === p.loanId);
    csv += `LoanPayment,"${p.note}",,${p.amount},${p.paymentDate},"${loan?.lender || ""}"\n`;
  }

  for (const g of goals) {
    csv += `Goal,"${g.name}",,${g.targetAmount},${g.deadline},\n`;
  }

  return csv;
}
