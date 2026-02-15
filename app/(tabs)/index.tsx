import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useApp } from "@/lib/context";
import { formatFullCurrency, generateProjectionData } from "@/lib/interest";
import { MiniChart } from "@/components/MiniChart";
import { ProjectionChart } from "@/components/ProjectionChart";
import Colors from "@/constants/colors";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { wallets, goals, transactions, totalBalance, currencySymbol } =
    useApp();
  const { width: screenWidth } = useWindowDimensions();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const projectionData = useMemo(() => {
    const avgRate =
      wallets.length > 0
        ? wallets.reduce((s, w) => s + w.interestRate, 0) / wallets.length
        : 5;
    return generateProjectionData(totalBalance, 0, avgRate, 12);
  }, [totalBalance, wallets]);

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      .slice(0, 5);
  }, [transactions]);

  const projectedGrowth = useMemo(() => {
    if (projectionData.length < 2) return 0;
    return (
      projectionData[projectionData.length - 1].balance - totalBalance
    );
  }, [projectionData, totalBalance]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 16 + webTopInset,
          paddingBottom: insets.bottom + 100,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Your Savings</Text>
          <Text style={styles.totalBalance}>
            {formatFullCurrency(totalBalance, currencySymbol)}
          </Text>
        </View>
        <View style={styles.growthBadge}>
          <Ionicons name="trending-up" size={14} color={Colors.primary} />
          <Text style={styles.growthText}>
            +{formatFullCurrency(projectedGrowth, currencySymbol)}/yr
          </Text>
        </View>
      </View>

      <View style={styles.balanceCard}>
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceGradient}
        >
          <View style={styles.balanceCardHeader}>
            <Text style={styles.balanceCardTitle}>12-Month Projection</Text>
            <View style={styles.balanceCardBadge}>
              <Text style={styles.balanceCardBadgeText}>
                {wallets.length > 0
                  ? `${(wallets.reduce((s, w) => s + w.interestRate, 0) / wallets.length).toFixed(1)}% avg`
                  : "5% est"}
              </Text>
            </View>
          </View>
          <ProjectionChart
            data={projectionData}
            width={screenWidth - 64}
            height={180}
            currencySymbol={currencySymbol}
          />
        </LinearGradient>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: "#E8F5E9" }]}>
            <Ionicons name="wallet" size={20} color={Colors.primary} />
          </View>
          <Text style={styles.statValue}>{wallets.length}</Text>
          <Text style={styles.statLabel}>Wallets</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: "#FFF8E1" }]}>
            <Ionicons name="flag" size={20} color={Colors.accent} />
          </View>
          <Text style={styles.statValue}>{goals.length}</Text>
          <Text style={styles.statLabel}>Goals</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: "#E3F2FD" }]}>
            <Ionicons name="swap-vertical" size={20} color={Colors.info} />
          </View>
          <Text style={styles.statValue}>{transactions.length}</Text>
          <Text style={styles.statLabel}>Entries</Text>
        </View>
      </View>

      {wallets.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Wallets</Text>
            <Pressable onPress={() => router.push("/(tabs)/wallets")}>
              <Text style={styles.seeAll}>See All</Text>
            </Pressable>
          </View>
          {wallets.slice(0, 3).map((wallet) => {
            const walletTransactions = transactions
              .filter((t) => t.walletId === wallet.id)
              .sort(
                (a, b) =>
                  new Date(a.date).getTime() - new Date(b.date).getTime()
              );
            const chartData =
              walletTransactions.length > 1
                ? walletTransactions.reduce<number[]>((acc, t) => {
                    const last = acc[acc.length - 1] || wallet.balance;
                    acc.push(
                      t.type === "deposit"
                        ? last + t.amount
                        : last - t.amount
                    );
                    return acc;
                  }, [])
                : [wallet.balance * 0.8, wallet.balance * 0.9, wallet.balance];

            return (
              <Pressable
                key={wallet.id}
                style={styles.walletCard}
                onPress={() =>
                  router.push({
                    pathname: "/wallet/[id]",
                    params: { id: wallet.id },
                  })
                }
              >
                <View style={styles.walletCardLeft}>
                  <View
                    style={[
                      styles.walletIcon,
                      { backgroundColor: wallet.color + "20" },
                    ]}
                  >
                    <Ionicons
                      name={wallet.icon as any}
                      size={22}
                      color={wallet.color}
                    />
                  </View>
                  <View style={styles.walletInfo}>
                    <Text style={styles.walletName}>{wallet.name}</Text>
                    <Text style={styles.walletRate}>
                      {wallet.interestRate}% APY
                    </Text>
                  </View>
                </View>
                <View style={styles.walletCardRight}>
                  <MiniChart
                    data={chartData}
                    width={60}
                    height={30}
                    color={wallet.color}
                  />
                  <Text style={styles.walletBalance}>
                    {formatFullCurrency(wallet.balance, currencySymbol)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {recentTransactions.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
          </View>
          {recentTransactions.map((t) => {
            const wallet = wallets.find((w) => w.id === t.walletId);
            return (
              <View key={t.id} style={styles.transactionItem}>
                <View
                  style={[
                    styles.transactionIcon,
                    {
                      backgroundColor:
                        t.type === "deposit" ? "#E8F5E9" : "#FEE2E2",
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      t.type === "deposit"
                        ? "arrow-down-circle"
                        : "arrow-up-circle"
                    }
                    size={20}
                    color={
                      t.type === "deposit" ? Colors.success : Colors.danger
                    }
                  />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionNote}>
                    {t.note || (t.type === "deposit" ? "Deposit" : "Withdrawal")}
                  </Text>
                  <Text style={styles.transactionWallet}>
                    {wallet?.name || "Unknown"}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.transactionAmount,
                    {
                      color:
                        t.type === "deposit" ? Colors.success : Colors.danger,
                    },
                  ]}
                >
                  {t.type === "deposit" ? "+" : "-"}
                  {formatFullCurrency(t.amount, currencySymbol)}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {wallets.length === 0 && (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="wallet-outline" size={48} color={Colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>Start Saving</Text>
          <Text style={styles.emptyText}>
            Create your first wallet to begin tracking your savings and see growth projections.
          </Text>
          <Pressable
            style={styles.emptyButton}
            onPress={() => router.push("/(tabs)/wallets")}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.emptyButtonText}>Create Wallet</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  greeting: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontFamily: "DMSans_400Regular",
    marginBottom: 4,
  },
  totalBalance: {
    fontSize: 32,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  growthBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary + "15",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    marginTop: 8,
  },
  growthText: {
    fontSize: 12,
    color: Colors.primary,
    fontFamily: "DMSans_600SemiBold",
  },
  balanceCard: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  balanceGradient: {
    padding: 20,
    paddingBottom: 8,
  },
  balanceCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  balanceCardTitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    fontFamily: "DMSans_500Medium",
  },
  balanceCardBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  balanceCardBadgeText: {
    fontSize: 11,
    color: "#fff",
    fontFamily: "DMSans_600SemiBold",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontFamily: "DMSans_400Regular",
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
  },
  seeAll: {
    fontSize: 14,
    color: Colors.primary,
    fontFamily: "DMSans_500Medium",
  },
  walletCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  walletCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  walletIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  walletInfo: {
    flex: 1,
  },
  walletName: {
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
  },
  walletRate: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_400Regular",
    marginTop: 2,
  },
  walletCardRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  walletBalance: {
    fontSize: 15,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  transactionInfo: {
    flex: 1,
  },
  transactionNote: {
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: Colors.text,
  },
  transactionWallet: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_400Regular",
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: "DMSans_400Regular",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 15,
    color: "#fff",
    fontFamily: "DMSans_600SemiBold",
  },
});
