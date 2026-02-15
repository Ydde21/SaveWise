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
  years: number
): number {
  const r = annualRate / 100 / 12;
  const t = years * 12;

  if (r === 0) {
    return principal + monthlyDeposit * t;
  }

  const principalGrowth = principal * Math.pow(1 + r, t);
  const depositGrowth = monthlyDeposit * ((Math.pow(1 + r, t) - 1) / r);

  return principalGrowth + depositGrowth;
}

export function generateProjectionData(
  principal: number,
  monthlyDeposit: number,
  annualRate: number,
  months: number
): { month: number; balance: number; interest: number; deposits: number }[] {
  const data: {
    month: number;
    balance: number;
    interest: number;
    deposits: number;
  }[] = [];
  const r = annualRate / 100 / 12;
  let balance = principal;
  let totalInterest = 0;
  let totalDeposits = 0;

  data.push({ month: 0, balance: principal, interest: 0, deposits: 0 });

  for (let m = 1; m <= months; m++) {
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
