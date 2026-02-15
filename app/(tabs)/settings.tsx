import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Modal,
  Alert,
  Platform,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useApp } from "@/lib/context";
import { exportData } from "@/lib/storage";
import Colors from "@/constants/colors";

const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "\u20AC", name: "Euro" },
  { code: "GBP", symbol: "\u00A3", name: "British Pound" },
  { code: "JPY", symbol: "\u00A5", name: "Japanese Yen" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "INR", symbol: "\u20B9", name: "Indian Rupee" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
  { code: "CNY", symbol: "\u00A5", name: "Chinese Yuan" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "SEK", symbol: "kr", name: "Swedish Krona" },
  { code: "NOK", symbol: "kr", name: "Norwegian Krone" },
  { code: "DKK", symbol: "kr", name: "Danish Krone" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "MXN", symbol: "MX$", name: "Mexican Peso" },
  { code: "KRW", symbol: "\u20A9", name: "South Korean Won" },
  { code: "TWD", symbol: "NT$", name: "Taiwan Dollar" },
  { code: "THB", symbol: "\u0E3F", name: "Thai Baht" },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit" },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah" },
  { code: "PHP", symbol: "\u20B1", name: "Philippine Peso" },
  { code: "VND", symbol: "\u20AB", name: "Vietnamese Dong" },
  { code: "TRY", symbol: "\u20BA", name: "Turkish Lira" },
  { code: "RUB", symbol: "\u20BD", name: "Russian Ruble" },
  { code: "PLN", symbol: "z\u0142", name: "Polish Zloty" },
  { code: "CZK", symbol: "K\u010D", name: "Czech Koruna" },
  { code: "HUF", symbol: "Ft", name: "Hungarian Forint" },
  { code: "RON", symbol: "lei", name: "Romanian Leu" },
  { code: "BGN", symbol: "лв", name: "Bulgarian Lev" },
  { code: "HRK", symbol: "kn", name: "Croatian Kuna" },
  { code: "ILS", symbol: "\u20AA", name: "Israeli Shekel" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
  { code: "QAR", symbol: "﷼", name: "Qatari Riyal" },
  { code: "KWD", symbol: "د.ك", name: "Kuwaiti Dinar" },
  { code: "BHD", symbol: "BD", name: "Bahraini Dinar" },
  { code: "OMR", symbol: "﷼", name: "Omani Rial" },
  { code: "EGP", symbol: "E\u00A3", name: "Egyptian Pound" },
  { code: "NGN", symbol: "\u20A6", name: "Nigerian Naira" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
  { code: "GHS", symbol: "GH\u20B5", name: "Ghanaian Cedi" },
  { code: "PKR", symbol: "\u20A8", name: "Pakistani Rupee" },
  { code: "BDT", symbol: "\u09F3", name: "Bangladeshi Taka" },
  { code: "LKR", symbol: "Rs", name: "Sri Lankan Rupee" },
  { code: "NPR", symbol: "Rs", name: "Nepalese Rupee" },
  { code: "ARS", symbol: "AR$", name: "Argentine Peso" },
  { code: "CLP", symbol: "CL$", name: "Chilean Peso" },
  { code: "COP", symbol: "CO$", name: "Colombian Peso" },
  { code: "PEN", symbol: "S/.", name: "Peruvian Sol" },
  { code: "UYU", symbol: "$U", name: "Uruguayan Peso" },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { currency, currencySymbol, setCurrency, wallets, transactions, goals } =
    useApp();
  const [showCurrency, setShowCurrency] = useState(false);
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const handleExport = useCallback(async () => {
    try {
      const csv = await exportData();
      if (Platform.OS === "web") {
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "savewise_export.csv";
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({
          message: csv,
          title: "SaveWise Export",
        });
      }
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Export error:", error);
    }
  }, []);

  const MenuItem = ({
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
  }) => (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <View
        style={[styles.menuIcon, { backgroundColor: iconColor + "15" }]}
      >
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <View style={styles.menuRight}>
        {value && <Text style={styles.menuValue}>{value}</Text>}
        {showArrow && (
          <Ionicons
            name="chevron-forward"
            size={18}
            color={Colors.textTertiary}
          />
        )}
      </View>
    </Pressable>
  );

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
        <Text style={styles.title}>Settings</Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{wallets.length}</Text>
              <Text style={styles.summaryLabel}>Wallets</Text>
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
        </View>

        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <View style={styles.menuGroup}>
          <MenuItem
            icon="cash"
            iconColor={Colors.primary}
            label="Currency"
            value={`${currencySymbol} ${currency}`}
            onPress={() => setShowCurrency(true)}
          />
        </View>

        <Text style={styles.sectionLabel}>DATA</Text>
        <View style={styles.menuGroup}>
          <MenuItem
            icon="download"
            iconColor={Colors.info}
            label="Export Data (CSV)"
            onPress={handleExport}
          />
        </View>

        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.menuGroup}>
          <MenuItem
            icon="information-circle"
            iconColor={Colors.accent}
            label="Version"
            value="1.0.0"
            showArrow={false}
          />
        </View>

        <Text style={styles.footerText}>
          SaveWise - Smart Savings Tracker
        </Text>
      </ScrollView>

      <Modal
        visible={showCurrency}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCurrency(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { paddingBottom: insets.bottom + 20 },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Currency</Text>
              <Pressable onPress={() => setShowCurrency(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>
            <ScrollView>
              {CURRENCIES.map((c) => (
                <Pressable
                  key={c.code}
                  style={[
                    styles.currencyItem,
                    currency === c.code && styles.currencyItemActive,
                  ]}
                  onPress={() => {
                    setCurrency(c.code, c.symbol);
                    setShowCurrency(false);
                    if (Platform.OS !== "web") {
                      Haptics.selectionAsync();
                    }
                  }}
                >
                  <Text style={styles.currencySymbol}>{c.symbol}</Text>
                  <View style={styles.currencyInfo}>
                    <Text style={styles.currencyCode}>{c.code}</Text>
                    <Text style={styles.currencyName}>{c.name}</Text>
                  </View>
                  {currency === c.code && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={Colors.primary}
                    />
                  )}
                </Pressable>
              ))}
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
  title: {
    fontSize: 28,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.borderLight,
  },
  summaryValue: {
    fontSize: 24,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.textTertiary,
    marginBottom: 8,
    marginTop: 8,
    letterSpacing: 1,
  },
  menuGroup: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    marginBottom: 16,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
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
    fontFamily: "DMSans_500Medium",
    color: Colors.text,
  },
  menuRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  menuValue: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
  },
  footerText: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: Colors.textTertiary,
    textAlign: "center",
    marginTop: 24,
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
    maxHeight: "70%",
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
  currencyItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    marginBottom: 4,
    gap: 14,
  },
  currencyItemActive: {
    backgroundColor: Colors.primary + "10",
  },
  currencySymbol: {
    fontSize: 24,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
    width: 36,
    textAlign: "center",
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
  },
  currencyName: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
