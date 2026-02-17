import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useApp } from "@/lib/context";
import {
  getBillingUnavailableMessage,
  isBillingSupportedPlatform,
} from "@/lib/billing";
import { captureError } from "@/lib/monitoring";
import { PREMIUM_BENEFITS, PREMIUM_PRODUCT_IDS, type PremiumPlan } from "@/lib/premium";

const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "\u20AC", name: "Euro" },
  { code: "GBP", symbol: "\u00A3", name: "British Pound" },
  { code: "JPY", symbol: "\u00A5", name: "Japanese Yen" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "INR", symbol: "\u20B9", name: "Indian Rupee" },
  { code: "PHP", symbol: "\u20B1", name: "Philippine Peso" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
  { code: "SEK", symbol: "kr", name: "Swedish Krona" },
  { code: "NOK", symbol: "kr", name: "Norwegian Krone" },
  { code: "DKK", symbol: "kr", name: "Danish Krone" },
  { code: "CNY", symbol: "\u00A5", name: "Chinese Yuan" },
  { code: "KRW", symbol: "\u20A9", name: "South Korean Won" },
  { code: "THB", symbol: "\u0E3F", name: "Thai Baht" },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit" },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah" },
  { code: "VND", symbol: "\u20AB", name: "Vietnamese Dong" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "MXN", symbol: "MX$", name: "Mexican Peso" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "AED", symbol: "\u062F.\u0625", name: "UAE Dirham" },
  { code: "SAR", symbol: "\uFDFC", name: "Saudi Riyal" },
];

