import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Link } from "expo-router";
import Colors from "@/constants/colors";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useApp } from "@/lib/context";

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, isOnline } = useApp();
  const formKeyboardBottomOffset = insets.bottom + 24;
  const formKeyboardExtraSpace = 12;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }
    try {
      setLoading(true);
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[Colors.background, "#fff"]} style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 30, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={formKeyboardBottomOffset}
        extraKeyboardSpace={formKeyboardExtraSpace}
      >
        <View style={styles.hero}>
          <View style={styles.iconWrap}>
            <Ionicons name="wallet" size={32} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Sign in to sync wallets, expenses, loans, and reports across devices.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor={Colors.textTertiary}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Enter your password"
            placeholderTextColor={Colors.textTertiary}
          />

          {!isOnline && <Text style={styles.offlineNote}>You are offline. Sign in requires internet.</Text>}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.submitButton, (!isOnline || loading) && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={!isOnline || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Sign In</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don&apos;t have an account?</Text>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable>
              <Text style={styles.footerLink}>Create one</Text>
            </Pressable>
          </Link>
        </View>
      </KeyboardAwareScrollViewCompat>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 22,
    flexGrow: 1,
  },
  hero: {
    alignItems: "center",
    marginBottom: 28,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: Colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 30,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  label: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.text,
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
  },
  offlineNote: {
    marginTop: 12,
    fontSize: 12,
    color: Colors.warning,
    fontFamily: "DMSans_500Medium",
  },
  error: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.danger,
    fontFamily: "DMSans_500Medium",
  },
  submitButton: {
    marginTop: 18,
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "DMSans_700Bold",
  },
  footer: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: "DMSans_400Regular",
  },
  footerLink: {
    fontSize: 14,
    color: Colors.primary,
    fontFamily: "DMSans_600SemiBold",
  },
});
