import React, { memo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";

interface ReportKpiCardProps {
  label: string;
  value: string;
  subtitle?: string;
  deltaPercent: number | null;
  deltaAbsolute: number | null;
  deltaAbsoluteLabel?: string;
  higherIsBetter?: boolean;
}

const DIRECTIONAL_THRESHOLD = 0.01;

function resolveDeltaState(
  deltaPercent: number | null,
  deltaAbsolute: number | null,
  higherIsBetter: boolean
) {
  if (deltaPercent === null) {
    if (deltaAbsolute !== null && Math.abs(deltaAbsolute) < 0.0001) {
      return "neutral" as const;
    }
    return "neutral" as const;
  }
  if (Math.abs(deltaPercent) < DIRECTIONAL_THRESHOLD) return "neutral" as const;
  const improved = higherIsBetter ? deltaPercent > 0 : deltaPercent < 0;
  return improved ? ("positive" as const) : ("negative" as const);
}

export const ReportKpiCard = memo(function ReportKpiCard({
  label,
  value,
  subtitle,
  deltaPercent,
  deltaAbsolute,
  deltaAbsoluteLabel,
  higherIsBetter = true,
}: ReportKpiCardProps) {
  const state = resolveDeltaState(deltaPercent, deltaAbsolute, higherIsBetter);
  const deltaColor =
    state === "positive"
      ? Colors.success
      : state === "negative"
        ? Colors.danger
        : Colors.textSecondary;
  const deltaIcon =
    state === "positive" ? "arrow-up" : state === "negative" ? "arrow-down" : "remove";
  let deltaLabel = "N/A";
  if (deltaPercent === null) {
    if (deltaAbsolute !== null && Math.abs(deltaAbsolute) < 0.0001) {
      deltaLabel = "—";
    }
  } else if (Math.abs(deltaPercent) < DIRECTIONAL_THRESHOLD) {
    deltaLabel = "—";
  } else {
    deltaLabel = `${deltaPercent >= 0 ? "+" : ""}${(deltaPercent * 100).toFixed(1)}%`;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={[styles.deltaPill, { backgroundColor: deltaColor + "18" }]}>
        <Ionicons name={deltaIcon} size={12} color={deltaColor} />
        <Text style={[styles.deltaText, { color: deltaColor }]}>{deltaLabel}</Text>
        {deltaAbsoluteLabel ? (
          <Text style={[styles.deltaText, styles.deltaAbsolute]}>({deltaAbsoluteLabel})</Text>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    minHeight: 120,
    maxWidth: "100%",
  },
  label: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: "DMSans_500Medium",
  },
  value: {
    marginTop: 4,
    fontSize: 18,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 11,
    color: Colors.textTertiary,
    fontFamily: "DMSans_400Regular",
  },
  deltaPill: {
    marginTop: 8,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  deltaText: {
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
    flexShrink: 1,
  },
  deltaAbsolute: {
    color: Colors.textSecondary,
    fontFamily: "DMSans_500Medium",
  },
});
