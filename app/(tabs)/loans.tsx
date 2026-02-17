import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useActions, useLoanPayments, useLoans, useNetwork, usePreferences } from "@/lib/context";
import {
  calculateMonthlyPayment,
  calculateTotalLoanInterest,
  formatFullCurrency,
} from "@/lib/interest";

const LOAN_COLORS = ["#EF4444", "#F97316", "#3B82F6", "#8B5CF6", "#14B8A6"];

export default function LoansScreen() {
  const insets = useSafeAreaInsets();
  const loans = useLoans();
  const loanPayments = useLoanPayments();
  const { currencySymbol } = usePreferences();
  const {
    addLoan,
    editLoan,
    removeLoan,
    addLoanPayment,
    removeLoanPayment,
  } = useActions();
  const { isOnline } = useNetwork();
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [lender, setLender] = useState("");
  const [principal, setPrincipal] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [termMonths, setTermMonths] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [balance, setBalance] = useState("");
  const [loanColor, setLoanColor] = useState(LOAN_COLORS[0]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [paymentNote, setPaymentNote] = useState("");
  const [isSavingLoan, setIsSavingLoan] = useState(false);
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const modalKeyboardBottomOffset = insets.bottom + 24;
  const modalKeyboardExtraSpace = 12;

  const totals = useMemo(() => {
    const outstanding = loans.reduce((sum, loan) => sum + loan.balance, 0);
    const principalTotal = loans.reduce((sum, loan) => sum + loan.principal, 0);
    return { outstanding, principalTotal };
  }, [loans]);

  const paymentsByLoan = useMemo(() => {
    const map = new Map<string, typeof loanPayments>();
    for (let i = 0; i < loanPayments.length; i += 1) {
      const payment = loanPayments[i];
      const current = map.get(payment.loanId);
      if (current) {
        current.push(payment);
      } else {
        map.set(payment.loanId, [payment]);
      }
    }
    map.forEach((list) =>
      list.sort(
        (a, b) =>
          new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
      )
    );
    return map;
  }, [loanPayments]);

  const resetLoanForm = useCallback(() => {
    setEditingLoanId(null);
    setLender("");
    setPrincipal("");
    setInterestRate("");
    setTermMonths("");
    setStartDate(new Date().toISOString().slice(0, 10));
    setBalance("");
    setLoanColor(LOAN_COLORS[0]);
  }, []);

  const openCreateLoan = useCallback(() => {
    resetLoanForm();
    setShowLoanModal(true);
  }, [resetLoanForm]);

  const openEditLoan = useCallback(
    (loanId: string) => {
      const loan = loans.find((item) => item.id === loanId);
      if (!loan) return;
      setEditingLoanId(loan.id);
      setLender(loan.lender);
      setPrincipal(String(loan.principal));
      setInterestRate(String(loan.interestRate));
      setTermMonths(String(loan.termMonths));
      setStartDate(loan.startDate.slice(0, 10));
      setBalance(String(loan.balance));
      setLoanColor(loan.color);
      setShowLoanModal(true);
    },
    [loans]
  );

  const saveLoan = useCallback(async () => {
    if (!isOnline || isSavingLoan) return;
    const parsedPrincipal = parseFloat(principal);
    const parsedRate = parseFloat(interestRate);
    const parsedTerm = parseInt(termMonths, 10);
    const parsedBalance = parseFloat(balance);
    if (!lender.trim() || Number.isNaN(parsedPrincipal) || Number.isNaN(parsedRate)) return;
    if (Number.isNaN(parsedTerm) || parsedTerm <= 0) return;

    const payload = {
      lender: lender.trim(),
      principal: parsedPrincipal,
      interestRate: parsedRate,
      termMonths: parsedTerm,
      startDate: new Date(startDate).toISOString(),
      balance: Number.isNaN(parsedBalance) ? parsedPrincipal : parsedBalance,
      color: loanColor,
    };

    try {
      setIsSavingLoan(true);
      if (editingLoanId) {
        await editLoan(editingLoanId, payload);
      } else {
        await addLoan(payload);
      }
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setShowLoanModal(false);
      resetLoanForm();
    } catch (error) {
      Alert.alert(
        "Unable to Save Loan",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setIsSavingLoan(false);
    }
  }, [
    addLoan,
    balance,
    editLoan,
    editingLoanId,
    interestRate,
    isOnline,
    isSavingLoan,
    lender,
    loanColor,
    principal,
    startDate,
    termMonths,
    resetLoanForm,
  ]);

  const askDeleteLoan = useCallback((loanId: string, name: string) => {
    if (!isOnline) return;
    const action = async () => {
      try {
        await removeLoan(loanId);
      } catch (error) {
        console.error("Delete loan failed:", error);
      }
    };
    if (Platform.OS === "web") {
      if (confirm(`Delete loan "${name}"?`)) {
        action();
      }
      return;
    }
    Alert.alert("Delete Loan", `Delete "${name}" and its payment logs?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => action() },
    ]);
  }, [isOnline, removeLoan]);

  const askDeletePayment = useCallback((paymentId: string) => {
    if (!isOnline) return;
    const action = async () => {
      try {
        await removeLoanPayment(paymentId);
      } catch (error) {
        console.error("Delete payment failed:", error);
      }
    };
    if (Platform.OS === "web") {
      if (confirm("Delete this payment?")) {
        action();
      }
      return;
    }
    Alert.alert("Delete Payment", "Remove this payment entry?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => action() },
    ]);
  }, [isOnline, removeLoanPayment]);

  const openPaymentModal = useCallback((loanId: string) => {
    setSelectedLoanId(loanId);
    setPaymentAmount("");
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentNote("");
    setShowPaymentModal(true);
  }, []);

  const savePayment = useCallback(async () => {
    if (!isOnline || !selectedLoanId || isSavingPayment) return;
    const amountValue = parseFloat(paymentAmount);
    if (Number.isNaN(amountValue) || amountValue <= 0) return;
    try {
      setIsSavingPayment(true);
      await addLoanPayment({
        loanId: selectedLoanId,
        amount: amountValue,
        paymentDate: new Date(paymentDate).toISOString(),
        note: paymentNote.trim(),
      });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setShowPaymentModal(false);
      setSelectedLoanId(null);
    } catch (error) {
      Alert.alert(
        "Unable to Save Payment",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setIsSavingPayment(false);
    }
  }, [
    addLoanPayment,
    isOnline,
    isSavingPayment,
    paymentAmount,
    paymentDate,
    paymentNote,
    selectedLoanId,
  ]);

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
        <View style={styles.header}>
          <Text style={styles.title}>Loans</Text>
          <Pressable
            style={[styles.addButton, !isOnline && styles.buttonDisabled]}
            onPress={openCreateLoan}
            disabled={!isOnline}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Outstanding</Text>
            <Text style={[styles.summaryValue, { color: Colors.danger }]}>
              {formatFullCurrency(totals.outstanding, currencySymbol)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Principal</Text>
            <Text style={styles.summaryValue}>
              {formatFullCurrency(totals.principalTotal, currencySymbol)}
            </Text>
          </View>
        </View>

        {loans.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="card-outline" size={40} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Loans Yet</Text>
            <Text style={styles.emptyText}>
              Add your active loans to track payoff, interest, and payment logs.
            </Text>
          </View>
        ) : (
          <FlatList
            data={loans}
            keyExtractor={(loan) => loan.id}
            scrollEnabled={false}
            initialNumToRender={20}
            windowSize={7}
            renderItem={({ item: loan }) => {
              const monthlyPayment = calculateMonthlyPayment(
                loan.principal,
                loan.interestRate,
                loan.termMonths
              );
              const totalInterest = calculateTotalLoanInterest(
                loan.principal,
                loan.interestRate,
                loan.termMonths
              );
              const relatedPayments = paymentsByLoan.get(loan.id) ?? [];

              return (
                <Pressable
                  style={styles.loanCard}
                  onPress={() => openEditLoan(loan.id)}
                  onLongPress={isOnline ? () => askDeleteLoan(loan.id, loan.lender) : undefined}
                >
                  <View style={styles.loanCardHeader}>
                    <View style={[styles.loanIcon, { backgroundColor: loan.color + "20" }]}>
                      <Ionicons name="card" size={18} color={loan.color} />
                    </View>
                    <View style={styles.loanMeta}>
                      <Text style={styles.loanName}>{loan.lender}</Text>
                      <Text style={styles.loanRate}>
                        {loan.interestRate}% APR {"\u2022"} {loan.termMonths} months
                      </Text>
                    </View>
                    <Pressable
                      style={styles.payButton}
                      onPress={() => openPaymentModal(loan.id)}
                      disabled={!isOnline}
                    >
                      <Ionicons name="add" size={16} color={Colors.primary} />
                    </Pressable>
                  </View>

                  <View style={styles.loanStatsRow}>
                    <View style={styles.loanStat}>
                      <Text style={styles.loanStatLabel}>Outstanding</Text>
                      <Text style={[styles.loanStatValue, { color: Colors.danger }]}>
                        {formatFullCurrency(loan.balance, currencySymbol)}
                      </Text>
                    </View>
                    <View style={styles.loanStat}>
                      <Text style={styles.loanStatLabel}>Monthly Payment</Text>
                      <Text style={styles.loanStatValue}>
                        {formatFullCurrency(monthlyPayment, currencySymbol)}
                      </Text>
                    </View>
                    <View style={styles.loanStat}>
                      <Text style={styles.loanStatLabel}>Total Interest</Text>
                      <Text style={styles.loanStatValue}>
                        {formatFullCurrency(totalInterest, currencySymbol)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.paymentSection}>
                    <Text style={styles.paymentTitle}>Payment Logs</Text>
                    {relatedPayments.length === 0 ? (
                      <Text style={styles.paymentEmpty}>No payments logged yet.</Text>
                    ) : (
                      relatedPayments.slice(0, 3).map((payment) => (
                        <Pressable
                          key={payment.id}
                          style={styles.paymentItem}
                          onLongPress={isOnline ? () => askDeletePayment(payment.id) : undefined}
                        >
                          <Text style={styles.paymentDate}>
                            {new Date(payment.paymentDate).toLocaleDateString()}
                          </Text>
                          <Text style={styles.paymentAmount}>
                            {formatFullCurrency(payment.amount, currencySymbol)}
                          </Text>
                        </Pressable>
                      ))
                    )}
                  </View>
                </Pressable>
              );
            }}
          />
        )}
      </ScrollView>

      <Modal
        visible={showLoanModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLoanModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            style={styles.modalKeyboard}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
              <KeyboardAwareScrollViewCompat
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                bottomOffset={modalKeyboardBottomOffset}
                extraKeyboardSpace={modalKeyboardExtraSpace}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {editingLoanId ? "Edit Loan" : "New Loan"}
                  </Text>
                  <Pressable onPress={() => setShowLoanModal(false)}>
                    <Ionicons name="close" size={24} color={Colors.text} />
                  </Pressable>
                </View>

                <Text style={styles.inputLabel}>Lender</Text>
                <TextInput
                  style={styles.input}
                  value={lender}
                  onChangeText={setLender}
                  placeholder="e.g. Bank of America"
                  placeholderTextColor={Colors.textTertiary}
                />

                <Text style={styles.inputLabel}>Principal</Text>
                <TextInput
                  style={styles.input}
                  value={principal}
                  onChangeText={setPrincipal}
                  keyboardType="decimal-pad"
                  placeholder="10000"
                  placeholderTextColor={Colors.textTertiary}
                />

                <Text style={styles.inputLabel}>Interest Rate (%)</Text>
                <TextInput
                  style={styles.input}
                  value={interestRate}
                  onChangeText={setInterestRate}
                  keyboardType="decimal-pad"
                  placeholder="6.5"
                  placeholderTextColor={Colors.textTertiary}
                />

                <Text style={styles.inputLabel}>Term (months)</Text>
                <TextInput
                  style={styles.input}
                  value={termMonths}
                  onChangeText={setTermMonths}
                  keyboardType="number-pad"
                  placeholder="36"
                  placeholderTextColor={Colors.textTertiary}
                />

                <Text style={styles.inputLabel}>Start Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="2026-02-15"
                  placeholderTextColor={Colors.textTertiary}
                />

                <Text style={styles.inputLabel}>Current Balance</Text>
                <TextInput
                  style={styles.input}
                  value={balance}
                  onChangeText={setBalance}
                  keyboardType="decimal-pad"
                  placeholder="Defaults to principal"
                  placeholderTextColor={Colors.textTertiary}
                />

                <Text style={styles.inputLabel}>Color</Text>
                <View style={styles.colorRow}>
                  {LOAN_COLORS.map((color) => (
                    <Pressable
                      key={color}
                      style={[
                        styles.colorDot,
                        { backgroundColor: color },
                        loanColor === color && styles.colorDotActive,
                      ]}
                      onPress={() => setLoanColor(color)}
                    />
                  ))}
                </View>

                <Pressable
                  style={[
                    styles.saveButton,
                    (!isOnline || !lender || !principal || isSavingLoan) &&
                      styles.buttonDisabled,
                  ]}
                  onPress={saveLoan}
                  disabled={!isOnline || !lender || !principal || isSavingLoan}
                >
                  <Text style={styles.saveButtonText}>
                    {isSavingLoan ? "Saving..." : editingLoanId ? "Save Loan" : "Create Loan"}
                  </Text>
                </Pressable>
              </KeyboardAwareScrollViewCompat>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            style={styles.modalKeyboard}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
              <KeyboardAwareScrollViewCompat
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                bottomOffset={modalKeyboardBottomOffset}
                extraKeyboardSpace={modalKeyboardExtraSpace}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>New Payment</Text>
                  <Pressable onPress={() => setShowPaymentModal(false)}>
                    <Ionicons name="close" size={24} color={Colors.text} />
                  </Pressable>
                </View>

                <Text style={styles.inputLabel}>Amount</Text>
                <TextInput
                  style={styles.input}
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={Colors.textTertiary}
                />

                <Text style={styles.inputLabel}>Payment Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={paymentDate}
                  onChangeText={setPaymentDate}
                  placeholder="2026-02-15"
                  placeholderTextColor={Colors.textTertiary}
                />

                <Text style={styles.inputLabel}>Note</Text>
                <TextInput
                  style={styles.input}
                  value={paymentNote}
                  onChangeText={setPaymentNote}
                  placeholder="Optional note"
                  placeholderTextColor={Colors.textTertiary}
                />

                <Pressable
                  style={[
                    styles.saveButton,
                    (!isOnline || !paymentAmount || isSavingPayment) &&
                      styles.buttonDisabled,
                  ]}
                  onPress={savePayment}
                  disabled={!isOnline || !paymentAmount || isSavingPayment}
                >
                  <Text style={styles.saveButtonText}>
                    {isSavingPayment ? "Saving..." : "Log Payment"}
                  </Text>
                </Pressable>
              </KeyboardAwareScrollViewCompat>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: { opacity: 0.5 },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_500Medium",
  },
  summaryValue: {
    marginTop: 6,
    fontSize: 18,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 18,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
  },
  emptyText: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
    fontFamily: "DMSans_400Regular",
  },
  loanCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  loanCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  loanIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  loanMeta: {
    flex: 1,
  },
  loanName: {
    fontSize: 15,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
  },
  loanRate: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_400Regular",
  },
  payButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary + "16",
  },
  loanStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  loanStat: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 10,
  },
  loanStatLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontFamily: "DMSans_500Medium",
  },
  loanStatValue: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
  },
  paymentSection: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 10,
  },
  paymentTitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_600SemiBold",
    marginBottom: 6,
  },
  paymentEmpty: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: "DMSans_400Regular",
  },
  paymentItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  paymentDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_500Medium",
  },
  paymentAmount: {
    fontSize: 12,
    color: Colors.success,
    fontFamily: "DMSans_700Bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalKeyboard: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "92%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 22,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
  },
  inputLabel: {
    marginTop: 10,
    marginBottom: 6,
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "DMSans_600SemiBold",
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.text,
    fontFamily: "DMSans_400Regular",
  },
  colorRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },
  colorDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  colorDotActive: {
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  saveButton: {
    marginTop: 16,
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "DMSans_700Bold",
  },
});

