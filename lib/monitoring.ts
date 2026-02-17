import * as Sentry from "@sentry/react-native";

let monitoringInitialized = false;

export function initMonitoring() {
  if (monitoringInitialized) return;
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    enabled: !__DEV__,
    tracesSampleRate: 0.1,
    environment: process.env.EXPO_PUBLIC_APP_ENV ?? "production",
  });
  monitoringInitialized = true;
}

export function captureError(
  error: unknown,
  context?: {
    scope?: string;
    operation?: string;
    extra?: Record<string, unknown>;
  }
) {
  const err = error instanceof Error ? error : new Error(String(error));
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    console.error(err);
    return;
  }

  Sentry.captureException(err, {
    tags: {
      scope: context?.scope ?? "app",
      operation: context?.operation ?? "unknown",
    },
    extra: context?.extra,
  });
}

