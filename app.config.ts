import type { ExpoConfig } from "expo/config";

const easProjectId =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
  process.env.EAS_PROJECT_ID ??
  "79696bb8-62cc-4088-a352-74bda4be85aa";
const iosBuildNumber = process.env.IOS_BUILD_NUMBER ?? "1";
const androidVersionCode = Number(process.env.ANDROID_VERSION_CODE ?? "1");

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const resolvedProjectId =
  easProjectId && uuidRegex.test(easProjectId) ? easProjectId : undefined;

const config: ExpoConfig = {
  name: "SaveWise",
  slug: "savewise",
  version: "1.0.0",
  icon: "./assets/images/icon.png",
  orientation: "portrait",
  scheme: "savewise",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.savewise.app",
    buildNumber: iosBuildNumber,
  },
  android: {
    package: "com.savewise.app",
    versionCode: Number.isFinite(androidVersionCode) ? androidVersionCode : 1,
    softwareKeyboardLayoutMode: "resize",
    adaptiveIcon: {
      foregroundImage: "./assets/images/icon.png",
      backgroundColor: "#F7F8FA",
    },
  },
  androidStatusBar: {
    barStyle: "dark-content",
    backgroundColor: "#F7F8FA",
    translucent: true,
  },
  web: {
    bundler: "metro",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "@sentry/react-native",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        resizeMode: "contain",
        backgroundColor: "#F7F8FA",
      },
    ],
    "expo-asset",
  ],
  updates: {
    url: "https://u.expo.dev/79696bb8-62cc-4088-a352-74bda4be85aa",
  },
  runtimeVersion: {
    policy: "appVersion",
  },
  experiments: {
    typedRoutes: false,
  },
  extra: {
    ...(resolvedProjectId
      ? {
          eas: {
            projectId: "79696bb8-62cc-4088-a352-74bda4be85aa",
          },
        }
      : {}),
  },
};

export default config;
