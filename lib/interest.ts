export function getCompoundingPeriods(
  frequency: "daily" | "monthly" | "quarterly" | "annually"
): number {
  switch (frequency) {
    case "daily":
      return 365;
    case "monthly":
      return 12;
    case "quarterly":
      return 4;
    case "annually":
      return 1;
  }
}

export function getEffectiveMonthlyRate(
  annualRate: number,
  compoundingFrequency: "daily" | "monthly" | "quarterly" | "annually" = "monthly"
): number {
  const n = getCompoundingPeriods(compoundingFrequency);
  const r = annualRate / 100;
  if (r === 0) return 0;
  return Math.pow(1 + r / n, n / 12) - 1;
}

export function compoundInterest(
  principal: number,
  annualRate: number,
  compoundingFrequency: "daily" | "monthly" | "quarterly" | "annually",
  years: number
): number {
  const n = getCompoundingPeriods(compoundingFrequency);
  const r = annualRate / 100;
  return principal * Math.pow(1 + r / n, n * years);
}

export function futureValueWithDeposits(
  principal: number,
  monthlyDeposit: number,
  annualRate: number,
  years: number,
  compoundingFrequency: "daily" | "monthly" | "quarterly" | "annually" = "monthly"
): number {
  const months = Math.max(0, Math.round(years * 12));
  const data = generateProjectionData(
    principal,
    monthlyDeposit,
    annualRate,
    months,
    compoundingFrequency
  );
  return data[data.length - 1]?.balance ?? principal;
}

export function generateProjectionData(
  principal: number,
  monthlyDeposit: number,
  annualRate: number,
  months: number,
  compoundingFrequency: "daily" | "monthly" | "quarterly" | "annually" = "monthly"
): { month: number; balance: number; interest: number; deposits: number }[] {
  const data: {
    month: number;
    balance: number;
    interest: number;
    deposits: number;
  }[] = [];
  const r = getEffectiveMonthlyRate(annualRate, compoundingFrequency);
  const totalMonths = Math.max(0, Math.floor(months));
  let balance = principal;
  let totalInterest = 0;
  let totalDeposits = 0;

  data.push({ month: 0, balance: principal, interest: 0, deposits: 0 });

  for (let m = 1; m <= totalMonths; m++) {
    const interestThisMonth = balance * r;
    totalInterest += interestThisMonth;
    totalDeposits += monthlyDeposit;
    balance = balance + interestThisMonth + monthlyDeposit;

    data.push({
      month: m,
      balance: Math.round(balance * 100) / 100,
      interest: Math.round(totalInterest * 100) / 100,
      deposits: Math.round(totalDeposits * 100) / 100,
    });
  }

  return data;
}

export function generatePortfolioProjection(
  wallets: Array<{
    balance: number;
    interestRate: number;
    compoundingFrequency: "daily" | "monthly" | "quarterly" | "annually";
  }>,
  months: number
): { month: number; balance: number }[] {
  const totalMonths = Math.max(0, Math.floor(months));
  if (!wallets.length) {
    return generateProjectionData(0, 0, 0, totalMonths).map((point) => ({
      month: point.month,
      balance: point.balance,
    }));
  }

  const monthlySeries = wallets.map((wallet) =>
    generateProjectionData(
      wallet.balance,
      0,
      wallet.interestRate,
      totalMonths,
      wallet.compoundingFrequency
    )
  );

  return Array.from({ length: totalMonths + 1 }).map((_, monthIndex) => {
    const balance = monthlySeries.reduce(
      (sum, series) => sum + (series[monthIndex]?.balance ?? 0),
      0
    );
    return {
      month: monthIndex,
      balance: Math.round(balance * 100) / 100,
    };
  });
}

export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  termMonths: number
): number {
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / termMonths;
  return (principal * r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
}

export function calculateTotalLoanInterest(
  principal: number,
  annualRate: number,
  termMonths: number
): number {
  const monthly = calculateMonthlyPayment(principal, annualRate, termMonths);
  return monthly * termMonths - principal;
}

export function generateAmortizationSchedule(
  principal: number,
  annualRate: number,
  termMonths: number
): {
  month: number;
  payment: number;
  principalPortion: number;
  interestPortion: number;
  remainingBalance: number;
}[] {
  const r = annualRate / 100 / 12;
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, termMonths);
  const schedule: {
    month: number;
    payment: number;
    principalPortion: number;
    interestPortion: number;
    remainingBalance: number;
  }[] = [];

  let remaining = principal;

  for (let m = 1; m <= termMonths; m++) {
    const interestPortion = remaining * r;
    const principalPortion = monthlyPayment - interestPortion;
    remaining = Math.max(0, remaining - principalPortion);

    schedule.push({
      month: m,
      payment: Math.round(monthlyPayment * 100) / 100,
      principalPortion: Math.round(principalPortion * 100) / 100,
      interestPortion: Math.round(interestPortion * 100) / 100,
      remainingBalance: Math.round(remaining * 100) / 100,
    });
  }

  return schedule;
}

export function generateLoanPayoffProjection(
  currentBalance: number,
  annualRate: number,
  monthlyPayment: number,
  months: number
): { month: number; balance: number }[] {
  const r = annualRate / 100 / 12;
  const data: { month: number; balance: number }[] = [];
  let balance = currentBalance;

  data.push({ month: 0, balance: currentBalance });

  for (let m = 1; m <= months; m++) {
    const interest = balance * r;
    balance = Math.max(0, balance + interest - monthlyPayment);
    data.push({
      month: m,
      balance: Math.round(balance * 100) / 100,
    });
    if (balance <= 0) break;
  }

  return data;
}

export function formatCurrency(amount: number, symbol: string = "$"): string {
  const abs = Math.abs(amount);
  const formatted =
    abs >= 1000000
      ? `${(abs / 1000000).toFixed(1)}M`
      : abs >= 1000
        ? `${(abs / 1000).toFixed(1)}K`
        : abs.toFixed(2);

  return `${amount < 0 ? "-" : ""}${symbol}${formatted}`;
}

export function formatFullCurrency(
  amount: number,
  symbol: string = "$"
): string {
  return `${amount < 0 ? "-" : ""}${symbol}${Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function calculateNetBalance(
  totalSavings: number,
  totalExpenses: number,
  outstandingLoans: number
): number {
  return totalSavings - totalExpenses - outstandingLoans;
}

export function calculateMonthlyCashflow(
  monthlyIncome: number,
  monthlyExpenses: number
): number {
  return monthlyIncome - monthlyExpenses;
}

export function sumAmounts<T extends { amount: number }>(items: T[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

export function getMonthKey(dateValue: string): string {
  const d = new Date(dateValue);
  return `${d.getUTCFullYear()}-${`${d.getUTCMonth() + 1}`.padStart(2, "0")}`;
}

export function getCurrentMonthTotals<T extends { amount: number; date: string }>(
  items: T[],
  monthKey: string = getMonthKey(new Date().toISOString())
): number {
  return items
    .filter((item) => getMonthKey(item.date) === monthKey)
    .reduce((sum, item) => sum + item.amount, 0);
}

export function getGoalAdjustedMonthlyCapacity(params: {
  monthlyIncome: number;
  monthlyExpenses: number;
  totalMonthlyLoanPayment: number;
}): number {
  const { monthlyIncome, monthlyExpenses, totalMonthlyLoanPayment } = params;
  return Math.max(0, monthlyIncome - monthlyExpenses - totalMonthlyLoanPayment);
}
