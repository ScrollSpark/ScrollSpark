/**
 * Native store billing: iOS uses RevenueCat via SPM (NativeRevenueCatPlugin + Info.plist key).
 * Android: add Google Play + RevenueCat when ready (VITE_REVENUECAT_GOOGLE_API_KEY).
 *
 * Dashboard: default offering, packages monthly + yearly, entitlement id must match
 * VITE_REVENUECAT_ENTITLEMENT_ID (default ScrollSpark Pro).
 */
import { Capacitor, registerPlugin } from '@capacitor/core';

const ENTITLEMENT_ID =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_REVENUECAT_ENTITLEMENT_ID) || 'ScrollSpark Pro';

const PACKAGE_TYPE = {
  MONTHLY: 'MONTHLY',
  ANNUAL: 'ANNUAL',
};

function webStub() {
  const reject = () => Promise.reject(new Error('In-app purchases require the iOS or Android app.'));
  return {
    getOfferings: reject,
    purchase: reject,
    restorePurchases: reject,
    getCustomerInfo: reject,
    setAppUserId: reject,
    presentPaywall: reject,
    presentCustomerCenter: reject,
  };
}

const NativeRevenueCat = registerPlugin('NativeRevenueCat', {
  web: webStub,
});

let lastIosAppUserId;

function getRevenueCatApiKey() {
  if (typeof import.meta === 'undefined') return '';
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') return import.meta.env?.VITE_REVENUECAT_APPLE_API_KEY || '';
  if (platform === 'android') return import.meta.env?.VITE_REVENUECAT_GOOGLE_API_KEY || '';
  return '';
}

/** True in native app when billing can run on this platform (iOS: plist-configured RC; Android: env key). */
export function isNativeStoreBillingConfigured() {
  if (!Capacitor.isNativePlatform()) return false;
  if (Capacitor.getPlatform() === 'ios') return true;
  return Boolean(getRevenueCatApiKey());
}

export function getPremiumEntitlementId() {
  return ENTITLEMENT_ID;
}

/**
 * iOS: SDK is configured in AppDelegate; this only syncs RevenueCat app user id with Supabase.
 * Android: will configure from env when implemented.
 */
export async function ensurePurchasesConfigured(appUserId) {
  if (!Capacitor.isNativePlatform()) return { ok: false, reason: 'not_native' };

  if (Capacitor.getPlatform() === 'ios') {
    const next = appUserId ?? null;
    if (next !== lastIosAppUserId) {
      try {
        await NativeRevenueCat.setAppUserId({ appUserId: next });
        lastIosAppUserId = next;
      } catch (e) {
        return { ok: false, reason: 'sdk_error', message: e?.message ?? String(e) };
      }
    }
    return { ok: true };
  }

  const apiKey = getRevenueCatApiKey();
  if (!apiKey) return { ok: false, reason: 'missing_api_key' };
  return { ok: false, reason: 'android_not_implemented' };
}

export async function loadSubscriptionPackages() {
  if (Capacitor.getPlatform() !== 'ios' || !Capacitor.isNativePlatform()) {
    return { monthly: null, annual: null, offeringIdentifier: null };
  }

  const { offerings } = await NativeRevenueCat.getOfferings();
  const current = offerings?.current;
  if (!current?.availablePackages?.length) {
    return { monthly: null, annual: null, offeringIdentifier: null };
  }

  let monthly = null;
  let annual = null;
  for (const pkg of current.availablePackages) {
    if (pkg.packageType === PACKAGE_TYPE.MONTHLY) monthly = pkg;
    if (pkg.packageType === PACKAGE_TYPE.ANNUAL) annual = pkg;
  }
  return {
    monthly,
    annual,
    offeringIdentifier: current.identifier ?? null,
  };
}

export async function purchasePackage(aPackage) {
  const productId = aPackage?.product?.identifier;
  if (!productId) throw new Error('Missing store product on package');

  if (Capacitor.getPlatform() === 'ios') {
    const { customerInfo } = await NativeRevenueCat.purchase({ productId });
    return customerInfo;
  }

  throw new Error('Purchases are not implemented on this platform yet.');
}

export async function restorePurchases() {
  if (Capacitor.getPlatform() === 'ios') {
    const { customerInfo } = await NativeRevenueCat.restorePurchases();
    return customerInfo;
  }
  throw new Error('Restore is not implemented on this platform yet.');
}

export async function getCustomerInfo() {
  if (Capacitor.getPlatform() === 'ios') {
    const { customerInfo } = await NativeRevenueCat.getCustomerInfo();
    return customerInfo;
  }
  throw new Error('Customer info is not available on this platform yet.');
}

export function isEntitlementActive(customerInfo, entitlementId = ENTITLEMENT_ID) {
  if (!customerInfo?.entitlements?.active) return false;
  return Boolean(customerInfo.entitlements.active[entitlementId]);
}

/** Presents the RevenueCat Paywall (configure in RevenueCat dashboard). iOS only. */
export async function presentRevenueCatPaywall() {
  if (Capacitor.getPlatform() === 'ios') {
    await NativeRevenueCat.presentPaywall();
    return;
  }
  throw new Error('Paywall is only available in the iOS app.');
}

/** RevenueCat Customer Center (subscriptions management). iOS 15+, RevenueCat UI 5.5+. */
export async function presentRevenueCatCustomerCenter() {
  if (Capacitor.getPlatform() === 'ios') {
    await NativeRevenueCat.presentCustomerCenter();
    return;
  }
  throw new Error('Customer Center is only available in the iOS app.');
}
