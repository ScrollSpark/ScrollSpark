import { supabase } from '@/lib/supabaseClient';
import {
  ensurePurchasesConfigured,
  getCustomerInfo,
  getPremiumEntitlementId,
  isEntitlementActive,
  isNativeStoreBillingConfigured,
} from '@/lib/appStoreBilling';

/**
 * Writes RevenueCat entitlement (e.g. ScrollSpark Pro) to user_profiles.is_premium for server-side limits.
 */
export async function syncPremiumToProfile(appUserId) {
  if (!appUserId || !isNativeStoreBillingConfigured()) return;

  try {
    await ensurePurchasesConfigured(appUserId);
    const customerInfo = await getCustomerInfo();
    const active = isEntitlementActive(customerInfo, getPremiumEntitlementId());
    await supabase.from('user_profiles').update({ is_premium: active }).eq('user_id', appUserId);
  } catch {
    /* offline or SDK error — leave DB as-is */
  }
}
