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
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useActions, useExpenses, useIncomes, useNetwork, usePreferences, useRecurringExpenses } from "@/lib/context";
import {
  buildExpenseCategoryBreakdown,
  buildIncomeSourceBreakdown,
  buildMonthlyExpenseIncomeSnapshot,
  summarizeRecurringStatus,
} from "@/lib/expense-insights";
import {
  getExpenseRecurrence,
  getUtcMonthKey,
  isRecurringExpenseActiveForMonth,
} from "@/lib/expense-recurrence";
import { EXPENSE_CATEGORIES } from "@/lib/storage";
import Colors from "@/constants/colors";
import { formatFullCurrency } from "@/lib/interest";
import { ExpensePieChart } from "@/components/ExpensePieChart";

type Segment = "expenses" | "income";

const CONTENT_HORIZONTAL_PADDING = 40;
const DETAIL_GRID_GAP = 10;
const DETAIL_MIN_CARD_WIDTH = 160;

function monthKeyToLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const yearNum = Number(year);
  const monthNum = Number(month);
  if (!Number.isFinite(yearNum) || !Number.isFinite(monthNum)) {
    return monthKey;
  }
  return new Date(yearNum, monthNum - 1, 1).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

type ExpenseLike = {
  id: string;
  category: string;
  amount: number;
  note: string;
  date: string;
  recurrence?: "none" | "monthly";
  recurrenceEndDate?: string | null;
  paidMonths?: string[];
  recurrenceSourceId?: string;
  paidMonthKey?: string;
  isRecurringProjection?: boolean;
};
type IncomeLike = {
  id: string;
  source: string;
  amount: number;
  note: string;
  date: string;
};
type LedgerEntry = ExpenseLike | IncomeLike;

