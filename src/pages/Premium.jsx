import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Crown, ArrowLeft, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { fetchUserProfile } from '@/lib/userProfile';
import {
  ensurePurchasesConfigured,
  getCustomerInfo,
  getPremiumEntitlementId,
  isEntitlementActive,
  isNativeStoreBillingConfigured,
  loadSubscriptionPackages,
  presentRevenueCatCustomerCenter,
  presentRevenueCatPaywall,
  purchasePackage,
  restorePurchases,
} from '@/lib/appStoreBilling';
import { syncPremiumToProfile } from '@/lib/syncPremiumStatus';
import FooterLegalLinks from '@/components/FooterLegalLinks';

/** Matches what the app actually gates today (`is_premium` → spark limits in `sparkLimits.js`). */
const FEATURES = [
  {
    icon: Zap,
    title: 'Sparks',
    desc: 'Same spark experience as Free—Premium is mainly a higher monthly allowance so you can use it more often.',
    free: '25 trial, then 1/day',
    premium: '200/month',
  },
];

const PLANS = [
  {
    name: 'Monthly',
    price: '$2.99',
    period: '/month',
    popular: false,
    savings: null,
  },
  {
    name: 'Yearly',
    price: '$29.99',
    period: '/year',
    popular: true,
    savings: 'Save 16%',
  },
];

// ---------------------------------------------------------------------------
// Self-contained FloatingEmojis
// ---------------------------------------------------------------------------

