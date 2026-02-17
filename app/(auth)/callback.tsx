import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { supabase } from "@/lib/supabase";

type CallbackState = "verifying" | "ready" | "error";

function getParam(url: string, key: string): string | null {
  const hashPart = url.includes("#") ? url.split("#")[1] : "";
  const queryPart = url.includes("?") ? url.split("?")[1].split("#")[0] : "";
  const hashParams = new URLSearchParams(hashPart);
  const queryParams = new URLSearchParams(queryPart);
  return hashParams.get(key) ?? queryParams.get(key);
}

export default function AuthCallbackScreen() {
  const [state, setState] = useState<CallbackState>("verifying");
  const [message, setMessage] = useState("Verifying your account...");

  useEffect(() => {
    let mounted = true;

    const completeAuth = async (url: string) => {
      try {
        const authError = getParam(url, "error_description") ?? getParam(url, "error");
        if (authError) {
          throw new Error(decodeURIComponent(authError));
        }

        const accessToken = getParam(url, "access_token");
        const refreshToken = getParam(url, "refresh_token");
        const code = getParam(url, "code");

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        if (!mounted) return;
        setState("ready");
        setMessage("Email confirmed. Redirecting...");
        router.replace("/(tabs)");
      } catch (error) {
        if (!mounted) return;
        setState("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to complete verification."
        );
      }
    };

    const bootstrap = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        await completeAuth(initialUrl);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      if (data.session) {
        router.replace("/(tabs)");
      } else {
        setState("ready");
        setMessage("Verification link opened. Sign in to continue.");
      }
    };

    bootstrap();

    const subscription = Linking.addEventListener("url", ({ url }) => {
      void completeAuth(url);
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {state === "verifying" ? (
          <ActivityIndicator size="large" color={Colors.primary} />
        ) : null}
        <Text style={styles.title}>
          {state === "error" ? "Verification Error" : "Confirming Account"}
        </Text>
        <Text style={styles.message}>{message}</Text>
        {state !== "verifying" ? (
          <Pressable
            style={styles.button}
            onPress={() => router.replace("/(auth)/sign-in")}
          >
            <Text style={styles.buttonText}>Go to Sign In</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  button: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
  },
});
