export const FREE_PLAN_LIMITS = {
  wallets: 2,
  goals: 3,
  loans: 1,
  monthlyTransactions: 40,
  monthlyExpenses: 60,
  monthlyIncomeLogs: 30,
  monthlyLoanPayments: 15,
} as const;

export const PREMIUM_ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_RC_ENTITLEMENT_ID ?? "premium";

export const PREMIUM_PRODUCT_IDS = {
  monthly:
    process.env.EXPO_PUBLIC_RC_PRODUCT_MONTHLY ?? "savewise_premium_monthly",
  yearly:
    process.env.EXPO_PUBLIC_RC_PRODUCT_YEARLY ?? "savewise_premium_yearly",
  lifetime:
    process.env.EXPO_PUBLIC_RC_PRODUCT_LIFETIME ?? "savewise_premium_lifetime",
} as const;

export type PremiumPlan = keyof typeof PREMIUM_PRODUCT_IDS;

export const PREMIUM_BENEFITS = [
  "Unlimited savings accounts",
  "Unlimited goals and loans",
  "Unlimited monthly logs",
  "Advanced reports and charts",
  "CSV export for backup and analysis",
] as const;

export function getFreeLimitMessage(
  feature: "wallets" | "goals" | "loans" | "transactions" | "expenses" | "incomes" | "loan_payments"
) {
  switch (feature) {
    case "wallets":
      return `Free plan supports up to ${FREE_PLAN_LIMITS.wallets} savings accounts. Upgrade for unlimited accounts.`;
    case "goals":
      return `Free plan supports up to ${FREE_PLAN_LIMITS.goals} goals. Upgrade for unlimited goals.`;
    case "loans":
      return `Free plan supports up to ${FREE_PLAN_LIMITS.loans} active loans. Upgrade for unlimited loans.`;
    case "transactions":
      return `Free plan supports up to ${FREE_PLAN_LIMITS.monthlyTransactions} savings transactions per month. Upgrade for unlimited logs.`;
    case "expenses":
      return `Free plan supports up to ${FREE_PLAN_LIMITS.monthlyExpenses} expense entries per month. Upgrade for unlimited logs.`;
    case "incomes":
      return `Free plan supports up to ${FREE_PLAN_LIMITS.monthlyIncomeLogs} income logs per month. Upgrade for unlimited logs.`;
    case "loan_payments":
      return `Free plan supports up to ${FREE_PLAN_LIMITS.monthlyLoanPayments} loan payment logs per month. Upgrade for unlimited logs.`;
    default:
      return "This action requires Premium.";
  }
}