function FloatingEmojis() {
  const emojis = ['👑', '✨', '⚡', '🌟', '💛', '🎯', '🏆', '💫'];
  return (
    <div style={{ pointerEvents: 'none', position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0 }}>
      {emojis.map((emoji, i) => (
        <motion.div
          key={i}
          style={{ position: 'absolute', fontSize: 24, opacity: 0.15, left: `${(i * 13) % 90}%` }}
          initial={{ y: '110vh' }}
          animate={{ y: '-10vh' }}
          transition={{ duration: 9 + i * 1.5, repeat: Infinity, delay: i * 1.3, ease: 'linear' }}
        >
          {emoji}
        </motion.div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Premium
// ---------------------------------------------------------------------------

export default function Premium() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState(1);
  const [billingStatus, setBillingStatus] = useState('idle');
  const [billingMessage, setBillingMessage] = useState(null);
  const [storeMonthly, setStoreMonthly] = useState(null);
  const [storeAnnual, setStoreAnnual] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [purchasePending, setPurchasePending] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: fetchUserProfile,
    staleTime: 60_000,
  });

  const appUserId = profile && !profile._guest ? profile.user_id : null;
  const nativeBilling = isNativeStoreBillingConfigured();
  const isIosNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

  const refreshEntitlement = useCallback(async () => {
    if (!nativeBilling) return;
    try {
      const info = await getCustomerInfo();
      setIsSubscribed(isEntitlementActive(info, getPremiumEntitlementId()));
    } catch {
      setIsSubscribed(false);
    }
  }, [nativeBilling]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!nativeBilling) {
        setBillingStatus('unavailable');
        return;
      }
      setBillingStatus('loading');
      setBillingMessage(null);
      const configured = await ensurePurchasesConfigured(appUserId);
      if (!configured.ok) {
        if (!cancelled) {
          if (configured.reason === 'android_not_implemented') {
            setBillingStatus('unavailable');
            setBillingMessage('Google Play subscriptions are not wired up yet.');
          } else if (configured.reason === 'sdk_error') {
            setBillingStatus('error');
            setBillingMessage(configured.message || 'Could not sync with the App Store billing service.');
          } else {
            setBillingStatus('missing_key');
            setBillingMessage('Add your RevenueCat API key in .env (see .env.example).');
          }
        }
        return;
      }
      try {
        const pkgs = await loadSubscriptionPackages();
        await refreshEntitlement();
        if (cancelled) return;
        setStoreMonthly(pkgs.monthly);
        setStoreAnnual(pkgs.annual);
        if (!pkgs.monthly && !pkgs.annual) {
          setBillingStatus('no_products');
          setBillingMessage(
            'No subscription products in the default offering. Configure products in RevenueCat and App Store Connect.'
          );
        } else {
          setBillingStatus('ready');
        }
      } catch (e) {
        if (!cancelled) {
          setBillingStatus('error');
          setBillingMessage(e?.message || 'Could not load subscriptions.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nativeBilling, appUserId, refreshEntitlement]);

  const selectedPackage = selectedPlan === 0 ? storeMonthly : storeAnnual;

  /** iOS: RevenueCat Paywall (dashboard, A/B, App Store sheet). Android (later): in-app purchase by selected package. */
  const handleSubscribe = async () => {
    if (!nativeBilling) return;
    if (isIosNative) {
      setPurchasePending(true);
      setBillingMessage(null);
      try {
        await presentRevenueCatPaywall();
        const customerInfo = await getCustomerInfo();
        const active = isEntitlementActive(customerInfo, getPremiumEntitlementId());
        setIsSubscribed(active);
        if (profile?.user_id) {
          await syncPremiumToProfile(profile.user_id);
          queryClient.invalidateQueries({ queryKey: ['userProfile'] });
        }
        if (active) {
          setBillingMessage('You’re subscribed! Thank you for supporting ScrollSpark.');
        }
      } catch (e) {
        setBillingMessage(e?.message || String(e));
      } finally {
        setPurchasePending(false);
      }
      return;
    }
    if (!selectedPackage) return;
    setPurchasePending(true);
    setBillingMessage(null);
    try {
      const customerInfo = await purchasePackage(selectedPackage);
      setIsSubscribed(isEntitlementActive(customerInfo, getPremiumEntitlementId()));
      if (profile?.user_id) {
        await syncPremiumToProfile(profile.user_id);
        queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      }
      setBillingMessage('You’re subscribed! Thank you for supporting ScrollSpark.');
    } catch (e) {
      const msg = e?.message || String(e);
      if (
        /cancel|cancelled|user cancelled|purchase cancelled|USER_CANCELLED/i.test(msg) ||
        e?.code === 'USER_CANCELLED'
      ) {
        setBillingMessage(null);
      } else {
        setBillingMessage(msg);
      }
    } finally {
      setPurchasePending(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!isIosNative || !nativeBilling) return;
    setPurchasePending(true);
    setBillingMessage(null);
    try {
      await presentRevenueCatCustomerCenter();
      const customerInfo = await getCustomerInfo();
      const active = isEntitlementActive(customerInfo, getPremiumEntitlementId());
      setIsSubscribed(active);
      if (profile?.user_id) {
        await syncPremiumToProfile(profile.user_id);
        queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      }
    } catch (e) {
      setBillingMessage(e?.message || 'Could not open subscription management.');
    } finally {
      setPurchasePending(false);
    }
  };

  const handleRestore = async () => {
    if (!nativeBilling) return;
    setPurchasePending(true);
    setBillingMessage(null);
    try {
      const customerInfo = await restorePurchases();
      const active = isEntitlementActive(customerInfo, getPremiumEntitlementId());
      setIsSubscribed(active);
      if (profile?.user_id) {
        await syncPremiumToProfile(profile.user_id);
        queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      }
      setBillingMessage(active ? 'Subscription restored.' : 'No active subscription found.');
    } catch (e) {
      setBillingMessage(e?.message || 'Restore failed.');
    } finally {
      setPurchasePending(false);
    }
  };

  const planTiles = PLANS.map((plan, i) => {
    const pkg = i === 0 ? storeMonthly : storeAnnual;
    const priceFromStore = pkg?.product?.priceString;
    const periodFromStore =
      i === 0 ? '/month' : '/year';
    return {
      ...plan,
      displayPrice: priceFromStore || plan.price,
      displayPeriod: periodFromStore,
    };
  });

  const ctaDisabled =
    purchasePending ||
    !nativeBilling ||
    billingStatus !== 'ready' ||
    isSubscribed ||
    (!isIosNative && !selectedPackage);

  const ctaLabel = isSubscribed
    ? 'You’re subscribed'
    : purchasePending
      ? 'Please wait…'
      : nativeBilling && billingStatus === 'ready'
        ? isIosNative
          ? 'Subscribe with App Store'
          : 'Subscribe'
        : nativeBilling && billingStatus === 'loading'
          ? 'Loading…'
          : 'Subscribe';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #fffbeb 0%, #fff7ed 50%, #fefce8 100%)',
      position: 'relative', overflow: 'hidden',
    }}>
      <FloatingEmojis />

      <div style={{ position: 'relative', zIndex: 10, maxWidth: 480, margin: '0 auto', padding: '24px 16px' }}>

        {/* Back button */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'transparent', border: 'none',
            fontSize: 15, color: '#92400e', cursor: 'pointer',
            marginBottom: 16, fontFamily: 'inherit', fontWeight: 600,
            padding: '8px 12px', borderRadius: 999,
          }}
        >
          <ArrowLeft size={16} /> Back
        </motion.button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 3 }}
            style={{ fontSize: 60, marginBottom: 16 }}
          >
            👑
          </motion.div>
          <h1 style={{ fontSize: 30, fontWeight: 900, margin: '0 0 8px', color: '#111827' }}>
            Go Premium ✨
          </h1>
          <p style={{ color: '#6b7280', margin: 0, fontWeight: 500, lineHeight: 1.5 }}>
            Unlock the full power of ScrollSpark and supercharge your hobby journey!
          </p>
        </div>

        {!Capacitor.isNativePlatform() && (
          <p style={{
            fontSize: 13, color: '#92400e', background: 'rgba(254, 243, 199, 0.9)',
            padding: '12px 14px', borderRadius: 14, marginBottom: 20, lineHeight: 1.5,
          }}>
            Subscriptions are billed through the App Store (or Google Play on Android) inside the ScrollSpark app. Open
            this screen in the installed app to subscribe.
          </p>
        )}

        {nativeBilling && billingStatus === 'missing_key' && (
          <p style={{
            fontSize: 13, color: '#b45309', background: '#fffbeb',
            padding: '12px 14px', borderRadius: 14, marginBottom: 20, lineHeight: 1.5,
          }}>
            {billingMessage}
          </p>
        )}

        {nativeBilling && billingMessage && billingStatus !== 'missing_key' && (
          <p style={{
            fontSize: 13,
            color:
              /Thank|restored/i.test(billingMessage) ? '#15803d'
                : billingStatus === 'no_products' ? '#b45309'
                  : '#b91c1c',
            background:
              /Thank|restored/i.test(billingMessage) ? '#ecfdf5'
                : billingStatus === 'no_products' ? '#fffbeb'
                  : '#fef2f2',
            padding: '12px 14px', borderRadius: 14, marginBottom: 20, lineHeight: 1.5,
          }}>
            {billingMessage}
          </p>
        )}

        {isIosNative && billingStatus === 'ready' && (
          <p style={{
            fontSize: 12, color: '#78716c', textAlign: 'center', margin: '-8px 0 20px', lineHeight: 1.45,
          }}>
            Pricing and checkout use Apple’s subscription sheet (configured in RevenueCat). Plan tiles below show live
            App Store prices.
          </p>
        )}

        {/* Plan selection */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
          {planTiles.map((plan, i) => (
            <motion.div
              key={plan.name}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedPlan(i)}
              style={{ position: 'relative', cursor: 'pointer' }}
            >
              {plan.popular && (
                <div style={{
                  position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                  background: 'linear-gradient(90deg, #f59e0b, #f97316)',
                  color: 'white', fontSize: 10, fontWeight: 700,
                  padding: '3px 12px', borderRadius: 999, whiteSpace: 'nowrap', zIndex: 1,
                }}>
                  BEST VALUE
                </div>
              )}
              <div style={{
                padding: 16, borderRadius: 18, border: `2px solid ${selectedPlan === i ? '#f59e0b' : '#e5e7eb'}`,
                background: selectedPlan === i
                  ? 'linear-gradient(135deg, #fffbeb, #fff7ed)'
                  : 'white',
                boxShadow: selectedPlan === i ? '0 4px 20px rgba(245,158,11,0.2)' : 'none',
                transition: 'all 0.15s',
              }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#9ca3af', margin: '0 0 4px' }}>{plan.name}</p>
                <p style={{ fontSize: 26, fontWeight: 900, color: '#111827', margin: '0 0 2px' }}>{plan.displayPrice}</p>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{plan.displayPeriod}</p>
                {plan.savings && (
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', margin: '4px 0 0' }}>{plan.savings}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Features card */}
        <div style={{
          background: 'white', borderRadius: 24,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          padding: 24, marginBottom: 16,
        }}>
          <h3 style={{ fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>What you get:</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {FEATURES.map((feature) => (
              <div key={feature.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{
                  padding: 8, borderRadius: 12, flexShrink: 0,
                  background: 'linear-gradient(135deg, #fef3c7, #fed7aa)',
                }}>
                  <feature.icon size={16} color="#d97706" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: '#111827', margin: '0 0 2px' }}>{feature.title}</p>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{feature.desc}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 11, color: '#d1d5db', textDecoration: 'line-through', margin: '0 0 2px' }}>{feature.free}</p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#d97706', margin: 0 }}>{feature.premium}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <motion.button
          whileHover={{ scale: ctaDisabled ? 1 : 1.02 }}
          whileTap={{ scale: ctaDisabled ? 1 : 0.98 }}
          type="button"
          onClick={handleSubscribe}
          disabled={ctaDisabled}
          style={{
            width: '100%', padding: '22px 0', borderRadius: 24, border: 'none',
            background: ctaDisabled && !isSubscribed
              ? '#e5e7eb'
              : 'linear-gradient(90deg, #f59e0b, #f97316, #eab308)',
            color: ctaDisabled && !isSubscribed ? '#6b7280' : '#111827',
            fontWeight: 900, fontSize: 18, cursor: ctaDisabled ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: ctaDisabled ? 'none' : '0 8px 30px rgba(245,158,11,0.4)', fontFamily: 'inherit',
          }}
        >
          <Crown size={20} /> {ctaLabel}
        </motion.button>

        {isIosNative && nativeBilling && isSubscribed && (
          <button
            type="button"
            onClick={handleManageSubscription}
            disabled={purchasePending}
            style={{
              width: '100%', marginTop: 12, padding: '14px 0', borderRadius: 16, border: '1px solid #fcd34d',
              background: 'white', color: '#92400e', fontWeight: 700, fontSize: 15,
              cursor: purchasePending ? 'wait' : 'pointer', fontFamily: 'inherit',
            }}
          >
            Manage subscription
          </button>
        )}

        {nativeBilling && (
          <button
            type="button"
            onClick={handleRestore}
            disabled={purchasePending || billingStatus === 'loading'}
            style={{
              width: '100%', marginTop: 12, padding: '12px 0', borderRadius: 16, border: 'none',
              background: 'transparent', color: '#92400e', fontWeight: 600, fontSize: 14,
              cursor: purchasePending ? 'wait' : 'pointer', fontFamily: 'inherit',
            }}
          >
            Restore purchases
          </button>
        )}

        <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 10 }}>
          {nativeBilling
            ? 'Payment is charged to your Apple ID or Google account. Manage or cancel in your store settings.'
            : 'Cancel anytime. No commitment. 💛'}
        </p>

        <FooterLegalLinks marginTop={14} />
      </div>
    </div>
  );
}
