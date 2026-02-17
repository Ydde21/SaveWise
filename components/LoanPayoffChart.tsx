import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Defs, Line, LinearGradient, Path, Stop } from "react-native-svg";
import Colors from "@/constants/colors";
import { formatCurrency } from "@/lib/interest";

interface LoanPayoffChartProps {
  data: { month: number; balance: number }[];
  width: number;
  height: number;
  currencySymbol: string;
}

export const LoanPayoffChart = memo(function LoanPayoffChart({
  data,
  width,
  height,
  currencySymbol,
}: LoanPayoffChartProps) {
  if (data.length < 2) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <Text style={styles.emptyText}>Add a loan payment to see payoff trend</Text>
      </View>
    );
  }

  const padding = { top: 14, right: 10, bottom: 28, left: 52 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const min = Math.min(...data.map((point) => point.balance));
  const max = Math.max(...data.map((point) => point.balance));
  const range = Math.max(max - min, 1);

  const points = data.map((point, index) => ({
    x: padding.left + (index / (data.length - 1)) * chartWidth,
    y:
      padding.top +
      chartHeight -
      ((point.balance - min) / range) * chartHeight,
  }));

  let linePath = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    linePath += ` L ${points[i].x} ${points[i].y}`;
  }
  const fillPath = `${linePath} L ${points[points.length - 1].x} ${
    padding.top + chartHeight
  } L ${points[0].x} ${padding.top + chartHeight} Z`;

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="loanFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={Colors.danger} stopOpacity="0.26" />
            <Stop offset="1" stopColor={Colors.danger} stopOpacity="0.03" />
          </LinearGradient>
        </Defs>

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

        <Path d={fillPath} fill="url(#loanFill)" />
        <Path d={linePath} fill="none" stroke={Colors.danger} strokeWidth={2.4} />
      </Svg>

      <Text style={styles.yMax}>{formatCurrency(max, currencySymbol)}</Text>
      <Text style={styles.yMin}>{formatCurrency(min, currencySymbol)}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  yMax: {
    position: "absolute",
    top: 2,
    left: 6,
    fontSize: 10,
    color: Colors.textTertiary,
    fontFamily: "DMSans_500Medium",
  },
  yMin: {
    position: "absolute",
    bottom: 12,
    left: 6,
    fontSize: 10,
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
