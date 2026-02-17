import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Updates from "expo-updates";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineBanner } from "@/components/OfflineBanner";
import { captureError, initMonitoring } from "@/lib/monitoring";
import { queryClient } from "@/lib/query-client";
import { AppProvider, useApp } from "@/lib/context";

initMonitoring();
void SplashScreen.preventAutoHideAsync().catch((error) => {
  captureError(error, {
    scope: "boot",
    operation: "splash_prevent_auto_hide",
  });
});

function AppNavigator() {
  const { hasOnboarded, isLoading, isAuthenticated } = useApp();
  const router = useRouter();
  const segments = useSegments();
  const rootSegment = segments[0] ?? "";

  useEffect(() => {
    if (isLoading) return;

    const inOnboarding = rootSegment === "onboarding";
    const inAuth = rootSegment === "(auth)";

    if (!hasOnboarded && !inOnboarding) {
      router.replace("/onboarding");
      return;
    }

    if (hasOnboarded && !isAuthenticated && !inAuth) {
      router.replace("/(auth)/sign-in");
      return;
    }

    if (hasOnboarded && isAuthenticated && (inOnboarding || inAuth || !rootSegment)) {
      router.replace("/(tabs)");
    }
  }, [hasOnboarded, isAuthenticated, isLoading, rootSegment, router]);

  if (isLoading) return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false, headerBackTitle: "Back" }}>
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false, animation: "fade" }}
        />
        <Stack.Screen
          name="(auth)"
          options={{ headerShown: false, animation: "fade" }}
        />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="wallet/[id]"
          options={{ headerShown: false, animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="reports"
          options={{ headerShown: false, animation: "slide_from_right" }}
        />
      </Stack>
      <OfflineBanner />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });
  const [fontGateTimedOut, setFontGateTimedOut] = useState(false);
  const canRenderApp = fontsLoaded || Boolean(fontError) || fontGateTimedOut;

  useEffect(() => {
    const timer = setTimeout(() => {
      setFontGateTimedOut(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!canRenderApp) return;
    void SplashScreen.hideAsync().catch((error) => {
      captureError(error, {
        scope: "boot",
        operation: "splash_hide",
      });
    });
  }, [canRenderApp]);

  useEffect(() => {
    if (fontError) {
      captureError(fontError, {
        scope: "boot",
        operation: "font_load_error",
      });
    } else if (fontGateTimedOut && !fontsLoaded) {
      captureError(new Error("Font loading timed out after 5000ms."), {
        scope: "boot",
        operation: "font_load_timeout",
      });
    }
  }, [fontError, fontGateTimedOut, fontsLoaded]);

  useEffect(() => {
    if (!__DEV__) return;
    console.log("[updates] active bundle", {
      updateId: Updates.updateId ?? "embedded",
      channel: Updates.channel ?? "unknown",
      runtimeVersion: Updates.runtimeVersion ?? "unknown",
      isEmbeddedLaunch: Updates.isEmbeddedLaunch,
    });
  }, []);

  if (!canRenderApp) return null;

  return (
    <ErrorBoundary
      onError={(error, stackTrace) => {
        captureError(error, {
          scope: "render",
          operation: "root_error_boundary",
          extra: { stackTrace },
        });
      }}
    >
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <AppProvider>
              <AppNavigator />
            </AppProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
