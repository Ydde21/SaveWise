import { supabase } from "@/lib/supabase";
import type { Loan, LoanPayment } from "@/lib/types";
import {
  asNumber,
  getPaginationRange,
  requireData,
} from "@/lib/repositories/helpers";

type LoanRow = {
  id: string;
  user_id: string;
  lender: string;
  principal: number | string;
  interest_rate: number | string;
  term_months: number;
  start_date: string;
  balance: number | string;
  monthly_payment?: number | string | null;
  color: string;
  created_at: string;
  updated_at: string;
};

type LoanPaymentRow = {
  id: string;
  user_id: string;
  loan_id: string;
  amount: number | string;
  payment_date: string;
  note: string;
  created_at: string;
};

function mapLoan(row: LoanRow): Loan {
  return {
    id: row.id,
    userId: row.user_id,
    lender: row.lender,
    principal: asNumber(row.principal),
    interestRate: asNumber(row.interest_rate),
    termMonths: row.term_months,
    startDate: row.start_date,
    balance: asNumber(row.balance),
    monthlyPayment:
      row.monthly_payment === undefined || row.monthly_payment === null
        ? null
        : asNumber(row.monthly_payment),
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPayment(row: LoanPaymentRow): LoanPayment {
  return {
    id: row.id,
    userId: row.user_id,
    loanId: row.loan_id,
    amount: asNumber(row.amount),
    paymentDate: row.payment_date,
    note: row.note,
    createdAt: row.created_at,
  };
}

export const loanRepository = {
  async list(input?: {
    limit?: number;
    offset?: number;
  }): Promise<Loan[]> {
    const pagination = getPaginationRange(input);
    const { data, error } = await supabase
      .from("loans")
      .select("*")
      .order("created_at", { ascending: false })
      .range(pagination.from, pagination.to);
    const rows = requireData(data as LoanRow[] | null, error);
    return rows.map(mapLoan);
  },

  async getById(id: string): Promise<Loan | null> {
    const { data, error } = await supabase
      .from("loans")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return mapLoan(data as LoanRow);
  },

  async create(input: {
    userId: string;
    lender: string;
    principal: number;
    interestRate: number;
    termMonths: number;
    startDate: string;
    balance: number;
    color: string;
  }): Promise<Loan> {
    const { data, error } = await supabase
      .from("loans")
      .insert({
        user_id: input.userId,
        lender: input.lender,
        principal: input.principal,
        interest_rate: input.interestRate,
        term_months: input.termMonths,
        start_date: input.startDate,
        balance: input.balance,
        color: input.color,
      })
      .select("*")
      .single();
    const row = requireData(data as LoanRow | null, error);
    return mapLoan(row);
  },

  async update(
    id: string,
    patch: Partial<{
      lender: string;
      principal: number;
      interestRate: number;
      termMonths: number;
      startDate: string;
      balance: number;
      color: string;
    }>
  ): Promise<Loan> {
    const { data, error } = await supabase
      .from("loans")
      .update({
        lender: patch.lender,
        principal: patch.principal,
        interest_rate: patch.interestRate,
        term_months: patch.termMonths,
        start_date: patch.startDate,
        balance: patch.balance,
        color: patch.color,
      })
      .eq("id", id)
      .select("*")
      .single();
    const row = requireData(data as LoanRow | null, error);
    return mapLoan(row);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("loans").delete().eq("id", id);
    if (error) throw error;
  },
};

export const loanPaymentRepository = {
  async list(input?: {
    limit?: number;
    offset?: number;
  }): Promise<LoanPayment[]> {
    const pagination = getPaginationRange(input);
    const { data, error } = await supabase
      .from("loan_payments")
      .select("*")
      .order("payment_date", { ascending: false })
      .range(pagination.from, pagination.to);
    const rows = requireData(data as LoanPaymentRow[] | null, error);
    return rows.map(mapPayment);
  },

  async create(input: {
    userId: string;
    loanId: string;
    amount: number;
    paymentDate: string;
    note: string;
  }): Promise<LoanPayment> {
    const { data, error } = await supabase.rpc("create_loan_payment_atomic", {
      p_loan_id: input.loanId,
      p_amount: input.amount,
      p_note: input.note,
      p_payment_date: input.paymentDate,
    });
    const raw = Array.isArray(data) ? data[0] : data;
    const row = requireData(raw as LoanPaymentRow | null, error);
    return mapPayment(row);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.rpc("delete_loan_payment_atomic", {
      p_payment_id: id,
    });
    if (error) throw error;
  },
};