const SettingsMenuItem = React.memo(function SettingsMenuItem({
  icon,
  iconColor,
  label,
  value,
  onPress,
  showArrow = true,
}: {
  icon: string;
  iconColor: string;
  label: string;
  value?: string;
  onPress?: () => void;
  showArrow?: boolean;
}) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <View style={[styles.menuIcon, { backgroundColor: iconColor + "16" }]}>
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <View style={styles.menuRight}>
        {value ? <Text style={styles.menuValue}>{value}</Text> : null}
        {showArrow ? (
          <Ionicons
            name="chevron-forward"
            size={18}
            color={Colors.textTertiary}
          />
        ) : null}
      </View>
    </Pressable>
  );
});

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const {
    user,
    currency,
    currencySymbol,
    setCurrency,
    wallets,
    transactions,
    goals,
    expenses,
    incomes,
    loans,
    subscriptions,
    isPremium,
    freePlanStatus,
    isOnline,
    purchasePremium,
    restorePremium,
    refreshPremiumStatus,
    exportPremiumCsv,
    signOut,
    deleteAccount,
  } = useApp();
  const [showCurrency, setShowCurrency] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState<PremiumPlan | "restore" | null>(null);
  const [upgradeError, setUpgradeError] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const billingUnavailableMessage = getBillingUnavailableMessage();
  const billingSupported = isBillingSupportedPlatform();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString()
    : "N/A";

  const premiumLabel = useMemo(() => {
    if (!subscriptions.length) return "Free plan";
    const active = subscriptions.find(
      (sub) =>
        sub.status === "active" &&
        (sub.lifetime ||
          !sub.expiresAt ||
          new Date(sub.expiresAt).getTime() > Date.now()),
    );
    if (!active) return "Free plan";
    if (active.plan === "lifetime") return "Lifetime Premium";
    if (active.plan === "yearly") return "Yearly Premium";
    return "Monthly Premium";
  }, [subscriptions]);

  const handleExport = async () => {
    if (!isPremium) {
      setShowUpgrade(true);
      return;
    }
    try {
      const csv = await exportPremiumCsv();
      if (Platform.OS === "web") {
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "savewise_export.csv";
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({ message: csv, title: "SaveWise Export" });
      }
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      captureError(error, { scope: "profile", operation: "export_csv" });
    }
  };

  const handleOpenReports = () => {
    if (!isPremium) {
      setShowUpgrade(true);
      return;
    }
    router.push("/reports");
  };

  const handleUpgrade = async (plan: PremiumPlan) => {
    if (!isOnline) return;
    if (!billingSupported) {
      setUpgradeError(
        billingUnavailableMessage ??
          "In-app purchases are not available in this build."
      );
      return;
    }
    try {
      setUpgradeError("");
      setUpgradeLoading(plan);
      await purchasePremium(PREMIUM_PRODUCT_IDS[plan]);
      await refreshPremiumStatus();
      setShowUpgrade(false);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      captureError(error, {
        scope: "billing",
        operation: "purchase_upgrade",
        extra: { plan },
      });
      setUpgradeError(
        error instanceof Error ? error.message : "Unable to complete purchase."
      );
    } finally {
      setUpgradeLoading(null);
    }
  };

  const handleRestore = async () => {
    if (!isOnline) return;
    if (!billingSupported) {
      setUpgradeError(
        billingUnavailableMessage ??
          "In-app purchases are not available in this build."
      );
      return;
    }
    try {
      setUpgradeError("");
      setUpgradeLoading("restore");
      await restorePremium();
      await refreshPremiumStatus();
      setShowUpgrade(false);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      captureError(error, { scope: "billing", operation: "restore_upgrade" });
      setUpgradeError(
        error instanceof Error ? error.message : "Unable to restore purchases."
      );
    } finally {
      setUpgradeLoading(null);
    }
  };

  const handleSignOut = async () => {
    if (!isOnline) return;
    try {
      await signOut();
    } catch (error) {
      captureError(error, { scope: "auth", operation: "sign_out_from_settings" });
    }
  };

  const handleDeleteAccount = async () => {
    if (!isOnline || deletingAccount) return;
    try {
      setDeletingAccount(true);
      await deleteAccount();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      captureError(error, { scope: "auth", operation: "delete_account_from_settings" });
      Alert.alert(
        "Delete account failed",
        error instanceof Error ? error.message : "Unable to delete account."
      );
    } finally {
      setDeletingAccount(false);
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      "Delete account?",
      "This permanently removes your account and all saved financial data.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void handleDeleteAccount();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 16 + webTopInset,
            paddingBottom: insets.bottom + 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Profile</Text>

        <View style={styles.profileCard}>
          <View style={styles.profileIcon}>
            <Ionicons name="person" size={22} color={Colors.primary} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.email ?? "SaveWise User"}
            </Text>
            <Text style={styles.profileSub}>Member since {memberSince}</Text>
          </View>
        </View>

        <View style={styles.premiumCard}>
          <View style={styles.premiumInfo}>
            <Text style={styles.premiumLabel}>Subscription</Text>
            <Text style={styles.premiumValue}>{premiumLabel}</Text>
            <Text style={styles.premiumSub}>
              {isPremium
                ? "All limits removed. Premium features unlocked."
                : `Free plan: ${freePlanStatus.usage.wallets}/${freePlanStatus.limits.wallets} savings, ${freePlanStatus.usage.goals}/${freePlanStatus.limits.goals} goals, ${freePlanStatus.usage.loans}/${freePlanStatus.limits.loans} loans.`}
            </Text>
          </View>
          <Pressable
            style={[
              styles.premiumButton,
              isPremium && { backgroundColor: Colors.success + "18" },
            ]}
            onPress={() => setShowUpgrade(true)}
          >
            <Text
              style={[
                styles.premiumButtonText,
                isPremium && { color: Colors.success },
              ]}
            >
              {isPremium ? "Manage" : "Upgrade"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{wallets.length}</Text>
              <Text style={styles.summaryLabel}>Savings</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{transactions.length}</Text>
              <Text style={styles.summaryLabel}>Transactions</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{goals.length}</Text>
              <Text style={styles.summaryLabel}>Goals</Text>
            </View>
          </View>
          <View style={styles.summaryRowBottom}>
            <Text style={styles.summaryBottomText}>
              {expenses.length} expenses | {incomes.length} income logs |{" "}
              {loans.length} loans
            </Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>FINANCE</Text>
        <View style={styles.menuGroup}>
          <SettingsMenuItem
            icon="wallet"
            iconColor={Colors.info}
            label="Savings"
            value={`${wallets.length}`}
            onPress={() => router.push("/(tabs)/wallets")}
          />
          <SettingsMenuItem
            icon="flag"
            iconColor={Colors.danger}
            label="Goals"
            value={`${goals.length}`}
            onPress={() => router.push("/(tabs)/goals")}
          />
        </View>

        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <View style={styles.menuGroup}>
          <SettingsMenuItem
            icon="cash"
            iconColor={Colors.primary}
            label="Currency"
            value={`${currencySymbol} ${currency}`}
            onPress={() => setShowCurrency(true)}
          />
        </View>

        <Text style={styles.sectionLabel}>PREMIUM</Text>
        <View style={styles.menuGroup}>
          <SettingsMenuItem
            icon="analytics"
            iconColor={Colors.accent}
            label="Reports"
            value={isPremium ? "Unlocked" : "Premium"}
            onPress={handleOpenReports}
          />
          <SettingsMenuItem
            icon="download"
            iconColor={Colors.info}
            label="Export CSV"
            value={isPremium ? "Unlocked" : "Premium"}
            onPress={handleExport}
          />
        </View>

        {!isPremium ? (
          <View style={styles.benefitsCard}>
            <Text style={styles.benefitsTitle}>Why Upgrade</Text>
            {PREMIUM_BENEFITS.map((benefit) => (
              <View key={benefit} style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.menuGroup}>
          <SettingsMenuItem
            icon="log-out"
            iconColor={Colors.danger}
            label="Sign Out"
            onPress={handleSignOut}
          />
          <SettingsMenuItem
            icon="trash"
            iconColor={Colors.danger}
            label={deletingAccount ? "Deleting..." : "Delete Account"}
            onPress={deletingAccount ? undefined : confirmDeleteAccount}
            showArrow={false}
          />
        </View>
      </ScrollView>

      <Modal
        visible={showCurrency}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCurrency(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Currency</Text>
              <Pressable onPress={() => setShowCurrency(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>
            <Text style={styles.modalHint}>
              Scroll to view all supported currencies.
            </Text>
            <ScrollView
              showsVerticalScrollIndicator
              contentContainerStyle={styles.currencyList}
            >
              {CURRENCIES.map((item) => (
                <Pressable
                  key={item.code}
                  style={[
                    styles.currencyItem,
                    currency === item.code && styles.currencyItemActive,
                  ]}
                  onPress={() => {
                    setCurrency(item.code, item.symbol);
                    setShowCurrency(false);
                  }}
                >
                  <Text style={styles.currencySymbol}>{item.symbol}</Text>
                  <View style={styles.currencyInfo}>
                    <Text style={styles.currencyCode}>{item.code}</Text>
                    <Text style={styles.currencyName}>{item.name}</Text>
                  </View>
                  {currency === item.code ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={Colors.primary}
                    />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showUpgrade}
        animationType="slide"
        transparent
        onRequestClose={() => setShowUpgrade(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upgrade to Premium</Text>
              <Pressable onPress={() => setShowUpgrade(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>
            {upgradeError ? <Text style={styles.upgradeError}>{upgradeError}</Text> : null}
            {billingUnavailableMessage ? (
              <Text style={styles.upgradeHint}>{billingUnavailableMessage}</Text>
            ) : null}

            <View style={styles.planCard}>
              <Text style={styles.planTitle}>Monthly</Text>
              <Text style={styles.planPrice}>$4.99 / month</Text>
              <Text style={styles.planDetail}>Unlock all limits + premium reports + exports.</Text>
              <Pressable
                style={[
                  styles.planButton,
                  (!isOnline ||
                    upgradeLoading !== null ||
                    !billingSupported) &&
                    styles.planDisabled,
                ]}
                onPress={() => handleUpgrade("monthly")}
                disabled={!isOnline || upgradeLoading !== null || !billingSupported}
              >
                <Text style={styles.planButtonText}>
                  {upgradeLoading === "monthly" ? "Processing..." : "Upgrade"}
                </Text>
              </Pressable>
            </View>

            <View style={styles.planCard}>
              <Text style={styles.planTitle}>Yearly</Text>
              <Text style={styles.planPrice}>$39.99 / year</Text>
              <Text style={styles.planDetail}>
                Best value. Full premium access for 12 months.
              </Text>
              <Pressable
                style={[
                  styles.planButton,
                  (!isOnline ||
                    upgradeLoading !== null ||
                    !billingSupported) &&
                    styles.planDisabled,
                ]}
                onPress={() => handleUpgrade("yearly")}
                disabled={!isOnline || upgradeLoading !== null || !billingSupported}
              >
                <Text style={styles.planButtonText}>
                  {upgradeLoading === "yearly" ? "Processing..." : "Upgrade"}
                </Text>
              </Pressable>
            </View>

            <View style={styles.planCard}>
              <Text style={styles.planTitle}>Lifetime</Text>
              <Text style={styles.planPrice}>$89 one-time</Text>
              <Text style={styles.planDetail}>One payment, permanent premium access.</Text>
              <Pressable
                style={[
                  styles.planButton,
                  (!isOnline ||
                    upgradeLoading !== null ||
                    !billingSupported) &&
                    styles.planDisabled,
                ]}
                onPress={() => handleUpgrade("lifetime")}
                disabled={!isOnline || upgradeLoading !== null || !billingSupported}
              >
                <Text style={styles.planButtonText}>
                  {upgradeLoading === "lifetime" ? "Processing..." : "Upgrade"}
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={[
                styles.restoreButton,
                (!isOnline || upgradeLoading !== null || !billingSupported) &&
                  styles.planDisabled,
              ]}
              onPress={handleRestore}
              disabled={!isOnline || upgradeLoading !== null || !billingSupported}
            >
              <Text style={styles.restoreButtonText}>
                {upgradeLoading === "restore" ? "Restoring..." : "Restore Purchases"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
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
  title: {
    fontSize: 28,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
    marginBottom: 16,
  },
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  profileIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 15,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
  },
  profileSub: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_400Regular",
  },
  premiumCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  premiumInfo: {
    flex: 1,
    paddingRight: 4,
  },
  premiumLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_600SemiBold",
  },
  premiumValue: {
    marginTop: 2,
    fontSize: 18,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
  },
  premiumSub: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_400Regular",
  },
  premiumButton: {
    backgroundColor: Colors.primary + "18",
    minWidth: 88,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  premiumButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontFamily: "DMSans_700Bold",
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryDivider: { width: 1, height: 30, backgroundColor: Colors.borderLight },
  summaryValue: {
    fontSize: 22,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_400Regular",
  },
  summaryRowBottom: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 10,
    alignItems: "center",
  },
  summaryBottomText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_500Medium",
  },
  sectionLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: "DMSans_600SemiBold",
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 6,
  },
  menuGroup: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    marginBottom: 14,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    fontFamily: "DMSans_500Medium",
  },
  menuRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  menuValue: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "DMSans_400Regular",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 22,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
  },
  modalHint: {
    marginBottom: 8,
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_400Regular",
  },
  currencyList: {
    paddingBottom: 8,
  },
  currencyItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
    gap: 12,
  },
  currencyItemActive: {
    backgroundColor: Colors.primary + "10",
  },
  currencySymbol: {
    width: 30,
    textAlign: "center",
    fontSize: 20,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
  },
  currencyInfo: { flex: 1 },
  currencyCode: {
    fontSize: 15,
    color: Colors.text,
    fontFamily: "DMSans_600SemiBold",
  },
  currencyName: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_400Regular",
  },
  planCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  planTitle: {
    fontSize: 16,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
  },
  planPrice: {
    marginTop: 4,
    fontSize: 14,
    color: Colors.primary,
    fontFamily: "DMSans_700Bold",
  },
  planDetail: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_400Regular",
  },
  planButton: {
    marginTop: 12,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
  },
  planDisabled: {
    opacity: 0.5,
  },
  planButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
  },
  restoreButton: {
    marginTop: 4,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
  },
  restoreButtonText: {
    color: Colors.text,
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
  },
  upgradeError: {
    marginBottom: 8,
    fontSize: 12,
    color: Colors.danger,
    fontFamily: "DMSans_500Medium",
  },
  upgradeHint: {
    marginBottom: 8,
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_500Medium",
  },
  benefitsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  benefitsTitle: {
    fontSize: 14,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
    marginBottom: 8,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  benefitText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "DMSans_500Medium",
  },
});