export default function ExpensesScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const expenses = useExpenses();
  const recurringExpenses = useRecurringExpenses();
  const incomes = useIncomes();
  const { currencySymbol } = usePreferences();
  const {
    addExpense,
    editExpense,
    removeExpense,
    markRecurringExpensePaid,
    markRecurringExpenseUnpaid,
    addIncome,
    editIncome,
    removeIncome,
  } = useActions();
  const { isOnline } = useNetwork();
  const [segment, setSegment] = useState<Segment>("expenses");
  const [formType, setFormType] = useState<Segment>("expenses");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [recurrence, setRecurrence] = useState<"none" | "monthly">("none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0].key);
  const [source, setSource] = useState("Salary");
  const [isSaving, setIsSaving] = useState(false);
  const [paidActionId, setPaidActionId] = useState<string | null>(null);
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const modalKeyboardBottomOffset = insets.bottom + 24;
  const modalKeyboardExtraSpace = 12;
  const currentMonthKey = getUtcMonthKey(new Date());
  const currentMonthLabel = useMemo(
    () => monthKeyToLabel(currentMonthKey),
    [currentMonthKey]
  );
  const availableDetailWidth = Math.max(0, screenWidth - CONTENT_HORIZONTAL_PADDING);
  const canUseTwoDetailColumns =
    availableDetailWidth >= DETAIL_MIN_CARD_WIDTH * 2 + DETAIL_GRID_GAP;
  const detailCardWidth = canUseTwoDetailColumns
    ? (availableDetailWidth - DETAIL_GRID_GAP) / 2
    : availableDetailWidth;

  const expenseTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (let i = 0; i < EXPENSE_CATEGORIES.length; i += 1) {
      totals.set(EXPENSE_CATEGORIES[i].key, 0);
    }
    for (let i = 0; i < expenses.length; i += 1) {
      const item = expenses[i];
      totals.set(item.category, (totals.get(item.category) ?? 0) + item.amount);
    }
    return EXPENSE_CATEGORIES.map((cat) => ({
      label: cat.label,
      color: cat.color,
      value: totals.get(cat.key) ?? 0,
    }));
  }, [expenses]);

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, item) => sum + item.amount, 0),
    [expenses]
  );
  const totalIncome = useMemo(
    () => incomes.reduce((sum, item) => sum + item.amount, 0),
    [incomes]
  );

  const listData = useMemo<LedgerEntry[]>(() => {
    const entries =
      segment === "expenses"
        ? (expenses as ExpenseLike[])
        : (incomes as IncomeLike[]);
    return entries
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, incomes, segment]);

  const categoryByKey = useMemo(() => {
    const map = new Map<string, (typeof EXPENSE_CATEGORIES)[number]>();
    for (let i = 0; i < EXPENSE_CATEGORIES.length; i += 1) {
      const categoryItem = EXPENSE_CATEGORIES[i];
      map.set(categoryItem.key, categoryItem);
    }
    return map;
  }, []);

  const recurringStatus = useMemo(
    () =>
      recurringExpenses
        .map((item) => ({
          template: item,
          isPaid: (item.paidMonths ?? []).includes(currentMonthKey),
          isActive: isRecurringExpenseActiveForMonth(item, currentMonthKey),
        }))
        .sort((a, b) => b.template.amount - a.template.amount),
    [currentMonthKey, recurringExpenses]
  );

  const monthlySnapshot = useMemo(
    () =>
      buildMonthlyExpenseIncomeSnapshot({
        expenses,
        incomes,
        monthKey: currentMonthKey,
      }),
    [currentMonthKey, expenses, incomes]
  );

  const recurringSummary = useMemo(
    () =>
      summarizeRecurringStatus(
        recurringStatus.map((item) => ({
          amount: item.template.amount,
          isActive: item.isActive,
          isPaid: item.isPaid,
        }))
      ),
    [recurringStatus]
  );

  const monthlyExpenseBreakdown = useMemo(
    () =>
      buildExpenseCategoryBreakdown({
        expenses: monthlySnapshot.monthlyExpenses,
        categories: EXPENSE_CATEGORIES,
        limit: 5,
      }),
    [monthlySnapshot.monthlyExpenses]
  );

  const monthlyIncomeBreakdown = useMemo(
    () =>
      buildIncomeSourceBreakdown({
        incomes: monthlySnapshot.monthlyIncomes,
        limit: 5,
      }),
    [monthlySnapshot.monthlyIncomes]
  );

  const resetForm = useCallback(() => {
    setEditingId(null);
    setAmount("");
    setNote("");
    setDate(new Date().toISOString().slice(0, 10));
    setRecurrence("none");
    setRecurrenceEndDate("");
    setCategory(EXPENSE_CATEGORIES[0].key);
    setSource("Salary");
  }, []);

  const openCreate = useCallback(() => {
    resetForm();
    setFormType(segment);
    setIsModalVisible(true);
  }, [resetForm, segment]);

  const openEdit = useCallback(
    (id: string) => {
      if (segment === "expenses") {
        const entry = expenses.find((item) => item.id === id);
        if (!entry) return;
        const sourceId = entry.recurrenceSourceId ?? entry.id;
        const template = recurringExpenses.find((item) => item.id === sourceId);
        const draft = template ?? entry;
        setEditingId(draft.id);
        setAmount(String(draft.amount));
        setNote(draft.note);
        setDate(draft.date.slice(0, 10));
        setCategory(draft.category);
        setRecurrence(getExpenseRecurrence(draft));
        setRecurrenceEndDate(draft.recurrenceEndDate?.slice(0, 10) ?? "");
        setFormType("expenses");
      } else {
        const entry = incomes.find((item) => item.id === id);
        if (!entry) return;
        setEditingId(entry.id);
        setAmount(String(entry.amount));
        setNote(entry.note);
        setDate(entry.date.slice(0, 10));
        setSource(entry.source);
        setFormType("income");
      }
      setIsModalVisible(true);
    },
    [expenses, incomes, recurringExpenses, segment]
  );

  const confirmDelete = useCallback((id: string) => {
    if (!isOnline) return;
    const action = async () => {
      try {
        if (segment === "expenses") {
          await removeExpense(id);
        } else {
          await removeIncome(id);
        }
      } catch (error) {
        console.error("Delete entry failed:", error);
      }
    };

    if (Platform.OS === "web") {
      if (confirm("Delete this entry?")) {
        action();
      }
      return;
    }
    Alert.alert("Delete entry", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => action() },
    ]);
  }, [isOnline, removeExpense, removeIncome, segment]);

  const toggleRecurringPaid = useCallback(
    async (expenseId: string, isPaid: boolean) => {
      if (!isOnline || paidActionId === expenseId) return;
      try {
        setPaidActionId(expenseId);
        if (isPaid) {
          await markRecurringExpenseUnpaid(expenseId, currentMonthKey);
        } else {
          await markRecurringExpensePaid(expenseId, currentMonthKey);
        }
        if (Platform.OS !== "web") {
          Haptics.selectionAsync();
        }
      } catch (error) {
        Alert.alert(
          "Unable to Update Paid Status",
          error instanceof Error ? error.message : "Please try again."
        );
      } finally {
        setPaidActionId((prev) => (prev === expenseId ? null : prev));
      }
    },
    [
      currentMonthKey,
      isOnline,
      markRecurringExpensePaid,
      markRecurringExpenseUnpaid,
      paidActionId,
    ]
  );

  const handleSave = useCallback(async () => {
    if (!isOnline || isSaving) return;
    const parsedAmount = parseFloat(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) return;
    if (!date.trim()) return;

    try {
      setIsSaving(true);
      const entryDate = new Date(date).toISOString();
      const recurrenceEndDateValue =
        recurrence === "monthly" && recurrenceEndDate.trim()
          ? recurrenceEndDate.trim()
          : null;
      if (formType === "expenses") {
        if (editingId) {
          await editExpense(editingId, {
            category,
            amount: parsedAmount,
            note: note.trim(),
            date: entryDate,
            recurrence,
            recurrenceEndDate: recurrenceEndDateValue,
          });
        } else {
          await addExpense({
            category,
            amount: parsedAmount,
            note: note.trim(),
            date: entryDate,
            recurrence,
            recurrenceEndDate: recurrenceEndDateValue,
            paidMonths: [],
          });
        }
      } else if (editingId) {
        await editIncome(editingId, {
          source: source.trim() || "Other",
          amount: parsedAmount,
          note: note.trim(),
          date: entryDate,
        });
      } else {
        await addIncome({
          source: source.trim() || "Other",
          amount: parsedAmount,
          note: note.trim(),
          date: entryDate,
        });
      }

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      if (!editingId && formType !== segment) {
        setSegment(formType);
      }
      setIsModalVisible(false);
      resetForm();
    } catch (error) {
      Alert.alert(
        "Unable to Save Entry",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    addExpense,
    addIncome,
    amount,
    category,
    date,
    editExpense,
    editIncome,
    editingId,
    isOnline,
    isSaving,
    note,
    recurrence,
    recurrenceEndDate,
    resetForm,
    formType,
    segment,
    source,
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
          <Text style={styles.title}>Expenses & Income</Text>
          <Pressable
            style={[styles.addButton, !isOnline && styles.buttonDisabled]}
            onPress={openCreate}
            disabled={!isOnline}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>All-time Expenses</Text>
            <Text style={[styles.summaryValue, { color: Colors.danger }]}>
              {formatFullCurrency(totalExpenses, currencySymbol)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>All-time Income</Text>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>
              {formatFullCurrency(totalIncome, currencySymbol)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, styles.sectionTitleNoMargin]}>
              This Month Snapshot
            </Text>
            <Text style={styles.sectionCaption}>{currentMonthLabel}</Text>
          </View>
          <View style={styles.detailGrid}>
            <View style={[styles.detailCard, { width: detailCardWidth }]}>
              <Text style={styles.detailLabel}>This Month Expenses</Text>
              <Text style={[styles.detailValue, { color: Colors.danger }]}>
                {formatFullCurrency(monthlySnapshot.monthlyExpenseTotal, currencySymbol)}
              </Text>
              <Text style={styles.detailSub}>
                {monthlySnapshot.monthlyExpenseCount} entries
              </Text>
            </View>
            <View style={[styles.detailCard, { width: detailCardWidth }]}>
              <Text style={styles.detailLabel}>This Month Income</Text>
              <Text style={[styles.detailValue, { color: Colors.success }]}>
                {formatFullCurrency(monthlySnapshot.monthlyIncomeTotal, currencySymbol)}
              </Text>
              <Text style={styles.detailSub}>
                {monthlySnapshot.monthlyIncomeCount} entries
              </Text>
            </View>
            <View style={[styles.detailCard, { width: detailCardWidth }]}>
              <Text style={styles.detailLabel}>Net Cashflow</Text>
              <Text
                style={[
                  styles.detailValue,
                  {
                    color:
                      monthlySnapshot.monthlyNetCashflow >= 0
                        ? Colors.success
                        : Colors.danger,
                  },
                ]}
              >
                {formatFullCurrency(monthlySnapshot.monthlyNetCashflow, currencySymbol)}
              </Text>
              <Text style={styles.detailSub}>Income - expenses</Text>
            </View>
            <View style={[styles.detailCard, { width: detailCardWidth }]}>
              <Text style={styles.detailLabel}>Recurring: Paid / Unpaid</Text>
              <Text style={styles.detailValue}>
                {recurringSummary.paidRecurringCount}/{recurringSummary.activeRecurringCount}
              </Text>
              <Text style={styles.detailSub}>
                {recurringSummary.unpaidRecurringCount} unpaid {"\u2022"} due{" "}
                {formatFullCurrency(recurringSummary.unpaidRecurringAmount, currencySymbol)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expense Breakdown (All Time)</Text>
          <View style={styles.breakdownCard}>
            <ExpensePieChart data={expenseTotals} />
            <View style={styles.legend}>
              {expenseTotals
                .filter((slice) => slice.value > 0)
                .slice(0, 5)
                .map((slice) => (
                  <View key={slice.label} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
                    <Text style={styles.legendText}>{slice.label}</Text>
                  </View>
                ))}
            </View>
          </View>
        </View>

        {segment === "expenses" ? (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, styles.sectionTitleNoMargin]}>
                Recurring Bills
              </Text>
              <Text style={styles.sectionCaption}>{currentMonthLabel}</Text>
            </View>
            <View style={styles.listCard}>
              {recurringStatus.length === 0 ? (
                <Text style={styles.emptyText}>No recurring expenses yet.</Text>
              ) : (
                recurringStatus.map((item) => {
                  const categoryInfo = categoryByKey.get(item.template.category);
                  const currentMonthDate = new Date(`${currentMonthKey}-01`);
                  const startDate = new Date(item.template.date);
                  const endDate = item.template.recurrenceEndDate
                    ? new Date(item.template.recurrenceEndDate)
                    : null;
                  const inactiveLabel =
                    startDate.getTime() > currentMonthDate.getTime()
                      ? `Starts ${startDate.toLocaleDateString()}`
                      : endDate
                        ? `Ended ${endDate.toLocaleDateString()}`
                        : "Inactive";

                  return (
                    <Pressable
                      key={item.template.id}
                      style={styles.listItem}
                      onPress={() => openEdit(item.template.id)}
                      onLongPress={isOnline ? () => confirmDelete(item.template.id) : undefined}
                    >
                      <View
                        style={[
                          styles.listIcon,
                          {
                            backgroundColor:
                              (categoryInfo?.color ?? Colors.primary) + "16",
                          },
                        ]}
                      >
                        <Ionicons
                          name={(categoryInfo?.icon as any) ?? "repeat"}
                          size={18}
                          color={categoryInfo?.color ?? Colors.primary}
                        />
                      </View>
                      <View style={styles.listInfo}>
                        <Text style={styles.listTitle}>
                          {categoryInfo?.label ?? item.template.category}
                        </Text>
                        <Text style={styles.listMeta}>
                          {item.isPaid
                            ? `Paid for ${currentMonthLabel}`
                            : item.isActive
                              ? `Unpaid for ${currentMonthLabel}`
                              : inactiveLabel}
                        </Text>
                      </View>
                      <View style={styles.recurringRightCol}>
                        <Text style={[styles.listAmount, { color: Colors.danger }]}>
                          -{formatFullCurrency(item.template.amount, currencySymbol)}
                        </Text>
                        {item.isActive ? (
                          <Pressable
                            style={[
                              styles.paidChip,
                              item.isPaid ? styles.paidChipActive : styles.paidChipIdle,
                              (!isOnline || paidActionId === item.template.id) &&
                                styles.buttonDisabled,
                            ]}
                            onPress={() =>
                              toggleRecurringPaid(item.template.id, item.isPaid)
                            }
                            disabled={!isOnline || paidActionId === item.template.id}
                          >
                            <Text
                              style={[
                                styles.paidChipText,
                                item.isPaid && styles.paidChipTextActive,
                              ]}
                            >
                              {paidActionId === item.template.id
                                ? "Updating..."
                                : item.isPaid
                                  ? "Paid"
                                  : "Mark Paid"}
                            </Text>
                          </Pressable>
                        ) : (
                          <Text style={styles.recurringStatusMuted}>{inactiveLabel}</Text>
                        )}
                      </View>
                    </Pressable>
                  );
                })
              )}
            </View>
          </View>
        ) : null}

        <View style={styles.segmentRow}>
          <Pressable
            style={[styles.segmentButton, segment === "expenses" && styles.segmentActive]}
            onPress={() => setSegment("expenses")}
          >
            <Text
              style={[
                styles.segmentText,
                segment === "expenses" && styles.segmentTextActive,
              ]}
            >
              Expenses
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segmentButton, segment === "income" && styles.segmentActive]}
            onPress={() => setSegment("income")}
          >
            <Text
              style={[
                styles.segmentText,
                segment === "income" && styles.segmentTextActive,
              ]}
            >
              Income
            </Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {segment === "expenses"
              ? "Top Categories (This Month)"
              : "Top Sources (This Month)"}
          </Text>
          <View style={styles.listCard}>
            {(segment === "expenses"
              ? monthlyExpenseBreakdown.length
              : monthlyIncomeBreakdown.length) === 0 ? (
              <Text style={styles.emptyText}>
                {segment === "expenses"
                  ? "No expense categories in this month."
                  : "No income sources in this month."}
              </Text>
            ) : (
              (segment === "expenses"
                ? monthlyExpenseBreakdown
                : monthlyIncomeBreakdown
              ).map((row) => (
                <View key={row.key} style={styles.detailListRow}>
                  <Text style={styles.detailListLabel}>{row.label}</Text>
                  <View style={styles.detailListRight}>
                    <Text style={styles.detailListAmount}>
                      {formatFullCurrency(row.amount, currencySymbol)}
                    </Text>
                    <Text style={styles.detailListShare}>
                      {(row.share * 100).toFixed(1)}%
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={styles.listCard}>
          <FlatList
            data={listData}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            initialNumToRender={20}
            windowSize={7}
            ListEmptyComponent={<Text style={styles.emptyText}>No entries yet.</Text>}
            renderItem={({ item }) => {
              const dateLabel = new Date(item.date).toLocaleDateString();
              const metadataParts: string[] = [dateLabel];

              if (segment === "expenses") {
                const expenseItem = item as ExpenseLike;
                const categoryInfo = categoryByKey.get(expenseItem.category);
                const canDeleteEntry =
                  isOnline && !Boolean(expenseItem.isRecurringProjection);
                const recurringEntry = Boolean(
                  expenseItem.recurrenceSourceId ||
                    expenseItem.paidMonthKey ||
                    expenseItem.isRecurringProjection
                );
                if (recurringEntry) {
                  metadataParts.push("Recurring");
                  if (expenseItem.paidMonthKey) {
                    metadataParts.push(
                      `Paid ${monthKeyToLabel(expenseItem.paidMonthKey)}`
                    );
                  }
                } else {
                  metadataParts.push("One-time");
                }
                if (item.note.trim()) {
                  metadataParts.push(item.note.trim());
                }

                return (
                  <Pressable
                    style={styles.listItem}
                    onPress={() => openEdit(item.id)}
                    onLongPress={canDeleteEntry ? () => confirmDelete(item.id) : undefined}
                  >
                    <View
                      style={[
                        styles.listIcon,
                        {
                          backgroundColor: (categoryInfo?.color ?? Colors.danger) + "20",
                        },
                      ]}
                    >
                      <Ionicons
                        name={(categoryInfo?.icon as any) ?? "receipt"}
                        size={18}
                        color={categoryInfo?.color ?? Colors.danger}
                      />
                    </View>
                    <View style={styles.listInfo}>
                      <Text style={styles.listTitle}>
                        {categoryInfo?.label ?? expenseItem.category}
                      </Text>
                      <Text style={styles.listMeta}>{metadataParts.join(" \u2022 ")}</Text>
                    </View>
                    <Text style={[styles.listAmount, { color: Colors.danger }]}>
                      -{formatFullCurrency(item.amount, currencySymbol)}
                    </Text>
                  </Pressable>
                );
              }

              const incomeItem = item as IncomeLike;
              const sourceLabel = incomeItem.source.trim() || "Other";
              metadataParts.push(`Source: ${sourceLabel}`);
              metadataParts.push(
                getUtcMonthKey(incomeItem.date) === currentMonthKey
                  ? "This month"
                  : "Past"
              );

              if (item.note.trim()) {
                metadataParts.push(item.note.trim());
              }

              return (
                <Pressable
                  style={styles.listItem}
                  onPress={() => openEdit(item.id)}
                  onLongPress={isOnline ? () => confirmDelete(item.id) : undefined}
                >
                  <View
                    style={[
                      styles.listIcon,
                      {
                        backgroundColor: Colors.success + "18",
                      },
                    ]}
                  >
                    <Ionicons name="trending-up" size={18} color={Colors.success} />
                  </View>
                  <View style={styles.listInfo}>
                    <Text style={styles.listTitle}>{sourceLabel}</Text>
                    <Text style={styles.listMeta}>{metadataParts.join(" \u2022 ")}</Text>
                  </View>
                  <Text style={[styles.listAmount, { color: Colors.success }]}>
                    +{formatFullCurrency(item.amount, currencySymbol)}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      </ScrollView>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            style={styles.modalKeyboard}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingId
                    ? "Edit Entry"
                    : `New ${formType === "expenses" ? "Expense" : "Income"}`}
                </Text>
                <Pressable onPress={() => setIsModalVisible(false)}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </Pressable>
              </View>

              <KeyboardAwareScrollViewCompat
                style={styles.modalScroll}
                contentContainerStyle={styles.modalFormContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                bottomOffset={modalKeyboardBottomOffset}
                extraKeyboardSpace={modalKeyboardExtraSpace}
              >
                {!editingId ? (
                  <View style={styles.modalTypeRow}>
                    <Pressable
                      style={[
                        styles.modalTypeButton,
                        formType === "expenses" && styles.modalTypeButtonActive,
                      ]}
                      onPress={() => setFormType("expenses")}
                    >
                      <Text
                        style={[
                          styles.modalTypeText,
                          formType === "expenses" && styles.modalTypeTextActive,
                        ]}
                      >
                        Expense
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.modalTypeButton,
                        formType === "income" && styles.modalTypeButtonActive,
                      ]}
                      onPress={() => setFormType("income")}
                    >
                      <Text
                        style={[
                          styles.modalTypeText,
                          formType === "income" && styles.modalTypeTextActive,
                        ]}
                      >
                        Income
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                {formType === "expenses" ? (
                  <>
                    <Text style={styles.inputLabel}>Category</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.categoryRow}>
                        {EXPENSE_CATEGORIES.map((cat) => (
                          <Pressable
                            key={cat.key}
                            style={[
                              styles.categoryChip,
                              category === cat.key && {
                                borderColor: cat.color,
                                backgroundColor: cat.color + "16",
                              },
                            ]}
                            onPress={() => setCategory(cat.key)}
                          >
                            <Ionicons
                              name={cat.icon as any}
                              size={16}
                              color={category === cat.key ? cat.color : Colors.textSecondary}
                            />
                            <Text
                              style={[
                                styles.categoryText,
                                category === cat.key && { color: cat.color },
                              ]}
                            >
                              {cat.label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </ScrollView>

                    <Text style={styles.inputLabel}>Repeat</Text>
                    <View style={styles.recurrenceRow}>
                      <Pressable
                        style={[
                          styles.recurrenceChip,
                          recurrence === "none" && styles.recurrenceChipActive,
                        ]}
                        onPress={() => setRecurrence("none")}
                      >
                        <Text
                          style={[
                            styles.recurrenceText,
                            recurrence === "none" && styles.recurrenceTextActive,
                          ]}
                        >
                          One-time
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.recurrenceChip,
                          recurrence === "monthly" && styles.recurrenceChipActive,
                        ]}
                        onPress={() => setRecurrence("monthly")}
                      >
                        <Text
                          style={[
                            styles.recurrenceText,
                            recurrence === "monthly" && styles.recurrenceTextActive,
                          ]}
                        >
                          Monthly recurring
                        </Text>
                      </Pressable>
                    </View>

                    {recurrence === "monthly" ? (
                      <>
                        <Text style={styles.inputLabel}>End Date (Optional YYYY-MM-DD)</Text>
                        <TextInput
                          style={styles.input}
                          value={recurrenceEndDate}
                          onChangeText={setRecurrenceEndDate}
                          placeholder="Leave empty for no end date"
                          placeholderTextColor={Colors.textTertiary}
                        />
                      </>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Text style={styles.inputLabel}>Source</Text>
                    <TextInput
                      style={styles.input}
                      value={source}
                      onChangeText={setSource}
                      placeholder="e.g. Salary, Freelance"
                      placeholderTextColor={Colors.textTertiary}
                    />
                  </>
                )}

                <Text style={styles.inputLabel}>Amount</Text>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={Colors.textTertiary}
                />

                <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={date}
                  onChangeText={setDate}
                  placeholder="2026-02-15"
                  placeholderTextColor={Colors.textTertiary}
                />

                <Text style={styles.inputLabel}>Note</Text>
                <TextInput
                  style={styles.input}
                  value={note}
                  onChangeText={setNote}
                  placeholder="Optional note"
                  placeholderTextColor={Colors.textTertiary}
                />

                <Pressable
                  style={[
                    styles.saveButton,
                    (!isOnline || !amount || isSaving) && styles.buttonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={!isOnline || !amount || isSaving}
                >
                  <Text style={styles.saveButtonText}>
                    {isSaving ? "Saving..." : editingId ? "Save Changes" : "Create Entry"}
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
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontSize: 27,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
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
    fontFamily: "DMSans_700Bold",
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: DETAIL_GRID_GAP,
    columnGap: DETAIL_GRID_GAP,
  },
  detailCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_500Medium",
  },
  detailValue: {
    marginTop: 4,
    fontSize: 18,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
  },
  detailSub: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_400Regular",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
    marginBottom: 10,
  },
  sectionTitleNoMargin: {
    marginBottom: 0,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionCaption: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: "DMSans_500Medium",
  },
  breakdownCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  legend: {
    marginTop: 10,
    width: "100%",
    paddingHorizontal: 16,
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
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_500Medium",
  },
  segmentRow: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 4,
    flexDirection: "row",
    marginBottom: 12,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  segmentActive: {
    backgroundColor: Colors.primary + "18",
  },
  segmentText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "DMSans_600SemiBold",
  },
  segmentTextActive: {
    color: Colors.primary,
  },
  listCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  emptyText: {
    textAlign: "center",
    color: Colors.textTertiary,
    fontFamily: "DMSans_500Medium",
    paddingVertical: 18,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  listIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  listInfo: {
    flex: 1,
  },
  listTitle: {
    fontSize: 14,
    color: Colors.text,
    fontFamily: "DMSans_600SemiBold",
  },
  listMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_400Regular",
    marginTop: 2,
  },
  detailListRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  detailListLabel: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    fontFamily: "DMSans_600SemiBold",
  },
  detailListRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  detailListAmount: {
    fontSize: 13,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
  },
  detailListShare: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: "DMSans_500Medium",
  },
  listAmount: {
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
  },
  recurringRightCol: {
    alignItems: "flex-end",
    gap: 6,
  },
  paidChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  paidChipIdle: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "12",
  },
  paidChipActive: {
    borderColor: Colors.success,
    backgroundColor: Colors.success + "16",
  },
  paidChipText: {
    fontSize: 11,
    color: Colors.primary,
    fontFamily: "DMSans_600SemiBold",
  },
  paidChipTextActive: {
    color: Colors.success,
  },
  recurringStatusMuted: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontFamily: "DMSans_500Medium",
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
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 21,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalFormContent: {
    paddingBottom: 4,
  },
  modalTypeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    marginBottom: 2,
  },
  modalTypeButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: "center",
    paddingVertical: 10,
  },
  modalTypeButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "16",
  },
  modalTypeText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_600SemiBold",
  },
  modalTypeTextActive: {
    color: Colors.primary,
  },
  inputLabel: {
    marginTop: 12,
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
  categoryRow: {
    flexDirection: "row",
    gap: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: Colors.background,
  },
  categoryText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
  },
  recurrenceRow: {
    flexDirection: "row",
    gap: 8,
  },
  recurrenceChip: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: "center",
    paddingVertical: 10,
  },
  recurrenceChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "16",
  },
  recurrenceText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
  },
  recurrenceTextActive: {
    color: Colors.primary,
  },
  saveButton: {
    marginTop: 18,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "DMSans_700Bold",
  },
});


