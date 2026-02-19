import React, { useMemo, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import {
  useExpenses,
  useFinanceMetrics,
  useGoals,
  useIncomes,
  useLoanPayments,
  useLoans,
  usePreferences,
  useSubscriptionState,
  useWallets,
} from "@/lib/context";
import {
  calculateMonthlyPayment,
  formatFullCurrency,
  generateLoanPayoffProjection,
} from "@/lib/interest";
import { buildReportSnapshot } from "@/lib/reporting";
import type {
  GoalFeasibility,
  Loan,
  ReportKpi,
  ReportRangeKey,
  ReportSnapshot,
} from "@/lib/types";
import { ReportPeriodChips } from "@/components/ReportPeriodChips";
import { ReportKpiCard } from "@/components/ReportKpiCard";
import { ReportTrendBars } from "@/components/ReportTrendBars";
import { ExpensePieChart } from "@/components/ExpensePieChart";
import { LoanPayoffChart } from "@/components/LoanPayoffChart";
import { ReportInsightCard } from "@/components/ReportInsightCard";
import { PREMIUM_BENEFITS } from "@/lib/premium";
import { EXPENSE_CATEGORIES } from "@/lib/storage";

const CONTENT_HORIZONTAL_PADDING = 32;
const KPI_GRID_GAP = 10;
const KPI_MIN_CARD_WIDTH = 184;

function monthKeyToLabel(monthKey: string): string {
  const [yearRaw, monthRaw] = monthKey.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return "N/A";
  }
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[month - 1]} ${String(year).slice(2)}`;
}

function formatReportValue(value: number | null, format: ReportKpi["format"], currencySymbol: string): string {
  if (value === null) return "N/A";
  if (format === "currency") return formatFullCurrency(value, currencySymbol);
  if (format === "percent") return `${(value * 100).toFixed(1)}%`;
  return value.toFixed(1);
}

function formatKpiDeltaAbsolute(kpi: ReportKpi, currencySymbol: string): string | undefined {
  if (kpi.deltaAbsolute === null) return undefined;
  if (Math.abs(kpi.deltaAbsolute) < 0.0001) return undefined;
  if (kpi.format === "currency") {
    const sign = kpi.deltaAbsolute > 0 ? "+" : "";
    return `${sign}${formatFullCurrency(kpi.deltaAbsolute, currencySymbol)}`;
  }
  if (kpi.format === "percent") {
    const sign = kpi.deltaAbsolute > 0 ? "+" : "";
    return `${sign}${(kpi.deltaAbsolute * 100).toFixed(1)}pp`;
  }
  const sign = kpi.deltaAbsolute > 0 ? "+" : "";
  return `${sign}${kpi.deltaAbsolute.toFixed(1)}`;
}

function getGoalStatusColors(status: GoalFeasibility["status"]) {
  if (status === "on_track") {
    return {
      bg: Colors.success + "16",
      fg: Colors.success,
      label: "On Track",
    };
  }
  if (status === "at_risk") {
    return {
      bg: Colors.warning + "18",
      fg: Colors.warning,
      label: "At Risk",
    };
  }
  return {
    bg: Colors.danger + "16",
    fg: Colors.danger,
    label: "Off Track",
  };
}

function getDsrRisk(dsr: number | null) {
  if (dsr === null) return { label: "N/A", color: Colors.textSecondary };
  if (dsr > 0.45) return { label: "High", color: Colors.danger };
  if (dsr > 0.35) return { label: "Elevated", color: Colors.warning };
  if (dsr > 0.2) return { label: "Moderate", color: Colors.accent };
  return { label: "Healthy", color: Colors.success };
}

function parseDate(value: string): Date | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function isActiveLoan(loan: Loan, asOfDate: Date): boolean {
  if (loan.balance <= 0 || loan.termMonths <= 0) return false;
  const startDate = parseDate(loan.startDate);
  if (!startDate) return false;
  return startDate.getTime() <= asOfDate.getTime();
}

function resolveLoanMonthlyPayment(loan: Loan): number {
  if (
    typeof loan.monthlyPayment === "number" &&
    Number.isFinite(loan.monthlyPayment) &&
    loan.monthlyPayment > 0
  ) {
    return loan.monthlyPayment;
  }
  return calculateMonthlyPayment(loan.principal, loan.interestRate, loan.termMonths);
}

function calculateCashflowConsistency(snapshot: ReportSnapshot) {
  const series = snapshot.monthlySeries;
  if (!series.length) {
    return {
      positiveMonths: 0,
      totalMonths: 0,
      avgNetFlow: 0,
      volatilityPct: null as number | null,
    };
  }

  const netFlows = series.map((item) => item.netFlow);
  const avgNetFlow = netFlows.reduce((sum, item) => sum + item, 0) / netFlows.length;
  const variance =
    netFlows.reduce((sum, value) => sum + Math.pow(value - avgNetFlow, 2), 0) / netFlows.length;
  const stdDev = Math.sqrt(Math.max(variance, 0));
  const volatilityPct = avgNetFlow === 0 ? null : stdDev / Math.abs(avgNetFlow);

  return {
    positiveMonths: netFlows.filter((value) => value > 0).length,
    totalMonths: netFlows.length,
    avgNetFlow,
    volatilityPct,
  };
}

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [range, setRange] = useState<ReportRangeKey>("3M");
  const { isPremium } = useSubscriptionState();
  const wallets = useWallets();
  const incomes = useIncomes();
  const expenses = useExpenses();
  const loans = useLoans();
  const loanPayments = useLoanPayments();
  const goals = useGoals();
  const { dashboardSummary } = useFinanceMetrics();
  const { currencySymbol } = usePreferences();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const reportSnapshot = useMemo(
    () =>
      buildReportSnapshot({
        range,
        wallets,
        incomes,
        expenses,
        loans,
        loanPayments,
        goals,
        expenseCategories: EXPENSE_CATEGORIES,
      }),
    [range, wallets, incomes, expenses, loans, loanPayments, goals]
  );

  const cashflowStats = useMemo(
    () => calculateCashflowConsistency(reportSnapshot),
    [reportSnapshot]
  );

  const reportAsOf = useMemo(() => new Date(reportSnapshot.asOfIso), [reportSnapshot.asOfIso]);

  const activeLoans = useMemo(
    () => loans.filter((loan) => isActiveLoan(loan, reportAsOf)),
    [loans, reportAsOf]
  );

  const topLoan = useMemo(() => {
    if (!activeLoans.length) return null;
    return [...activeLoans].sort((a, b) => b.balance - a.balance)[0];
  }, [activeLoans]);

  const loanProjection = useMemo(() => {
    if (!topLoan) return [];
    const monthlyPayment = resolveLoanMonthlyPayment(topLoan);
    return generateLoanPayoffProjection(
      topLoan.balance,
      topLoan.interestRate,
      monthlyPayment,
      topLoan.termMonths
    );
  }, [topLoan]);

  const topLoanPayoffLabel = useMemo(() => {
    if (!topLoan || !loanProjection.length) return "N/A";
    const monthsToPayoff = Math.max(0, loanProjection.length - 1);
    const target = new Date(reportSnapshot.asOfIso);
    target.setUTCMonth(target.getUTCMonth() + monthsToPayoff);
    return target.toLocaleDateString();
  }, [topLoan, loanProjection.length, reportSnapshot.asOfIso]);

  const dsrRisk = getDsrRisk(reportSnapshot.debtServiceRatio);
  const heroDelta = reportSnapshot.executiveKpis.find((item) => item.key === "net_flow") ?? null;
  const topExpenseSlices = reportSnapshot.expenseBreakdown.filter((item) => item.value > 0).slice(0, 5);
  const availableWidth = Math.max(0, width - CONTENT_HORIZONTAL_PADDING);
  const canUseTwoKpiColumns = availableWidth >= KPI_MIN_CARD_WIDTH * 2 + KPI_GRID_GAP;
  const kpiCardWidth = canUseTwoKpiColumns
    ? (availableWidth - KPI_GRID_GAP) / 2
    : availableWidth;

  if (!isPremium) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 16 + webTopInset }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={styles.gateCard}>
          <Ionicons name="lock-closed" size={36} color={Colors.accent} />
          <Text style={styles.gateTitle}>Premium Reports</Text>
          <Text style={styles.gateText}>
            Upgrade to unlock deeper analytics, detailed trends, and CSV export.
          </Text>
          <View style={styles.gateBenefits}>
            {PREMIUM_BENEFITS.slice(0, 4).map((benefit) => (
              <View key={benefit} style={styles.gateBenefitRow}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={styles.gateBenefitText}>{benefit}</Text>
              </View>
            ))}
          </View>
          <Pressable style={styles.gateButton} onPress={() => router.replace("/(tabs)/settings")}>
            <Text style={styles.gateButtonText}>Upgrade in Profile</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 16 + webTopInset,
            paddingBottom: insets.bottom + 30,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>Premium Reports</Text>
            <Text style={styles.subtitle}>Executive analytics unavailable on dashboard</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.filterCard}>
          <View>
            <Text style={styles.filterTitle}>Analysis Window</Text>
            <Text style={styles.filterSub}>
              As of {new Date(reportSnapshot.asOfIso).toLocaleDateString()}
            </Text>
          </View>
          <ReportPeriodChips value={range} onChange={setRange} />
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Period Net Flow ({range})</Text>
          <Text
            style={[
              styles.heroValue,
              { color: reportSnapshot.totalsCurrent.netFlow >= 0 ? Colors.success : Colors.danger },
            ]}
          >
            {formatFullCurrency(reportSnapshot.totalsCurrent.netFlow, currencySymbol)}
          </Text>
          <Text style={styles.heroSub}>
            vs previous window:{" "}
            {heroDelta
              ? heroDelta.deltaPercent === null
                ? "N/A"
                : `${heroDelta.deltaPercent >= 0 ? "+" : ""}${(heroDelta.deltaPercent * 100).toFixed(
                    1
                  )}%`
              : "N/A"}
          </Text>
          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaLabel}>Current Savings</Text>
              <Text style={styles.heroMetaValue}>
                {formatFullCurrency(dashboardSummary.totalSavings, currencySymbol)}
              </Text>
            </View>
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaLabel}>Active Loans</Text>
              <Text style={[styles.heroMetaValue, { color: Colors.danger }]}>
                {activeLoans.length}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Snapshot</Text>
          <Text style={styles.sectionSub}>Each KPI includes comparison against previous period.</Text>
          <View style={styles.kpiGrid}>
            {reportSnapshot.executiveKpis.map((kpi) => (
              <View key={kpi.key} style={[styles.kpiWrap, { width: kpiCardWidth }]}>
                <ReportKpiCard
                  label={kpi.label}
                  value={formatReportValue(kpi.value, kpi.format, currencySymbol)}
                  subtitle={kpi.subtitle}
                  deltaPercent={kpi.deltaPercent}
                  deltaAbsolute={kpi.deltaAbsolute}
                  deltaAbsoluteLabel={formatKpiDeltaAbsolute(kpi, currencySymbol)}
                  higherIsBetter={kpi.higherIsBetter}
                />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cashflow Intelligence</Text>
          <Text style={styles.sectionSub}>Monthly income and expense behavior across the selected window.</Text>
          <ReportTrendBars
            data={reportSnapshot.monthlySeries}
            width={Math.max(260, width - 32)}
            currencySymbol={currencySymbol}
          />
          <View style={styles.infoRow}>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Positive Months</Text>
              <Text style={styles.infoValue}>
                {cashflowStats.positiveMonths}/{cashflowStats.totalMonths}
              </Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Avg Monthly Net</Text>
              <Text
                style={[
                  styles.infoValue,
                  { color: cashflowStats.avgNetFlow >= 0 ? Colors.success : Colors.danger },
                ]}
              >
                {formatFullCurrency(cashflowStats.avgNetFlow, currencySymbol)}
              </Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Volatility</Text>
              <Text style={styles.infoValue}>
                {cashflowStats.volatilityPct === null
                  ? "N/A"
                  : `${(cashflowStats.volatilityPct * 100).toFixed(0)}%`}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spending Diagnostics</Text>
          <Text style={styles.sectionSub}>Category concentration and top spend drivers.</Text>
          <View style={styles.card}>
            <ExpensePieChart
              data={reportSnapshot.expenseBreakdown.map((item) => ({
                label: item.label,
                color: item.color,
                value: item.value,
              }))}
            />
            <View style={styles.legend}>
              {topExpenseSlices.length ? (
                topExpenseSlices.map((slice) => (
                  <View key={slice.key} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
                    <Text style={styles.legendText}>{slice.label}</Text>
                    <Text style={styles.legendValue}>
                      {formatFullCurrency(slice.value, currencySymbol)}{" "}
                      {slice.share !== null ? `(${(slice.share * 100).toFixed(0)}%)` : ""}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No expense categories in this period.</Text>
              )}
            </View>
            {reportSnapshot.topExpenseCategory && reportSnapshot.topExpenseCategory.share !== null ? (
              <View style={styles.concentrationBox}>
                <Text style={styles.concentrationText}>
                  Top category share:{" "}
                  <Text style={styles.concentrationStrong}>
                    {(reportSnapshot.topExpenseCategory.share * 100).toFixed(1)}%
                  </Text>
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Debt Risk & Payoff</Text>
          <Text style={styles.sectionSub}>Obligation pressure, weighted APR, and payoff outlook.</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>DSR</Text>
              <Text style={[styles.infoValue, { color: dsrRisk.color }]}>
                {reportSnapshot.debtServiceRatio === null
                  ? "N/A"
                  : `${(reportSnapshot.debtServiceRatio * 100).toFixed(1)}%`}
              </Text>
              <Text style={[styles.infoSmall, { color: dsrRisk.color }]}>{dsrRisk.label}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Weighted APR</Text>
              <Text style={styles.infoValue}>
                {reportSnapshot.weightedApr === null
                  ? "N/A"
                  : `${reportSnapshot.weightedApr.toFixed(2)}%`}
              </Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Scheduled / mo</Text>
              <Text style={styles.infoValue}>
                {formatFullCurrency(reportSnapshot.scheduledMonthlyLoanPayment, currencySymbol)}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            {topLoan ? (
              <>
                <View style={styles.rowBetween}>
                  <Text style={styles.healthLabel}>Largest loan</Text>
                  <Text style={styles.healthValue}>{topLoan.lender}</Text>
                </View>
                <View style={styles.rowBetween}>
                  <Text style={styles.healthLabel}>Outstanding</Text>
                  <Text style={[styles.healthValue, { color: Colors.danger }]}>
                    {formatFullCurrency(topLoan.balance, currencySymbol)}
                  </Text>
                </View>
                <View style={styles.rowBetween}>
                  <Text style={styles.healthLabel}>Projected payoff</Text>
                  <Text style={styles.healthValue}>{topLoanPayoffLabel}</Text>
                </View>
                <LoanPayoffChart
                  data={loanProjection}
                  width={Math.max(240, width - 64)}
                  height={190}
                  currencySymbol={currencySymbol}
                />
              </>
            ) : (
              <Text style={styles.emptyText}>No loan data available for payoff projection.</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Goal Feasibility</Text>
          <Text style={styles.sectionSub}>Runway estimates based on current monthly capacity.</Text>
          <View style={styles.card}>
            {reportSnapshot.goalFeasibility.length ? (
              reportSnapshot.goalFeasibility.map((goal) => {
                const status = getGoalStatusColors(goal.status);
                return (
                  <View key={goal.goalId} style={styles.goalRow}>
                    <View style={styles.goalMeta}>
                      <Text style={styles.goalName}>{goal.goalName}</Text>
                      <Text style={styles.goalSub}>
                        Need {formatFullCurrency(goal.requiredMonthly, currencySymbol)} / month
                      </Text>
                      <Text style={styles.goalSub}>
                        ETA: {goal.etaMonthKey ? monthKeyToLabel(goal.etaMonthKey) : "N/A"}
                      </Text>
                    </View>
                    <View style={[styles.goalBadge, { backgroundColor: status.bg }]}>
                      <Text style={[styles.goalBadgeText, { color: status.fg }]}>{status.label}</Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={styles.emptyText}>No savings goals available.</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actionable Insights</Text>
          <Text style={styles.sectionSub}>System-generated recommendations from your metrics.</Text>
          <View style={styles.insights}>
            {reportSnapshot.insights.map((insight) => (
              <ReportInsightCard key={insight.id} insight={insight} />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
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
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    alignItems: "center",
  },
  headerSpacer: {
    width: 40,
  },
  title: {
    fontSize: 24,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_400Regular",
  },
  filterCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    marginBottom: 12,
  },
  filterTitle: {
    fontSize: 13,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
  },
  filterSub: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_400Regular",
  },
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  heroLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_500Medium",
  },
  heroValue: {
    marginTop: 4,
    fontSize: 28,
    fontFamily: "DMSans_700Bold",
  },
  heroSub: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_500Medium",
  },
  heroMetaRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
  },
  heroMetaPill: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: Colors.background,
    padding: 10,
  },
  heroMetaLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: "DMSans_500Medium",
  },
  heroMetaValue: {
    marginTop: 4,
    fontSize: 13,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
  },
  section: {
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 18,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
  },
  sectionSub: {
    marginTop: 2,
    marginBottom: 10,
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_400Regular",
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: KPI_GRID_GAP,
    columnGap: KPI_GRID_GAP,
  },
  kpiWrap: {
    minWidth: 0,
  },
  infoRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  infoCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 10,
  },
  infoLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: "DMSans_500Medium",
  },
  infoValue: {
    marginTop: 4,
    fontSize: 14,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
  },
  infoSmall: {
    marginTop: 2,
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
  },
  legend: {
    marginTop: 12,
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_500Medium",
  },
  legendValue: {
    fontSize: 12,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
  },
  concentrationBox: {
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: Colors.primary + "12",
    padding: 10,
  },
  concentrationText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_500Medium",
  },
  concentrationStrong: {
    color: Colors.primary,
    fontFamily: "DMSans_700Bold",
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  healthLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_500Medium",
  },
  healthValue: {
    fontSize: 12,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
  },
  goalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  goalMeta: {
    flex: 1,
  },
  goalName: {
    fontSize: 14,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
  },
  goalSub: {
    marginTop: 2,
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: "DMSans_400Regular",
  },
  goalBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  goalBadgeText: {
    fontSize: 11,
    fontFamily: "DMSans_700Bold",
  },
  insights: {
    gap: 8,
  },
  emptyText: {
    textAlign: "center",
    color: Colors.textTertiary,
    fontFamily: "DMSans_500Medium",
    paddingVertical: 20,
  },
  gateCard: {
    marginTop: 40,
    marginHorizontal: 20,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    alignItems: "center",
    padding: 24,
  },
  gateTitle: {
    marginTop: 12,
    fontSize: 22,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
  },
  gateText: {
    marginTop: 8,
    textAlign: "center",
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "DMSans_400Regular",
  },
  gateBenefits: {
    width: "100%",
    marginTop: 12,
    gap: 8,
  },
  gateBenefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gateBenefitText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "DMSans_500Medium",
  },
  gateButton: {
    marginTop: 18,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  gateButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
  },
});
