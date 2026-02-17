import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth, useNetwork } from "@/lib/context";
import Colors from "@/constants/colors";

export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const { isOnline } = useNetwork();
  const { isAuthenticated } = useAuth();

  if (isOnline || !isAuthenticated) return null;

  return (
    <View style={[styles.container, { top: insets.top + 8 }]}>
      <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
      <Text style={styles.text}>
        You are offline. Viewing cached data only.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 100,
    backgroundColor: Colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  text: {
    fontSize: 12,
    color: "#fff",
    fontFamily: "DMSans_500Medium",
  },
});
