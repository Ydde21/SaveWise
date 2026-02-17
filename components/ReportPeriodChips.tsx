import React, { memo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import type { ReportRangeKey } from "@/lib/types";

const OPTIONS: ReportRangeKey[] = ["1M", "3M", "6M", "12M"];

interface ReportPeriodChipsProps {
  value: ReportRangeKey;
  onChange: (next: ReportRangeKey) => void;
}

export const ReportPeriodChips = memo(function ReportPeriodChips({
  value,
  onChange,
}: ReportPeriodChipsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.row}>
        {OPTIONS.map((option) => {
          const active = option === value;
          return (
            <Pressable
              key={option}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onChange(option)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    minWidth: 56,
    height: 34,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  chipActive: {
    backgroundColor: Colors.primary + "18",
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "DMSans_600SemiBold",
  },
  chipTextActive: {
    color: Colors.primary,
  },
});
