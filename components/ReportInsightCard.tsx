import React, { memo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import type { ReportInsight } from "@/lib/types";

function getInsightVisuals(severity: ReportInsight["severity"]) {
  if (severity === "positive") {
    return {
      icon: "trending-up",
      color: Colors.success,
      label: "Positive",
    };
  }
  if (severity === "danger") {
    return {
      icon: "warning",
      color: Colors.danger,
      label: "Critical",
    };
  }
  if (severity === "warning") {
    return {
      icon: "alert-circle",
      color: Colors.warning,
      label: "Watch",
    };
  }
  return {
    icon: "information-circle",
    color: Colors.info,
    label: "Info",
  };
}

interface ReportInsightCardProps {
  insight: ReportInsight;
}

export const ReportInsightCard = memo(function ReportInsightCard({
  insight,
}: ReportInsightCardProps) {
  const visuals = getInsightVisuals(insight.severity);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: visuals.color + "16" }]}>
          <Ionicons name={visuals.icon as any} size={16} color={visuals.color} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{insight.title}</Text>
          <Text style={[styles.badge, { color: visuals.color }]}>{visuals.label}</Text>
        </View>
      </View>
      <Text style={styles.detail}>{insight.detail}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  title: {
    fontSize: 14,
    color: Colors.text,
    fontFamily: "DMSans_700Bold",
    flex: 1,
  },
  badge: {
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
  },
  detail: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "DMSans_400Regular",
    lineHeight: 18,
  },
});
