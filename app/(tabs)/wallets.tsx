import React, { useState, useCallback } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useApp } from "@/lib/context";
import { formatFullCurrency } from "@/lib/interest";
import { WALLET_COLORS, WALLET_ICONS } from "@/lib/storage";
import Colors from "@/constants/colors";

export default function WalletsScreen() {
  const insets = useSafeAreaInsets();
  const { wallets, currencySymbol, addWallet, removeWallet } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [rate, setRate] = useState("");
  const [frequency, setFrequency] = useState<
    "daily" | "monthly" | "quarterly" | "annually"
  >("monthly");
  const [selectedColor, setSelectedColor] = useState(WALLET_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(WALLET_ICONS[0]);
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const resetForm = useCallback(() => {
    setName("");
    setBalance("");
    setRate("");
    setFrequency("monthly");
    setSelectedColor(WALLET_COLORS[0]);
    setSelectedIcon(WALLET_ICONS[0]);
  }, []);

  const handleCreate = useCallback(async () => {
    if (!name.trim()) return;
    await addWallet({
      name: name.trim(),
      balance: parseFloat(balance) || 0,
      interestRate: parseFloat(rate) || 0,
      compoundingFrequency: frequency,
      currency: "USD",
      color: selectedColor,
      icon: selectedIcon,
    });
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    resetForm();
    setShowCreate(false);
  }, [name, balance, rate, frequency, selectedColor, selectedIcon, addWallet, resetForm]);

  const handleDelete = useCallback(
    (id: string, walletName: string) => {
      if (Platform.OS === "web") {
        if (confirm(`Delete "${walletName}"? This will also remove all its transactions.`)) {
          removeWallet(id);
        }
        return;
      }
      Alert.alert(
        "Delete Wallet",
        `Delete "${walletName}"? This will also remove all its transactions.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => removeWallet(id),
          },
        ]
      );
    },
    [removeWallet]
  );

  const frequencies = [
    { key: "daily" as const, label: "Daily" },
    { key: "monthly" as const, label: "Monthly" },
    { key: "quarterly" as const, label: "Quarterly" },
    { key: "annually" as const, label: "Annually" },
  ];

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
          <Text style={styles.title}>Wallets</Text>
          <Pressable
            style={styles.addButton}
            onPress={() => setShowCreate(true)}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </Pressable>
        </View>

        {wallets.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="wallet-outline"
                size={48}
                color={Colors.textTertiary}
              />
            </View>
            <Text style={styles.emptyTitle}>No Wallets Yet</Text>
            <Text style={styles.emptyText}>
              Create a wallet to start tracking your savings with interest projections.
            </Text>
          </View>
        ) : (
          wallets.map((wallet) => (
            <Pressable
              key={wallet.id}
              style={styles.walletCard}
              onPress={() =>
                router.push({
                  pathname: "/wallet/[id]",
                  params: { id: wallet.id },
                })
              }
              onLongPress={() => handleDelete(wallet.id, wallet.name)}
            >
              <View style={styles.walletCardTop}>
                <View
                  style={[
                    styles.walletIconContainer,
                    { backgroundColor: wallet.color + "20" },
                  ]}
                >
                  <Ionicons
                    name={wallet.icon as any}
                    size={24}
                    color={wallet.color}
                  />
                </View>
                <View style={styles.walletMeta}>
                  <Text style={styles.walletName}>{wallet.name}</Text>
                  <Text style={styles.walletFreq}>
                    {wallet.interestRate}% APY ·{" "}
                    {wallet.compoundingFrequency} compounding
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={Colors.textTertiary}
                />
              </View>
              <View style={styles.walletCardBottom}>
                <Text style={styles.walletBalanceLabel}>Balance</Text>
                <Text style={[styles.walletBalance, { color: wallet.color }]}>
                  {formatFullCurrency(wallet.balance, currencySymbol)}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      <Modal
        visible={showCreate}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreate(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { paddingBottom: insets.bottom + 20 },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Wallet</Text>
              <Pressable onPress={() => { resetForm(); setShowCreate(false); }}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Emergency Fund"
                placeholderTextColor={Colors.textTertiary}
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.inputLabel}>Starting Balance</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="decimal-pad"
                value={balance}
                onChangeText={setBalance}
              />

              <Text style={styles.inputLabel}>Annual Interest Rate (%)</Text>
              <TextInput
                style={styles.input}
                placeholder="5.0"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="decimal-pad"
                value={rate}
                onChangeText={setRate}
              />

              <Text style={styles.inputLabel}>Compounding Frequency</Text>
              <View style={styles.freqRow}>
                {frequencies.map((f) => (
                  <Pressable
                    key={f.key}
                    style={[
                      styles.freqChip,
                      frequency === f.key && styles.freqChipActive,
                    ]}
                    onPress={() => setFrequency(f.key)}
                  >
                    <Text
                      style={[
                        styles.freqChipText,
                        frequency === f.key && styles.freqChipTextActive,
                      ]}
                    >
                      {f.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

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
                {WALLET_ICONS.map((icon) => (
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
                  !name.trim() && styles.createButtonDisabled,
                ]}
                onPress={handleCreate}
                disabled={!name.trim()}
              >
                <Text style={styles.createButtonText}>Create Wallet</Text>
              </Pressable>
            </ScrollView>
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
  walletCard: {
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
  walletCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 14,
  },
  walletIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  walletMeta: {
    flex: 1,
  },
  walletName: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
  },
  walletFreq: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_400Regular",
    marginTop: 2,
  },
  walletCardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  walletBalanceLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "DMSans_400Regular",
  },
  walletBalance: {
    fontSize: 22,
    fontFamily: "DMSans_700Bold",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
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
  freqRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  freqChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  freqChipActive: {
    backgroundColor: Colors.primary + "15",
    borderColor: Colors.primary,
  },
  freqChipText: {
    fontSize: 13,
    fontFamily: "DMSans_500Medium",
    color: Colors.textSecondary,
  },
  freqChipTextActive: {
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
