import { Platform } from "react-native";
import type { CustomerInfo } from "react-native-purchases";
import { PREMIUM_ENTITLEMENT_ID } from "@/lib/premium";

let purchasesInitialized = false;
let configuredUserId: string | null = null;

export const BILLING_DISABLED_BUILD_MESSAGE =
  "Purchases are unavailable in this APK build. Use Play build for subscription checkout.";

function isNativeBillingPlatform() {
  return Platform.OS === "ios" || Platform.OS === "android";
}

export function isBillingEnabledBuild() {
  const raw = process.env.EXPO_PUBLIC_ENABLE_BILLING;
  if (!raw) return true;
  const normalized = raw.trim().toLowerCase();
  return !["0", "false", "no", "off"].includes(normalized);
}

export function getBillingUnavailableMessage() {
  if (!isNativeBillingPlatform()) {
    return "In-app purchases are only available on iOS and Android.";
  }
  if (!isBillingEnabledBuild()) {
    return BILLING_DISABLED_BUILD_MESSAGE;
  }
  return null;
}

function getRevenueCatApiKey(): string {
  const unavailableMessage = getBillingUnavailableMessage();
  if (unavailableMessage) {
    throw new Error(unavailableMessage);
  }
  if (Platform.OS === "ios") {
    const key = process.env.EXPO_PUBLIC_RC_API_KEY_IOS;
    if (!key) throw new Error("EXPO_PUBLIC_RC_API_KEY_IOS is not set.");
    return key;
  }
  if (Platform.OS === "android") {
    const key = process.env.EXPO_PUBLIC_RC_API_KEY_ANDROID;
    if (!key) throw new Error("EXPO_PUBLIC_RC_API_KEY_ANDROID is not set.");
    return key;
  }
  throw new Error("In-app purchases are only available on iOS and Android.");
}

async function loadPurchases() {
  const unavailableMessage = getBillingUnavailableMessage();
  if (unavailableMessage) {
    throw new Error(unavailableMessage);
  }
  return await import("react-native-purchases");
}

export function isBillingSupportedPlatform() {
  return getBillingUnavailableMessage() === null;
}

export async function configureBilling(userId: string) {
  const purchasesModule = await loadPurchases();
  const Purchases = purchasesModule.default;
  const apiKey = getRevenueCatApiKey();

  if (!purchasesInitialized) {
    if (__DEV__ && purchasesModule.LOG_LEVEL) {
      Purchases.setLogLevel(purchasesModule.LOG_LEVEL.DEBUG);
    }
    Purchases.configure({
      apiKey,
      appUserID: userId,
    });
    purchasesInitialized = true;
    configuredUserId = userId;
    return;
  }

  if (configuredUserId && configuredUserId !== userId) {
    await Purchases.logIn(userId);
    configuredUserId = userId;
  }
}

export async function refreshBillingCustomerInfo() {
  const purchasesModule = await loadPurchases();
  const Purchases = purchasesModule.default;
  return await Purchases.getCustomerInfo();
}

export async function logOutBillingUser() {
  if (!purchasesInitialized) return;
  const purchasesModule = await loadPurchases();
  const Purchases = purchasesModule.default;
  await Purchases.logOut();
  configuredUserId = null;
}

export async function restoreBillingPurchases() {
  const purchasesModule = await loadPurchases();
  const Purchases = purchasesModule.default;
  return await Purchases.restorePurchases();
}

export async function purchaseBillingProduct(productId: string) {
  const purchasesModule = await loadPurchases();
  const Purchases = purchasesModule.default;
  const offerings = await Purchases.getOfferings();

  const matchingPackage = Object.values(offerings.all)
    .flatMap((offering) => offering.availablePackages)
    .find((pkg) => pkg.product.identifier === productId);

  if (!matchingPackage) {
    throw new Error(
      `No RevenueCat package found for product id "${productId}".`
    );
  }

  const purchaseResult = await Purchases.purchasePackage(matchingPackage);
  return purchaseResult.customerInfo;
}

export function hasActivePremiumEntitlement(customerInfo: CustomerInfo | null) {
  if (!customerInfo) return false;
  return Boolean(customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID]);
}
