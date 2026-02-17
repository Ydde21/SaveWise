import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import { formatFullCurrency } from "@/lib/interest";

interface CashFlowBarChartProps {
  income: number;
  expenses: number;
  currencySymbol: string;
}

export const CashFlowBarChart = memo(function CashFlowBarChart({
  income,
  expenses,
  currencySymbol,
}: CashFlowBarChartProps) {
  const max = Math.max(income, expenses, 1);
  const incomeHeight = Math.max((income / max) * 120, income > 0 ? 8 : 0);
  const expenseHeight = Math.max((expenses / max) * 120, expenses > 0 ? 8 : 0);

  return (
    <View style={styles.container}>
      <View style={styles.chartRow}>
        <View style={styles.barWrap}>
          <View style={styles.track}>
            <View
              style={[styles.bar, styles.incomeBar, { height: incomeHeight }]}
            />
          </View>
          <Text style={styles.label}>Income</Text>
          <Text style={styles.value}>
            {formatFullCurrency(income, currencySymbol)}
          </Text>
        </View>

        <View style={styles.barWrap}>
          <View style={styles.track}>
            <View
              style={[styles.bar, styles.expenseBar, { height: expenseHeight }]}
            />
          </View>
          <Text style={styles.label}>Expenses</Text>
          <Text style={styles.value}>
            {formatFullCurrency(expenses, currencySymbol)}
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  chartRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
  },
  barWrap: {
    alignItems: "center",
    width: 120,
  },
  track: {
    width: 44,
    height: 130,
    borderRadius: 12,
    backgroundColor: Colors.borderLight,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  bar: {
    width: "100%",
    borderRadius: 12,
  },
  incomeBar: {
    backgroundColor: Colors.success,
  },
  expenseBar: {
    backgroundColor: Colors.danger,
  },
  label: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_500Medium",
  },
  value: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
  },
});
