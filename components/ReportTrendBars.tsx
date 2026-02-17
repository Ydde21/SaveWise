import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { G, Line, Rect, Text as SvgText } from "react-native-svg";
import Colors from "@/constants/colors";
import { formatCurrency } from "@/lib/interest";
import type { ReportMonthlyPoint } from "@/lib/types";

interface ReportTrendBarsProps {
  data: ReportMonthlyPoint[];
  width: number;
  height?: number;
  currencySymbol: string;
}

export const ReportTrendBars = memo(function ReportTrendBars({
  data,
  width,
  height = 190,
  currencySymbol,
}: ReportTrendBarsProps) {
  if (!data.length) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <Text style={styles.emptyText}>No monthly trend data yet.</Text>
      </View>
    );
  }

  const padding = { top: 16, right: 8, bottom: 32, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(
    1,
    ...data.map((item) => Math.max(item.income, item.expenses))
  );
  const groupWidth = chartWidth / data.length;
  const barPairWidth = Math.max(10, groupWidth - 8);
  const barWidth = Math.max(4, (barPairWidth - 4) / 2);
  const negativeNetFlowMonths = data.filter((item) => item.netFlow < 0).length;

  return (
    <View style={[styles.container, { width }]}>
      <Svg width={width} height={height}>
        {[0, 0.5, 1].map((ratio) => (
          <Line
            key={ratio}
            x1={padding.left}
            y1={padding.top + chartHeight * ratio}
            x2={width - padding.right}
            y2={padding.top + chartHeight * ratio}
            stroke={Colors.borderLight}
            strokeWidth={1}
          />
        ))}

        <SvgText
          x={padding.left - 6}
          y={padding.top + 4}
          fill={Colors.textTertiary}
          fontSize={10}
          textAnchor="end"
        >
          {formatCurrency(maxValue, currencySymbol)}
        </SvgText>
        <SvgText
          x={padding.left - 6}
          y={padding.top + chartHeight + 4}
          fill={Colors.textTertiary}
          fontSize={10}
          textAnchor="end"
        >
          {formatCurrency(0, currencySymbol)}
        </SvgText>

        {data.map((point, index) => {
          const incomeHeight = (point.income / maxValue) * chartHeight;
          const expenseHeight = (point.expenses / maxValue) * chartHeight;
          const xCenter = padding.left + index * groupWidth + groupWidth / 2;
          const xIncome = xCenter - barPairWidth / 2;
          const xExpense = xIncome + barWidth + 4;
          const label = point.label.split(" ")[0];

          return (
            <G
              key={point.monthKey}
              accessible
              accessibilityLabel={`${point.label}: income ${formatCurrency(point.income, currencySymbol)}, expenses ${formatCurrency(point.expenses, currencySymbol)}, net ${formatCurrency(point.netFlow, currencySymbol)}`}
            >
              <Rect
                x={xIncome}
                y={padding.top + chartHeight - incomeHeight}
                width={barWidth}
                height={incomeHeight}
                fill={Colors.success}
                rx={3}
              />
              <Rect
                x={xExpense}
                y={padding.top + chartHeight - expenseHeight}
                width={barWidth}
                height={expenseHeight}
                fill={Colors.danger}
                rx={3}
              />
              <SvgText
                x={xCenter}
                y={height - 8}
                fill={Colors.textTertiary}
                fontSize={10}
                textAnchor="middle"
              >
                {label}
              </SvgText>
            </G>
          );
        })}
      </Svg>

      <View style={styles.legend}>
        <View style={styles.legendItem} accessible accessibilityLabel="Income bars">
          <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
          <Text style={styles.legendText}>Income</Text>
        </View>
        <View style={styles.legendItem} accessible accessibilityLabel="Expense bars">
          <View style={[styles.legendDot, { backgroundColor: Colors.danger }]} />
          <Text style={styles.legendText}>Expenses</Text>
        </View>
      </View>
      <Text style={styles.netFlowHint}>
        Net flow negative in {negativeNetFlowMonths} of {data.length} month
        {data.length > 1 ? "s" : ""}.
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  legend: {
    marginTop: 4,
    flexDirection: "row",
    gap: 14,
    justifyContent: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: "DMSans_500Medium",
  },
  netFlowHint: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 11,
    color: Colors.textTertiary,
    fontFamily: "DMSans_500Medium",
  },
  empty: {
    borderRadius: 14,
    backgroundColor: Colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
  },
});
