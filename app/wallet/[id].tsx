import React, { useState, useMemo, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useApp } from "@/lib/context";
import {
  formatFullCurrency,
  generateProjectionData,
  compoundInterest,
} from "@/lib/interest";
import { ProjectionChart } from "@/components/ProjectionChart";
import Colors from "@/constants/colors";

export default function WalletDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const {
    wallets,
    transactions,
    currencySymbol,
    addTransaction,
    removeTransaction,
  } = useApp();
  const wallet = wallets.find((w) => w.id === id);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [txType, setTxType] = useState<"deposit" | "withdrawal">("deposit");
  const [txAmount, setTxAmount] = useState("");
  const [txNote, setTxNote] = useState("");
  const [projectionMonths, setProjectionMonths] = useState(12);
  const [monthlyDeposit, setMonthlyDeposit] = useState("0");
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const walletTransactions = useMemo(() => {
    return transactions
      .filter((t) => t.walletId === id)
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
  }, [transactions, id]);

  const projectionData = useMemo(() => {
    if (!wallet) return [];
    return generateProjectionData(
      wallet.balance,
      parseFloat(monthlyDeposit) || 0,
      wallet.interestRate,
      projectionMonths
    );
  }, [wallet, monthlyDeposit, projectionMonths]);

  const projectedBalance = useMemo(() => {
    if (!wallet) return 0;
    return compoundInterest(
      wallet.balance,
      wallet.interestRate,
      wallet.compoundingFrequency,
      projectionMonths / 12
    );
  }, [wallet, projectionMonths]);

  const handleAddTransaction = useCallback(async () => {
    if (!txAmount || !id) return;
    const amount = parseFloat(txAmount);
    if (isNaN(amount) || amount <= 0) return;

    await addTransaction({
      walletId: id,
      type: txType,
      amount,
      note: txNote.trim(),
      date: new Date().toISOString(),
    });
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setTxAmount("");
    setTxNote("");
    setShowAddTransaction(false);
  }, [txAmount, txType, txNote, id, addTransaction]);

  const handleDeleteTransaction = useCallback(
    (txId: string) => {
      if (Platform.OS === "web") {
        if (confirm("Delete this transaction?")) {
          removeTransaction(txId);
        }
        return;
      }
      Alert.alert("Delete Transaction", "Remove this transaction?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => removeTransaction(txId),
        },
      ]);
    },
    [removeTransaction]
  );

  if (!wallet) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Wallet not found</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const projectedInterest = projectedBalance - wallet.balance;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 16 + webTopInset,
            paddingBottom: insets.bottom + 40,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerBack}>
            <Ionicons
              name="chevron-back"
              size={24}
              color={Colors.text}
            />
          </Pressable>
          <Text style={styles.headerTitle}>{wallet.name}</Text>
          <Pressable
            style={[styles.headerAdd, { backgroundColor: wallet.color }]}
            onPress={() => setShowAddTransaction(true)}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>

        <View
          style={[
            styles.balanceCard,
            { backgroundColor: wallet.color + "10" },
          ]}
        >
          <View style={styles.balanceRow}>
            <View>
              <Text style={styles.balanceLabel}>Current Balance</Text>
              <Text style={[styles.balanceAmount, { color: wallet.color }]}>
                {formatFullCurrency(wallet.balance, currencySymbol)}
              </Text>
            </View>
            <View
              style={[
                styles.rateChip,
                { backgroundColor: wallet.color + "20" },
              ]}
            >
              <Ionicons
                name="trending-up"
                size={14}
                color={wallet.color}
              />
              <Text style={[styles.rateText, { color: wallet.color }]}>
                {wallet.interestRate}% APY
              </Text>
            </View>
          </View>

          <View style={styles.projectionStats}>
            <View style={styles.projStat}>
              <Text style={styles.projStatLabel}>Projected in {projectionMonths}mo</Text>
              <Text style={styles.projStatValue}>
                {formatFullCurrency(projectedBalance, currencySymbol)}
              </Text>
            </View>
            <View style={styles.projStat}>
              <Text style={styles.projStatLabel}>Interest Earned</Text>
              <Text
                style={[styles.projStatValue, { color: Colors.success }]}
              >
                +{formatFullCurrency(projectedInterest, currencySymbol)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Growth Projection</Text>

          <View style={styles.projControls}>
            <View style={styles.projControlItem}>
              <Text style={styles.projControlLabel}>Period</Text>
              <View style={styles.projPeriodRow}>
                {[6, 12, 24, 60].map((m) => (
                  <Pressable
                    key={m}
                    style={[
                      styles.periodChip,
                      projectionMonths === m && {
                        backgroundColor: wallet.color + "20",
                        borderColor: wallet.color,
                      },
                    ]}
                    onPress={() => setProjectionMonths(m)}
                  >
                    <Text
                      style={[
                        styles.periodChipText,
                        projectionMonths === m && { color: wallet.color },
                      ]}
                    >
                      {m >= 12 ? `${m / 12}y` : `${m}mo`}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.projControlItem}>
              <Text style={styles.projControlLabel}>Monthly Deposit</Text>
              <TextInput
                style={styles.projInput}
                placeholder="0"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="decimal-pad"
                value={monthlyDeposit}
                onChangeText={setMonthlyDeposit}
              />
            </View>
          </View>

          <View style={styles.chartContainer}>
            <ProjectionChart
              data={projectionData}
              width={screenWidth - 40}
              height={200}
              currencySymbol={currencySymbol}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transactions</Text>

          {walletTransactions.length === 0 ? (
            <View style={styles.emptyTransactions}>
              <Ionicons
                name="receipt-outline"
                size={32}
                color={Colors.textTertiary}
              />
              <Text style={styles.emptyTransactionsText}>
                No transactions yet
              </Text>
            </View>
          ) : (
            walletTransactions.map((t) => (
              <Pressable
                key={t.id}
                style={styles.transactionItem}
                onLongPress={() => handleDeleteTransaction(t.id)}
              >
                <View
                  style={[
                    styles.txIcon,
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
                <View style={styles.txInfo}>
                  <Text style={styles.txNote}>
                    {t.note ||
                      (t.type === "deposit" ? "Deposit" : "Withdrawal")}
                  </Text>
                  <Text style={styles.txDate}>
                    {new Date(t.date).toLocaleDateString()}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.txAmount,
                    {
                      color:
                        t.type === "deposit"
                          ? Colors.success
                          : Colors.danger,
                    },
                  ]}
                >
                  {t.type === "deposit" ? "+" : "-"}
                  {formatFullCurrency(t.amount, currencySymbol)}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showAddTransaction}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddTransaction(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { paddingBottom: insets.bottom + 20 },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Transaction</Text>
              <Pressable
                onPress={() => {
                  setTxAmount("");
                  setTxNote("");
                  setShowAddTransaction(false);
                }}
              >
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <View style={styles.txTypeRow}>
              <Pressable
                style={[
                  styles.txTypeBtn,
                  txType === "deposit" && {
                    backgroundColor: Colors.success + "15",
                    borderColor: Colors.success,
                  },
                ]}
                onPress={() => setTxType("deposit")}
              >
                <Ionicons
                  name="arrow-down-circle"
                  size={20}
                  color={
                    txType === "deposit"
                      ? Colors.success
                      : Colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.txTypeBtnText,
                    txType === "deposit" && { color: Colors.success },
                  ]}
                >
                  Deposit
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.txTypeBtn,
                  txType === "withdrawal" && {
                    backgroundColor: Colors.danger + "15",
                    borderColor: Colors.danger,
                  },
                ]}
                onPress={() => setTxType("withdrawal")}
              >
                <Ionicons
                  name="arrow-up-circle"
                  size={20}
                  color={
                    txType === "withdrawal"
                      ? Colors.danger
                      : Colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.txTypeBtnText,
                    txType === "withdrawal" && { color: Colors.danger },
                  ]}
                >
                  Withdrawal
                </Text>
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Amount</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="decimal-pad"
              value={txAmount}
              onChangeText={setTxAmount}
            />

            <Text style={styles.inputLabel}>Note (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Monthly savings"
              placeholderTextColor={Colors.textTertiary}
              value={txNote}
              onChangeText={setTxNote}
            />

            <Pressable
              style={[
                styles.submitBtn,
                {
                  backgroundColor:
                    txType === "deposit" ? Colors.success : Colors.danger,
                },
                !txAmount && styles.submitBtnDisabled,
              ]}
              onPress={handleAddTransaction}
              disabled={!txAmount}
            >
              <Text style={styles.submitBtnText}>
                {txType === "deposit" ? "Add Deposit" : "Make Withdrawal"}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerBack: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
    flex: 1,
    textAlign: "center",
  },
  headerAdd: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  balanceCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontFamily: "DMSans_700Bold",
    letterSpacing: -0.5,
  },
  rateChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  rateText: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
  },
  projectionStats: {
    flexDirection: "row",
    gap: 16,
  },
  projStat: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 12,
    padding: 12,
  },
  projStatLabel: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  projStatValue: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
    marginBottom: 14,
  },
  projControls: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  projControlItem: {
    flex: 1,
  },
  projControlLabel: {
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  projPeriodRow: {
    flexDirection: "row",
    gap: 6,
  },
  periodChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    backgroundColor: Colors.surface,
  },
  periodChipText: {
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
    color: Colors.textSecondary,
  },
  projInput: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chartContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyTransactions: {
    alignItems: "center",
    paddingVertical: 30,
    gap: 8,
  },
  emptyTransactionsText: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: Colors.textTertiary,
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  txInfo: {
    flex: 1,
  },
  txNote: {
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: Colors.text,
  },
  txDate: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontFamily: "DMSans_700Bold",
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  notFoundText: {
    fontSize: 16,
    fontFamily: "DMSans_500Medium",
    color: Colors.textSecondary,
  },
  backBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: "#fff",
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
    padding: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
  },
  txTypeRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  txTypeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  txTypeBtnText: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.textSecondary,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    fontFamily: "DMSans_400Regular",
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  submitBtn: {
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginTop: 24,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: "#fff",
  },
});
