import type {
  Expense,
  Income,
  Loan,
  LoanPayment,
  SavingsGoal,
  Subscription,
  Transaction,
  Wallet,
} from "@/lib/types";

export interface WalletRepository {
  list(input?: { limit?: number; offset?: number }): Promise<Wallet[]>;
  getById(id: string): Promise<Wallet | null>;
  create(input: Omit<Wallet, "id" | "createdAt" | "updatedAt">): Promise<Wallet>;
  update(
    id: string,
    patch: Partial<Omit<Wallet, "id" | "createdAt" | "updatedAt" | "userId">>
  ): Promise<Wallet>;
  remove(id: string): Promise<void>;
}

export interface TransactionRepository {
  list(input?: { limit?: number; offset?: number }): Promise<Transaction[]>;
  create(
    input: Omit<Transaction, "id" | "createdAt">
  ): Promise<Transaction>;
  remove(id: string): Promise<void>;
}

export interface GoalRepository {
  list(input?: { limit?: number; offset?: number }): Promise<SavingsGoal[]>;
  create(
    input: Omit<SavingsGoal, "id" | "createdAt" | "updatedAt">
  ): Promise<SavingsGoal>;
  update(
    id: string,
    patch: Partial<
      Omit<SavingsGoal, "id" | "createdAt" | "updatedAt" | "userId">
    >
  ): Promise<SavingsGoal>;
  remove(id: string): Promise<void>;
}

export interface ExpenseRepository {
  list(input?: { limit?: number; offset?: number }): Promise<Expense[]>;
  create(input: Omit<Expense, "id" | "createdAt">): Promise<Expense>;
  update(
    id: string,
    patch: Partial<Omit<Expense, "id" | "createdAt" | "userId">>
  ): Promise<Expense>;
  remove(id: string): Promise<void>;
}

export interface IncomeRepository {
  list(input?: { limit?: number; offset?: number }): Promise<Income[]>;
  create(input: Omit<Income, "id" | "createdAt">): Promise<Income>;
  update(
    id: string,
    patch: Partial<Omit<Income, "id" | "createdAt" | "userId">>
  ): Promise<Income>;
  remove(id: string): Promise<void>;
}

export interface LoanRepository {
  list(input?: { limit?: number; offset?: number }): Promise<Loan[]>;
  getById(id: string): Promise<Loan | null>;
  create(input: Omit<Loan, "id" | "createdAt" | "updatedAt">): Promise<Loan>;
  update(
    id: string,
    patch: Partial<Omit<Loan, "id" | "createdAt" | "updatedAt" | "userId">>
  ): Promise<Loan>;
  remove(id: string): Promise<void>;
}

export interface LoanPaymentRepository {
  list(input?: { limit?: number; offset?: number }): Promise<LoanPayment[]>;
  create(
    input: Omit<LoanPayment, "id" | "createdAt">
  ): Promise<LoanPayment>;
  remove(id: string): Promise<void>;
}

export interface SubscriptionRepository {
  list(input?: { limit?: number; offset?: number }): Promise<Subscription[]>;
}
