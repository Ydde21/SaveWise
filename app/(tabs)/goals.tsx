import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  KeyboardAvoidingView,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useApp } from "@/lib/context";
import { formatFullCurrency } from "@/lib/interest";
import { WALLET_COLORS, GOAL_ICONS } from "@/lib/storage";
import Colors from "@/constants/colors";

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const { goals, wallets, currencySymbol, addGoal, editGoal, removeGoal, isOnline } =
    useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingAmount, setIsAddingAmount] = useState(false);
  const [activeGoalForAdd, setActiveGoalForAdd] = useState<{
    id: string;
    currentAmount: number;
    name: string;
  } | null>(null);
  const [addAmount, setAddAmount] = useState("");
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [deadline, setDeadline] = useState("");
  const [selectedColor, setSelectedColor] = useState(WALLET_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(GOAL_ICONS[0]);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const modalKeyboardBottomOffset = insets.bottom + 24;
  const modalKeyboardExtraSpace = 12;

  const resetForm = useCallback(() => {
    setEditingGoalId(null);
    setName("");
    setTarget("");
    setCurrent("");
    setDeadline("");
    setSelectedColor(WALLET_COLORS[0]);
    setSelectedIcon(GOAL_ICONS[0]);
    setSelectedWalletId(null);
  }, []);

  const resetAddAmountForm = useCallback(() => {
    setAddAmount("");
    setActiveGoalForAdd(null);
    setShowAddModal(false);
    setIsAddingAmount(false);
  }, []);

  const openEditGoal = useCallback((goalId: string) => {
    const goal = goals.find((item) => item.id === goalId);
    if (!goal) return;
    setEditingGoalId(goal.id);
    setName(goal.name);
    setTarget(String(goal.targetAmount));
    setCurrent(String(goal.currentAmount));
    setDeadline(goal.deadline.slice(0, 10));
    setSelectedColor(goal.color);
    setSelectedIcon(goal.icon);
    setSelectedWalletId(goal.walletId);
    setShowCreate(true);
  }, [goals]);

  const handleCreate = useCallback(async () => {
    if (!name.trim() || !target || !isOnline || isSaving) return;
    const deadlineDate = deadline.trim()
      ? new Date(deadline.trim()).toISOString()
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    try {
      setIsSaving(true);
      if (editingGoalId) {
        await editGoal(editingGoalId, {
          name: name.trim(),
          targetAmount: parseFloat(target) || 0,
          currentAmount: parseFloat(current) || 0,
          deadline: deadlineDate,
          walletId: selectedWalletId,
          icon: selectedIcon,
          color: selectedColor,
        });
      } else {
        await addGoal({
          name: name.trim(),
          targetAmount: parseFloat(target) || 0,
          currentAmount: parseFloat(current) || 0,
          deadline: deadlineDate,
          walletId: selectedWalletId,
          icon: selectedIcon,
          color: selectedColor,
        });
      }

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      resetForm();
      setShowCreate(false);
    } catch (error) {
      Alert.alert(
        "Unable to Save Goal",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    name,
    target,
    current,
    deadline,
    selectedColor,
    selectedIcon,
    selectedWalletId,
    addGoal,
    editGoal,
    editingGoalId,
    resetForm,
    isOnline,
    isSaving,
  ]);

  const handleDelete = useCallback(
    (id: string, goalName: string) => {
      if (!isOnline) return;
      const action = async () => {
        try {
          await removeGoal(id);
        } catch (error) {
          console.error("Delete goal failed:", error);
        }
      };
      if (Platform.OS === "web") {
        if (confirm(`Delete "${goalName}"?`)) {
          action();
        }
        return;
      }
      Alert.alert("Delete Goal", `Delete "${goalName}"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => action(),
        },
      ]);
    },
    [removeGoal, isOnline]
  );

  const handleAddToGoal = useCallback(
    (goalId: string, goalCurrent: number, goalName: string) => {
      if (!isOnline) return;
      setActiveGoalForAdd({
        id: goalId,
        currentAmount: goalCurrent,
        name: goalName,
      });
      setAddAmount("");
      setShowAddModal(true);
    },
    [isOnline]
  );

  const confirmAddToGoal = useCallback(async () => {
    if (!activeGoalForAdd || isAddingAmount) return;
    const val = parseFloat(addAmount);
    if (Number.isNaN(val) || val <= 0) return;

    try {
      setIsAddingAmount(true);
      await editGoal(activeGoalForAdd.id, {
        currentAmount: activeGoalForAdd.currentAmount + val,
      });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      resetAddAmountForm();
    } catch (error) {
      Alert.alert(
        "Unable to Add Amount",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setIsAddingAmount(false);
    }
  }, [activeGoalForAdd, addAmount, editGoal, isAddingAmount, resetAddAmountForm]);

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
          <Text style={styles.title}>Goals</Text>
          <Pressable
            style={[styles.addButton, !isOnline && styles.addButtonDisabled]}
            onPress={() => setShowCreate(true)}
            disabled={!isOnline}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </Pressable>
        </View>

        {goals.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons
                name="flag-outline"
                size={48}
                color={Colors.textTertiary}
              />
            </View>
            <Text style={styles.emptyTitle}>No Goals Yet</Text>
            <Text style={styles.emptyText}>
              Set savings goals and track your progress toward them.
            </Text>
          </View>
        ) : (
          <FlatList
            data={goals}
            keyExtractor={(goal) => goal.id}
            scrollEnabled={false}
            initialNumToRender={20}
            windowSize={7}
            renderItem={({ item: goal }) => {
              const progress = goal.targetAmount > 0
                ? Math.min(goal.currentAmount / goal.targetAmount, 1)
                : 0;
              const daysLeft = Math.max(
                0,
                Math.ceil(
                  (new Date(goal.deadline).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24)
                )
              );
              const isCompleted = progress >= 1;

              return (
                <Pressable
                  style={styles.goalCard}
                  onLongPress={isOnline ? () => handleDelete(goal.id, goal.name) : undefined}
                >
                  <View style={styles.goalCardHeader}>
                    <View
                      style={[
                        styles.goalIconContainer,
                        { backgroundColor: goal.color + "20" },
                      ]}
                    >
                      <Ionicons
                        name={goal.icon as any}
                        size={22}
                        color={goal.color}
                      />
                    </View>
                    <View style={styles.goalMeta}>
                      <Text style={styles.goalName}>{goal.name}</Text>
                      <Text style={styles.goalDeadline}>
                        {isCompleted
                          ? "Completed!"
                          : `${daysLeft} days remaining`}
                      </Text>
                    </View>
                    <View style={styles.goalActions}>
                      <Pressable
                        style={styles.goalEditButton}
                        onPress={() => openEditGoal(goal.id)}
                      >
                        <Ionicons name="create-outline" size={16} color={Colors.textSecondary} />
                      </Pressable>
                      {!isCompleted && (
                        <Pressable
                          style={[
                            styles.goalAddButton,
                            { backgroundColor: goal.color + "15" },
                          ]}
                          onPress={() =>
                            handleAddToGoal(goal.id, goal.currentAmount, goal.name)
                          }
                        >
                          <Ionicons name="add" size={18} color={goal.color} />
                        </Pressable>
                      )}
                    </View>
                  </View>

                  <View style={styles.goalProgress}>
                    <View style={styles.goalProgressBar}>
                      <View
                        style={[
                          styles.goalProgressFill,
                          {
                            width: `${progress * 100}%`,
                            backgroundColor: isCompleted
                              ? Colors.success
                              : goal.color,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.goalAmounts}>
                      <Text style={styles.goalCurrentAmount}>
                        {formatFullCurrency(goal.currentAmount, currencySymbol)}
                      </Text>
                      <Text style={styles.goalTargetAmount}>
                        {formatFullCurrency(goal.targetAmount, currencySymbol)}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.goalPercentage,
                        {
                          color: isCompleted ? Colors.success : goal.color,
                        },
                      ]}
                    >
                      {Math.round(progress * 100)}%
                    </Text>
                  </View>
                </Pressable>
              );
            }}
          />
        )}
      </ScrollView>

      <Modal
        visible={showCreate}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreate(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            style={styles.modalKeyboard}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View
              style={[
                styles.modalContent,
                { paddingBottom: insets.bottom + 20 },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingGoalId ? "Edit Goal" : "New Goal"}
                </Text>
                <Pressable onPress={() => { resetForm(); setShowCreate(false); }}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </Pressable>
              </View>

              <KeyboardAwareScrollViewCompat
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                bottomOffset={modalKeyboardBottomOffset}
                extraKeyboardSpace={modalKeyboardExtraSpace}
              >
                <Text style={styles.inputLabel}>Goal Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Vacation Fund"
                  placeholderTextColor={Colors.textTertiary}
                  value={name}
                  onChangeText={setName}
                />

                <Text style={styles.inputLabel}>Target Amount</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10000.00"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="decimal-pad"
                  value={target}
                  onChangeText={setTarget}
                />

                <Text style={styles.inputLabel}>Current Savings</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="decimal-pad"
                  value={current}
                  onChangeText={setCurrent}
                />

                <Text style={styles.inputLabel}>
                  Deadline (YYYY-MM-DD)
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="2027-01-01"
                  placeholderTextColor={Colors.textTertiary}
                  value={deadline}
                  onChangeText={setDeadline}
                />

                {wallets.length > 0 && (
                  <>
                    <Text style={styles.inputLabel}>Link to Wallet (optional)</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.walletSelector}
                    >
                      <Pressable
                        style={[
                          styles.walletChip,
                          selectedWalletId === null && styles.walletChipActive,
                        ]}
                        onPress={() => setSelectedWalletId(null)}
                      >
                        <Text
                          style={[
                            styles.walletChipText,
                            selectedWalletId === null &&
                              styles.walletChipTextActive,
                          ]}
                        >
                          None
                        </Text>
                      </Pressable>
                      {wallets.map((w) => (
                        <Pressable
                          key={w.id}
                          style={[
                            styles.walletChip,
                            selectedWalletId === w.id && styles.walletChipActive,
                          ]}
                          onPress={() => setSelectedWalletId(w.id)}
                        >
                          <Text
                            style={[
                              styles.walletChipText,
                              selectedWalletId === w.id &&
                                styles.walletChipTextActive,
                            ]}
                          >
                            {w.name}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </>
                )}

                <Text style={styles.inputLabel}>Color</Text>
                <View style={styles.colorRow}>
                  {WALLET_COLORS.map((c) => (
                    <Pressable
                      key={c}
                      style={[
                        styles.colorDot,
                        { backgroundColor: c },
                        selectedColor === c && styles.colorDotActive,
                      ]}
                      onPress={() => setSelectedColor(c)}
                    >
                      {selectedColor === c && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Icon</Text>
                <View style={styles.iconRow}>
                  {GOAL_ICONS.map((icon) => (
                    <Pressable
                      key={icon}
                      style={[
                        styles.iconChip,
                        selectedIcon === icon && {
                          backgroundColor: selectedColor + "20",
                          borderColor: selectedColor,
                        },
                      ]}
                      onPress={() => setSelectedIcon(icon)}
                    >
                      <Ionicons
                        name={icon as any}
                        size={22}
                        color={
                          selectedIcon === icon
                            ? selectedColor
                            : Colors.textSecondary
                        }
                      />
                    </Pressable>
                  ))}
                </View>

                <Pressable
                  style={[
                    styles.createButton,
                    (!name.trim() || !target || !isOnline || isSaving) && styles.createButtonDisabled,
                  ]}
                  onPress={handleCreate}
                  disabled={!name.trim() || !target || !isOnline || isSaving}
                >
                  <Text style={styles.createButtonText}>
                    {isSaving ? "Saving..." : editingGoalId ? "Save Goal" : "Create Goal"}
                  </Text>
                </Pressable>
              </KeyboardAwareScrollViewCompat>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={resetAddAmountForm}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            style={styles.modalKeyboard}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add to Goal</Text>
                <Pressable onPress={resetAddAmountForm}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </Pressable>
              </View>

              <KeyboardAwareScrollViewCompat
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                bottomOffset={modalKeyboardBottomOffset}
                extraKeyboardSpace={modalKeyboardExtraSpace}
              >
                <Text style={styles.inputLabel}>
                  {activeGoalForAdd ? activeGoalForAdd.name : "Goal"}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Amount to add"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="decimal-pad"
                  value={addAmount}
                  onChangeText={setAddAmount}
                />

                <Pressable
                  style={[
                    styles.createButton,
                    (!addAmount.trim() || isAddingAmount || !isOnline) &&
                      styles.createButtonDisabled,
                  ]}
                  onPress={confirmAddToGoal}
                  disabled={!addAmount.trim() || isAddingAmount || !isOnline}
                >
                  <Text style={styles.createButtonText}>
                    {isAddingAmount ? "Adding..." : "Add Amount"}
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
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
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
  addButtonDisabled: {
    opacity: 0.5,
  },
  goalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  goalCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  goalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  goalMeta: {
    flex: 1,
  },
  goalName: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
  },
  goalDeadline: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_400Regular",
    marginTop: 2,
  },
  goalAddButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  goalActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  goalEditButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.borderLight,
  },
  goalProgress: {
    gap: 8,
  },
  goalProgressBar: {
    height: 8,
    backgroundColor: Colors.borderLight,
    borderRadius: 4,
    overflow: "hidden",
  },
  goalProgressFill: {
    height: "100%",
    borderRadius: 4,
  },
  goalAmounts: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  goalCurrentAmount: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
  },
  goalTargetAmount: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
  },
  goalPercentage: {
    fontSize: 22,
    fontFamily: "DMSans_700Bold",
    textAlign: "right",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
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
    padding: 24,
    maxHeight: "90%",
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
  walletSelector: {
    marginTop: 4,
  },
  walletChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
    backgroundColor: Colors.background,
  },
  walletChipActive: {
    backgroundColor: Colors.primary + "15",
    borderColor: Colors.primary,
  },
  walletChipText: {
    fontSize: 13,
    fontFamily: "DMSans_500Medium",
    color: Colors.textSecondary,
  },
  walletChipTextActive: {
    color: Colors.primary,
  },
  colorRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  colorDotActive: {
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  iconRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  iconChip: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  createButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginTop: 24,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: "#fff",
  },
});

