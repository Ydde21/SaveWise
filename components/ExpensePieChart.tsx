import React, { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Colors from "@/constants/colors";

interface Slice {
  label: string;
  value: number;
  color: string;
}

interface ExpensePieChartProps {
  data: Slice[];
  size?: number;
}

export const ExpensePieChart = memo(function ExpensePieChart({
  data,
  size = 170,
}: ExpensePieChartProps) {
  const chartData = useMemo(() => data.filter((slice) => slice.value > 0), [data]);
  const total = chartData.reduce((sum, slice) => sum + slice.value, 0);
  const radius = size / 2 - 12;
  const circumference = 2 * Math.PI * radius;

  if (!chartData.length || total <= 0) {
    return (
      <View style={[styles.empty, { width: size, height: size }]}>
        <Text style={styles.emptyText}>No expense data yet</Text>
      </View>
    );
  }

  let startOffset = 0;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        {chartData.map((slice) => {
          const fraction = slice.value / total;
          const dashLength = fraction * circumference;
          const gap = circumference - dashLength;
          const offset = -startOffset;
          startOffset += dashLength;

          return (
            <Circle
              key={slice.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={slice.color}
              strokeWidth={18}
              fill="transparent"
              strokeDasharray={`${dashLength} ${gap}`}
              strokeDashoffset={offset}
              rotation="-90"
              originX={size / 2}
              originY={size / 2}
              strokeLinecap="butt"
            />
          );
        })}
      </Svg>
      <View style={styles.centerLabel}>
        <Text style={styles.centerLabelTop}>Total</Text>
        <Text style={styles.centerLabelValue}>
          {Math.round(total).toLocaleString("en-US")}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  centerLabel: {
    position: "absolute",
    alignItems: "center",
  },
  centerLabelTop: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: "DMSans_500Medium",
  },
  centerLabelValue: {
    fontSize: 15,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
    marginTop: 2,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.borderLight,
    borderRadius: 999,
  },
  emptyText: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
  },
});
