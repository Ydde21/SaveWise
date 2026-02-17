import React, { useMemo } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useApp } from "@/lib/context";
import {
  calculateMonthlyPayment,
  formatFullCurrency,
  generateLoanPayoffProjection,
  generatePortfolioProjection,
} from "@/lib/interest";
import {
  buildExpenseCategoryBreakdown,
  buildMonthlyExpenseIncomeSnapshot,
} from "@/lib/expense-insights";
import { getUtcMonthKey } from "@/lib/expense-recurrence";
import { ProjectionChart } from "@/components/ProjectionChart";
import { CashFlowBarChart } from "@/components/CashFlowBarChart";
import { LoanPayoffChart } from "@/components/LoanPayoffChart";

function formatCategoryLabel(categoryKey: string): string {
  return categoryKey
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const {
    wallets,
    loans,
    loanPayments,
    goals,
    expenses,
    dashboardSummary,
    currencySymbol,
  } = useApp();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const savingsProjection = useMemo(() => {
    return generatePortfolioProjection(wallets, 12);
  }, [wallets]);

  const projectedGrowth = useMemo(() => {
    if (savingsProjection.length < 2) return 0;
    return (
      savingsProjection[savingsProjection.length - 1].balance -
      dashboardSummary.totalSavings
    );
  }, [savingsProjection, dashboardSummary.totalSavings]);

  const currentMonthKey = useMemo(() => getUtcMonthKey(new Date()), []);

  const monthlySnapshot = useMemo(() => {
    return buildMonthlyExpenseIncomeSnapshot({
      expenses,
      incomes: [],
      monthKey: currentMonthKey,
    });
  }, [currentMonthKey, expenses]);

  const monthlyExpenseBreakdown = useMemo(() => {
    const categories = Array.from(
      new Set(monthlySnapshot.monthlyExpenses.map((item) => item.category))
    ).map((key) => ({
      key,
      label: formatCategoryLabel(key),
      icon: "receipt",
      color: Colors.primary,
    }));

    return buildExpenseCategoryBreakdown({
      expenses: monthlySnapshot.monthlyExpenses,
      categories,
      limit: 3,
    });
  }, [monthlySnapshot.monthlyExpenses]);

  const topLoan = useMemo(() => {
    if (!loans.length) return null;
    return [...loans].sort((a, b) => b.balance - a.balance)[0];
  }, [loans]);

  const loanProjection = useMemo(() => {
    if (!topLoan) return [];
    const monthlyPayment = calculateMonthlyPayment(
      topLoan.principal,
      topLoan.interestRate,
      topLoan.termMonths
    );
    return generateLoanPayoffProjection(
      topLoan.balance,
      topLoan.interestRate,
      monthlyPayment,
      topLoan.termMonths
    );
  }, [topLoan]);

  const loanTimeline = useMemo(() => {
    if (!topLoan) return { nextDue: null as Date | null, payoffDate: null as Date | null };

    const relatedPayments = loanPayments
      .filter((payment) => payment.loanId === topLoan.id)
      .sort(
        (a, b) =>
          new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
      );

    const base = relatedPayments.length
      ? new Date(relatedPayments[0].paymentDate)
      : new Date(topLoan.startDate);

    const nextDue = new Date(base);
    nextDue.setMonth(nextDue.getMonth() + 1);

    const monthsRemaining = Math.max(loanProjection.length - 1, 0);
    const payoffDate = new Date(base);
    payoffDate.setMonth(payoffDate.getMonth() + monthsRemaining);

    return { nextDue, payoffDate };
  }, [loanPayments, loanProjection.length, topLoan]);

  const goalsProgress = useMemo(() => {
    if (dashboardSummary.goalsTargetTotal <= 0) return 0;
    return Math.min(
      dashboardSummary.goalsCurrentTotal / dashboardSummary.goalsTargetTotal,
      1
    );
  }, [dashboardSummary.goalsCurrentTotal, dashboardSummary.goalsTargetTotal]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 16 + webTopInset,
          paddingBottom: insets.bottom + 124,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>Net Balance</Text>
          <Text style={styles.headerAmount}>
            {formatFullCurrency(dashboardSummary.netBalance, currencySymbol)}
          </Text>
        </View>
        <Pressable style={styles.reportsButton} onPress={() => router.push("/reports")}>
          <Ionicons name="analytics" size={16} color={Colors.primary} />
          <Text style={styles.reportsButtonText}>Reports</Text>
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Savings</Text>
          <Text style={styles.statValue}>
            {formatFullCurrency(dashboardSummary.totalSavings, currencySymbol)}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Outstanding Loans</Text>
          <Text style={[styles.statValue, { color: Colors.danger }]}>
            {formatFullCurrency(dashboardSummary.outstandingLoans, currencySymbol)}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Savings Growth (12 Months)</Text>
          <Text style={styles.cardBadge}>
            +{formatFullCurrency(projectedGrowth, currencySymbol)}
          </Text>
        </View>
        <ProjectionChart
          data={savingsProjection}
          width={width - 64}
          height={190}
          currencySymbol={currencySymbol}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Monthly Income vs Expenses</Text>
        <CashFlowBarChart
          income={dashboardSummary.monthlyIncome}
          expenses={dashboardSummary.monthlyExpenses}
          currencySymbol={currencySymbol}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.card}>
          <View style={styles.snapshotHeader}>
            <Text style={styles.snapshotTitle}>Spending Snapshot (This Month)</Text>
            <Pressable
              style={styles.snapshotCta}
              onPress={() => router.push("/(tabs)/expenses")}
            >
              <Text style={styles.snapshotCtaText}>View Details</Text>
            </Pressable>
          </View>
          <Text style={styles.snapshotAmount}>
            {formatFullCurrency(monthlySnapshot.monthlyExpenseTotal, currencySymbol)}
          </Text>
          <Text style={styles.snapshotMeta}>
            {monthlySnapshot.monthlyExpenseCount} expense
            {monthlySnapshot.monthlyExpenseCount === 1 ? "" : "s"} this month
          </Text>
          {monthlyExpenseBreakdown.length > 0 ? (
            <View style={styles.snapshotRows}>
              {monthlyExpenseBreakdown.map((item) => (
                <View key={item.key} style={styles.snapshotRow}>
                  <Text style={styles.snapshotLabel}>{item.label}</Text>
                  <Text style={styles.snapshotValue}>
                    {formatFullCurrency(item.amount, currencySymbol)}{" "}
                    ({(item.share * 100).toFixed(0)}%)
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyLegend}>No expenses recorded this month.</Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Loan Summary</Text>
        <View style={styles.card}>
          <View style={styles.loanSummaryTop}>
            <Text style={styles.loanSummaryLabel}>Total outstanding</Text>
            <Text style={styles.loanSummaryValue}>
              {formatFullCurrency(dashboardSummary.outstandingLoans, currencySymbol)}
            </Text>
          </View>
          {topLoan ? (
            <>
              <Text style={styles.loanSubTitle}>Top balance: {topLoan.lender}</Text>
              <Text style={styles.loanSubMeta}>
                Next due:{" "}
                {loanTimeline.nextDue
                  ? loanTimeline.nextDue.toLocaleDateString()
                  : "N/A"}
              </Text>
              <Text style={styles.loanSubMeta}>
                Projected payoff:{" "}
                {loanTimeline.payoffDate
                  ? loanTimeline.payoffDate.toLocaleDateString()
                  : "N/A"}
              </Text>
              <LoanPayoffChart
                data={loanProjection}
                width={width - 64}
                height={190}
                currencySymbol={currencySymbol}
              />
            </>
          ) : (
            <Text style={styles.emptyLegend}>No loans yet.</Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Goals Summary</Text>
        <View style={styles.card}>
          <Text style={styles.goalAmount}>
            {formatFullCurrency(dashboardSummary.goalsCurrentTotal, currencySymbol)} /{" "}
            {formatFullCurrency(dashboardSummary.goalsTargetTotal, currencySymbol)}
          </Text>
          <View style={styles.goalTrack}>
            <View
              style={[
                styles.goalFill,
                { width: `${Math.round(goalsProgress * 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.goalText}>
            {goals.length} goals • {Math.round(goalsProgress * 100)}% complete
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  headerLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: "DMSans_400Regular",
  },
  headerAmount: {
    marginTop: 4,
    fontSize: 30,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
  },
  reportsButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: Colors.primary + "14",
  },
  reportsButtonText: {
    fontSize: 12,
    color: Colors.primary,
    fontFamily: "DMSans_600SemiBold",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: "DMSans_500Medium",
  },
  statValue: {
    marginTop: 4,
    fontSize: 16,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 15,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
  },
  cardBadge: {
    fontSize: 12,
    color: Colors.success,
    fontFamily: "DMSans_700Bold",
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 17,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
    marginBottom: 10,
  },
  emptyLegend: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: "DMSans_500Medium",
  },
  snapshotAmount: {
    fontSize: 24,
    color: Colors.danger,
    fontFamily: "DMSans_700Bold",
  },
  snapshotHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  snapshotTitle: {
    flex: 1,
    flexShrink: 1,
    fontSize: 15,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
  },
  snapshotCta: {
    flexShrink: 0,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: Colors.primary + "14",
  },
  snapshotCtaText: {
    fontSize: 12,
    color: Colors.primary,
    fontFamily: "DMSans_600SemiBold",
  },
  snapshotMeta: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_500Medium",
  },
  snapshotRows: {
    marginTop: 12,
    gap: 8,
  },
  snapshotRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  snapshotLabel: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_500Medium",
  },
  snapshotValue: {
    fontSize: 12,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
  },
  loanSummaryTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  loanSummaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_500Medium",
  },
  loanSummaryValue: {
    fontSize: 14,
    color: Colors.danger,
    fontFamily: "DMSans_700Bold",
  },
  loanSubTitle: {
    marginBottom: 4,
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_500Medium",
  },
  loanSubMeta: {
    marginBottom: 4,
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_400Regular",
  },
  goalAmount: {
    fontSize: 18,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
  },
  goalTrack: {
    marginTop: 12,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.borderLight,
    overflow: "hidden",
  },
  goalFill: {
    height: "100%",
    backgroundColor: Colors.primary,
  },
  goalText: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_500Medium",
  },
});
