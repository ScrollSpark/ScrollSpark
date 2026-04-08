import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Play, Square, Crown, Settings, CheckCircle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, SUPABASE_ANON_KEY } from '@/lib/supabaseClient';
import { fetchUserProfile, normalizeHobbies } from '@/lib/userProfile';
import { evaluateSparkGeneration, sparkLimitSummary } from '@/lib/sparkLimits';
import { syncPremiumToProfile } from '@/lib/syncPremiumStatus';
import { formatSparkError, messageFromFunctionsInvokeError } from '@/lib/sparkErrors';
import { buildSpeechText } from '@/lib/sparkSpeech';
import { fetchSparkTtsAudio, pickRandomSparkVoice } from '@/lib/sparkTts';
import { buildPersonalizationForSpark, pickHobbyForSparkContext } from '@/lib/sparkPersonalization';
import { Capacitor } from '@capacitor/core';
import {
  cancelScrollWatchReactivateReminders,
  requestNotificationPermissionIfNeeded,
  scheduleScrollWatchReactivateReminders,
} from '@/lib/scrollWatchReminders';
import SparkOverlay from './SparkOverlay';

const TIMER_DURATION = 15 * 60;
const IDLE_RESET_MS = 5 * 60 * 1000;

/** True when the user is not focused on this tab/window (browser cannot see other apps). */
function isAwayFromDashboard() {
  if (typeof document === 'undefined') return false;
  return document.hidden || !document.hasFocus();
}

/** Phones / tablets with coarse pointer — used to pause/reset timer when the tab is hidden (screen lock, etc.). */
function getIsCoarsePointerMobile() {
  if (typeof window === 'undefined') return false;
  try {
    return (
      window.matchMedia('(pointer: coarse)').matches ||
      (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)
    );
  } catch {
    return typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
  }
}

// ---------------------------------------------------------------------------
// Supabase helpers
// ---------------------------------------------------------------------------

async function generateSparkFromEdgeFunction(hobby, userName, personalization) {
  const { data, error } = await supabase.functions.invoke('generate-spark', {
    body: { hobby, userName, personalization },
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
  });
  if (error) {
    const detail = await messageFromFunctionsInvokeError(error);
    throw new Error(detail);
  }
  if (data && typeof data === 'object' && data.error) {
    throw new Error(String(data.error));
  }
  return data;
}

// ---------------------------------------------------------------------------
// Self-contained UI components
// ---------------------------------------------------------------------------

function FloatingEmojis() {
  const emojis = ['⚡', '🎨', '🎸', '📚', '🏃', '🌟', '🎯', '✨'];
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

function StreakBadge({ streak }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
      color: 'white', padding: '12px 28px', borderRadius: 40,
      boxShadow: '0 4px 20px rgba(139,92,246,0.35)',
    }}>
      <span style={{ fontSize: 28 }}>🔥</span>
      <div>
        <p style={{ fontSize: 32, fontWeight: 900, lineHeight: 1, margin: 0 }}>{streak}</p>
        <p style={{ fontSize: 12, opacity: 0.9, margin: 0 }}>day streak</p>
      </div>
    </div>
  );
}

function TimerRing({ progress, timeLeft, isRunning }) {
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress * circumference;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div style={{ position: 'relative', width: 144, height: 144 }}>
      <svg width="144" height="144" viewBox="0 0 144 144">
        <circle cx="72" cy="72" r={radius} fill="none" stroke="#e9d5ff" strokeWidth="9" />
        <circle
          cx="72" cy="72" r={radius} fill="none"
          stroke={isRunning ? '#8b5cf6' : '#c4b5fd'}
          strokeWidth="9" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 72 72)"
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <p style={{ fontSize: 24, fontWeight: 900, margin: 0, color: '#1f2937' }}>
          {minutes}:{String(seconds).padStart(2, '0')}
        </p>
        <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>minutes</p>
      </div>
    </div>
  );
}

function ConfettiExplosion({ trigger }) {
  if (!trigger) return null;
  const pieces = ['🎉', '⚡', '🌟', '🎊', '✨', '💫', '🎈'];
  return (
    <div style={{ pointerEvents: 'none', position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      {pieces.map((e, i) => (
        <motion.div
          key={i}
          style={{ position: 'absolute', fontSize: 32 }}
          initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
          animate={{ scale: [0, 1.5, 0], x: (i - 3) * 90, y: -140, opacity: [1, 1, 0] }}
          transition={{ duration: 1.4, delay: i * 0.08 }}
        >
          {e}
        </motion.div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const iconBtnStyle = {
  width: 36, height: 36, borderRadius: '50%',
  border: '1px solid #e5e7eb', background: 'white',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer',
};

const statCardStyle = {
  background: 'white', borderRadius: 16,
  boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
  padding: '14px 8px', textAlign: 'center',
};

const cardStyle = {
  background: 'white', borderRadius: 24,
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  padding: 24, marginBottom: 16,
};

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [scrollWatchArmed, setScrollWatchArmed] = useState(false);
  const [awayFromDashboard, setAwayFromDashboard] = useState(() => isAwayFromDashboard());
  /** Page visible to the browser (hidden when phone screen is off or tab fully backgrounded). */
  const [pageVisible, setPageVisible] = useState(
    () => (typeof document !== 'undefined' ? document.visibilityState === 'visible' : true)
  );
  const isCoarseMobile = useMemo(() => getIsCoarsePointerMobile(), []);
  /** True only in the Capacitor Android shell (not web, not iOS). */
  const isAndroidNative = useMemo(() => {
    try {
      return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
    } catch {
      return false;
    }
  }, []);
  /** Android / iOS app: native screen lock or screen-off events (not available on web). */
  const isNativeScreenEvents = useMemo(() => {
    try {
      if (!Capacitor.isNativePlatform()) return false;
      const p = Capacitor.getPlatform();
      return p === 'android' || p === 'ios';
    } catch {
      return false;
    }
  }, []);
  /** Native app: true while screen is off (Android) or device locked (iOS protected data). */
  const [nativeScreenOff, setNativeScreenOff] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sparkPrepared, setSparkPrepared] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [sparkData, setSparkData] = useState(null);
  const [sparkError, setSparkError] = useState(null);
  /** After "Let's go" from Spark: single "End the Spark?" until tapped. */
  const [awaitingEndSpark, setAwaitingEndSpark] = useState(false);
  /** After "End the Spark?": show Start + Stop while hourly reminders are still scheduled (until one is chosen). */
  const [standbyAfterSparkEnd, setStandbyAfterSparkEnd] = useState(false);
  const handleGenerateSparkRef = useRef(async () => {});
  const dashboardFocusStartedRef = useRef(null);
  const scrollWatchArmedRef = useRef(false);
  /** Wall-clock end time (ms) for Scroll Watch countdown; avoids background timer throttling skew. */
  const scrollWatchDeadlineRef = useRef(null);
  const timeLeftRef = useRef(TIMER_DURATION);
  const awayFromDashboardRef = useRef(false);
  const pageVisibleRef = useRef(true);
  const nativeScreenOffRef = useRef(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: profile, isLoading, isFetching, isError, error: profileError } = useQuery({
    queryKey: ['userProfile'],
    queryFn: fetchUserProfile,
    retry: 1,
  });

  useEffect(() => {
    scrollWatchArmedRef.current = scrollWatchArmed;
  }, [scrollWatchArmed]);

  useEffect(() => {
    if (profile?.user_id && !profile._guest) {
      void syncPremiumToProfile(profile.user_id);
    }
  }, [profile?.user_id, profile?._guest]);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  useEffect(() => {
    awayFromDashboardRef.current = awayFromDashboard;
  }, [awayFromDashboard]);

  useEffect(() => {
    pageVisibleRef.current = pageVisible;
  }, [pageVisible]);

  useEffect(() => {
    nativeScreenOffRef.current = nativeScreenOff;
  }, [nativeScreenOff]);

  /** Android / iOS app: native screen lock or screen-off → pause timer + reset to 15:00 while “off”. */
  useEffect(() => {
    if (!isNativeScreenEvents) return undefined;

    let handle;
    let cancelled = false;

    import('@/plugins/screenEvents')
      .then(({ ScreenEvents }) => {
        if (cancelled) return null;
        return ScreenEvents.addListener('screenStateChange', (e) => {
          if (e.state === 'off') {
            setNativeScreenOff(true);
            if (scrollWatchArmedRef.current) {
              scrollWatchDeadlineRef.current = null;
              setTimeLeft(TIMER_DURATION);
            }
          } else {
            setNativeScreenOff(false);
          }
        });
      })
      .then((h) => {
        if (!cancelled && h) handle = h;
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (handle?.remove) void handle.remove();
    };
  }, [isNativeScreenEvents]);

  useEffect(() => {
    if (!isLoading && profile?._guest) navigate('/signup', { replace: true });
  }, [isLoading, profile, navigate]);

  useEffect(() => {
    if (profile && !profile._guest && profile.onboarding_complete === false) {
      navigate('/onboarding');
    }
  }, [profile, navigate]);

  useEffect(() => {
    if (!isLoading && !isFetching && profile === null) {
      navigate('/onboarding');
    }
  }, [isLoading, isFetching, profile, navigate]);

  useEffect(() => {
    if (profile?.current_streak > 0) {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(t);
    }
  }, [profile?.current_streak]);

  useEffect(() => {
    return () => {
      cancelScrollWatchReactivateReminders();
    };
  }, []);

  useEffect(() => {
    const syncAwayAndVisibility = () => {
      setAwayFromDashboard(isAwayFromDashboard());
      setPageVisible(typeof document !== 'undefined' && document.visibilityState === 'visible');
    };
    syncAwayAndVisibility();
    document.addEventListener('visibilitychange', syncAwayAndVisibility);
    window.addEventListener('focus', syncAwayAndVisibility);
    window.addEventListener('blur', syncAwayAndVisibility);
    return () => {
      document.removeEventListener('visibilitychange', syncAwayAndVisibility);
      window.removeEventListener('focus', syncAwayAndVisibility);
      window.removeEventListener('blur', syncAwayAndVisibility);
    };
  }, []);

  /** On phones/tablets (web / non-native): when the tab isn’t visible, reset and don’t tick. Native apps use ScreenEvents. */
  useEffect(() => {
    if (!isCoarseMobile || !scrollWatchArmed || pageVisible) return;
    if (isNativeScreenEvents) return;
    scrollWatchDeadlineRef.current = null;
    setTimeLeft(TIMER_DURATION);
  }, [isCoarseMobile, scrollWatchArmed, pageVisible, isNativeScreenEvents]);

  useEffect(() => {
    if (!scrollWatchArmed) {
      dashboardFocusStartedRef.current = null;
      return;
    }
    const syncFocusWindow = () => {
      if (isAwayFromDashboard()) {
        dashboardFocusStartedRef.current = null;
      } else if (dashboardFocusStartedRef.current === null) {
        dashboardFocusStartedRef.current = Date.now();
      }
    };
    syncFocusWindow();
    document.addEventListener('visibilitychange', syncFocusWindow);
    window.addEventListener('focus', syncFocusWindow);
    window.addEventListener('blur', syncFocusWindow);
    return () => {
      document.removeEventListener('visibilitychange', syncFocusWindow);
      window.removeEventListener('focus', syncFocusWindow);
      window.removeEventListener('blur', syncFocusWindow);
    };
  }, [scrollWatchArmed]);

  useEffect(() => {
    if (!scrollWatchArmed) return;
    const id = setInterval(() => {
      if (isAwayFromDashboard()) return;
      const start = dashboardFocusStartedRef.current;
      if (start != null && Date.now() - start >= IDLE_RESET_MS) {
        scrollWatchDeadlineRef.current = null;
        setTimeLeft(TIMER_DURATION);
        dashboardFocusStartedRef.current = Date.now();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [scrollWatchArmed]);

  /**
   * Scroll Watch uses a wall-clock deadline so background tabs / WebViews still hit ~15 real minutes.
   * (setInterval is heavily throttled in background; decrement-by-one would run far too slowly.)
   */
  useEffect(() => {
    if (!scrollWatchArmed) {
      scrollWatchDeadlineRef.current = null;
      return undefined;
    }

    const tick = () => {
      if (!scrollWatchArmedRef.current) return;

      const away = awayFromDashboardRef.current;
      const pageVis = pageVisibleRef.current;
      const nativeOff = nativeScreenOffRef.current;

      const visibilityBlocksCountdown =
        !isNativeScreenEvents && isCoarseMobile && !pageVis;
      const nativeScreenBlocksCountdown = isNativeScreenEvents && nativeOff;

      const shouldCount =
        away &&
        !visibilityBlocksCountdown &&
        !nativeScreenBlocksCountdown;

      if (!shouldCount) {
        if (scrollWatchDeadlineRef.current != null) {
          const remaining = Math.max(
            0,
            Math.ceil((scrollWatchDeadlineRef.current - Date.now()) / 1000)
          );
          setTimeLeft(remaining);
          scrollWatchDeadlineRef.current = null;
        }
        return;
      }

      if (timeLeftRef.current <= 0) {
        scrollWatchDeadlineRef.current = null;
        return;
      }

      if (scrollWatchDeadlineRef.current == null) {
        scrollWatchDeadlineRef.current = Date.now() + timeLeftRef.current * 1000;
      }

      const remaining = Math.max(
        0,
        Math.ceil((scrollWatchDeadlineRef.current - Date.now()) / 1000)
      );

      const prev = timeLeftRef.current;
      if (remaining !== prev) {
        setTimeLeft(remaining);
      }

      if (remaining <= 0) {
        scrollWatchDeadlineRef.current = null;
        if (prev > 0) {
          queueMicrotask(() => {
            const fn = handleGenerateSparkRef.current;
            if (typeof fn === 'function') fn();
          });
        }
      }
    };

    const id = setInterval(tick, 250);
    tick();
    return () => clearInterval(id);
  }, [scrollWatchArmed, isCoarseMobile, isNativeScreenEvents]);

  const toggleScrollWatch = () => {
    cancelScrollWatchReactivateReminders();
    if (scrollWatchArmed) {
      setScrollWatchArmed(false);
    } else {
      if (timeLeft === 0) {
        scrollWatchDeadlineRef.current = null;
        setTimeLeft(TIMER_DURATION);
      }
      setScrollWatchArmed(true);
    }
  };

  const handleEndSparkSession = useCallback(() => {
    setAwaitingEndSpark(false);
    setStandbyAfterSparkEnd(true);
  }, []);

  const handleStandbyStartScrollWatch = useCallback(() => {
    cancelScrollWatchReactivateReminders();
    setStandbyAfterSparkEnd(false);
    if (timeLeft === 0) {
      scrollWatchDeadlineRef.current = null;
      setTimeLeft(TIMER_DURATION);
    }
    setScrollWatchArmed(true);
  }, [timeLeft]);

  const handleStandbyStopScrollWatch = useCallback(() => {
    cancelScrollWatchReactivateReminders();
    setStandbyAfterSparkEnd(false);
    setScrollWatchArmed(false);
  }, []);

  const handleScrollWatchMainButton = () => {
    if (awaitingEndSpark) {
      handleEndSparkSession();
      return;
    }
    toggleScrollWatch();
  };

  const handleLetsGoFromSpark = useCallback(() => {
    setShowOverlay(false);
    setSparkPrepared(false);
    setScrollWatchArmed(false);
    scrollWatchDeadlineRef.current = null;
    setTimeLeft(TIMER_DURATION);
    setStandbyAfterSparkEnd(false);
    setAwaitingEndSpark(true);
    void requestNotificationPermissionIfNeeded().then(() => {
      scheduleScrollWatchReactivateReminders({
        sleepStart: profile?.spark_sleep_start,
        sleepEnd: profile?.spark_sleep_end,
        timezone:
          (profile?.spark_timezone && String(profile.spark_timezone).trim()) ||
          Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    });
  }, [profile]);

  const handleGenerateSpark = useCallback(async () => {
    setSparkError(null);
    if (!profile || profile._guest) {
      setSparkError('You need to be signed in to get a spark.');
      setTimeLeft((t) => {
        if (t === 0) {
          scrollWatchDeadlineRef.current = null;
          return TIMER_DURATION;
        }
        return t;
      });
      return;
    }
    const hobbies = normalizeHobbies(profile.hobbies);
    if (!hobbies.length) {
      setSparkError('Add hobbies in settings (onboarding) first — then Spark Me will work.');
      setTimeLeft((t) => {
        if (t === 0) {
          scrollWatchDeadlineRef.current = null;
          return TIMER_DURATION;
        }
        return t;
      });
      return;
    }
    if (!profile.id) {
      setSparkError('Profile is still loading. Try again in a moment.');
      setTimeLeft((t) => {
        if (t === 0) {
          scrollWatchDeadlineRef.current = null;
          return TIMER_DURATION;
        }
        return t;
      });
      return;
    }

    const limitCheck = evaluateSparkGeneration(profile);
    if (!limitCheck.ok) {
      setSparkError(limitCheck.reason);
      setTimeLeft((t) => {
        if (t === 0) {
          scrollWatchDeadlineRef.current = null;
          return TIMER_DURATION;
        }
        return t;
      });
      return;
    }

    setIsGenerating(true);
    setSparkPrepared(false);

    const { hobby: chosenHobby, usedQuietHoursPick } = pickHobbyForSparkContext(hobbies, profile);
    const userName = profile.name || profile.full_name || profile.display_name || 'friend';

    const personalization = {
      ...(buildPersonalizationForSpark(profile) || {}),
      quietHoursHobbyPick: usedQuietHoursPick,
    };

    let result;
    try {
      result = await generateSparkFromEdgeFunction(chosenHobby, userName, personalization);
    } catch (err) {
      console.error('Failed to generate spark:', err);
      setSparkError(formatSparkError(err));
      setIsGenerating(false);
      scrollWatchDeadlineRef.current = null;
      setTimeLeft(TIMER_DURATION);
      return;
    }

    const sparkPayloadBase = {
      ...result,
      hobby: chosenHobby,
      userName,
    };

    const speechText = buildSpeechText(sparkPayloadBase);
    const ttsVoiceId = pickRandomSparkVoice();
    const ttsPromise =
      speechText.length > 0
        ? fetchSparkTtsAudio(speechText, undefined, ttsVoiceId).catch((err) => {
            console.error('Prefetch Grok TTS failed:', err);
            return null;
          })
        : Promise.resolve(null);

    queryClient.invalidateQueries({ queryKey: ['userProfile'] });

    const ttsBlob = await ttsPromise;
    const sparkPayload = ttsBlob ? { ...sparkPayloadBase, ttsBlob } : sparkPayloadBase;

    cancelScrollWatchReactivateReminders();
    setAwaitingEndSpark(false);
    setStandbyAfterSparkEnd(false);
    setSparkData(sparkPayload);
    setSparkPrepared(true);
    setShowOverlay(true);
    scrollWatchDeadlineRef.current = null;
    setTimeLeft(TIMER_DURATION);
    setIsGenerating(false);
  }, [profile, queryClient]);

  handleGenerateSparkRef.current = handleGenerateSpark;

  const handleOverlayDismiss = () => {
    cancelScrollWatchReactivateReminders();
    setAwaitingEndSpark(false);
    setStandbyAfterSparkEnd(false);
    setShowOverlay(false);
    setSparkPrepared(false);
  };

  const handleRegenerate = async () => {
    cancelScrollWatchReactivateReminders();
    setAwaitingEndSpark(false);
    setStandbyAfterSparkEnd(false);
    setShowOverlay(false);
    await handleGenerateSpark();
  };

  const progress = 1 - timeLeft / TIMER_DURATION;
  const visibilityBlocksCountdown =
    !isNativeScreenEvents && isCoarseMobile && !pageVisible;
  const nativeScreenBlocksCountdown = isNativeScreenEvents && nativeScreenOff;
  const countdownTicking =
    scrollWatchArmed &&
    awayFromDashboard &&
    !visibilityBlocksCountdown &&
    !nativeScreenBlocksCountdown &&
    timeLeft > 0;

  const sparkLimitHint = useMemo(() => {
    if (!profile || profile._guest) return null;
    const summary = sparkLimitSummary(profile);
    if (!summary) return null;
    if (summary.kind === 'trial') {
      return `${summary.remainingInTrial} trial sparks left — then Free is 1 per day (UTC).`;
    }
    if (summary.kind === 'premium') {
      return `${summary.remainingThisMonth} of ${summary.cap} Premium sparks left this month (UTC).`;
    }
    if (summary.kind === 'free') {
      return summary.canSparkToday
        ? 'Free plan: 1 spark left today (UTC).'
        : 'Free plan: you’ve used today’s spark — back tomorrow or go Premium.';
    }
    return null;
  }, [profile]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '4px solid #e9d5ff', borderTopColor: '#8b5cf6',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    );
  }

  if (isError) {
    const detail =
      profileError?.message ||
      profileError?.error_description ||
      String(profileError ?? '');
    const looksLikeRls =
      /permission denied|row-level security|rls|42501|policy/i.test(detail) ||
      /JWT|jwt expired/i.test(detail);
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'system-ui, sans-serif',
        maxWidth: 420,
        margin: '0 auto',
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#111827', fontWeight: 700, marginBottom: 8 }}>
            Could not load your profile
          </p>
          <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.5, marginBottom: 12 }}>
            {looksLikeRls ? (
              <>
                Your Supabase table <code style={{ fontSize: 13 }}>user_profiles</code> is probably missing
                Row Level Security policies so logged-in users can read their row. In your project, open{' '}
                <code style={{ fontSize: 11 }}>supabase/migrations/20260407000000_user_profiles_table_and_rls.sql</code>
                , copy the <strong>SQL only</strong> (not the file path), paste into Supabase → SQL Editor → Run,
                then tap Retry. (Creates the table if missing and sets up RLS.)
              </>
            ) : (
              detail || 'Something went wrong talking to the database.'
            )}
          </p>
          <button
            type="button"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['userProfile'] })}
            style={{
              background: 'linear-gradient(90deg, #8b5cf6, #ec4899)',
              border: 'none',
              color: 'white',
              fontWeight: 700,
              cursor: 'pointer',
              padding: '10px 20px',
              borderRadius: 12,
              fontFamily: 'inherit',
              fontSize: 15,
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (profile?._guest || profile === null || (profile && !profile.onboarding_complete)) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '4px solid #e9d5ff', borderTopColor: '#8b5cf6',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #faf5ff 0%, #fdf2f8 50%, #fff7ed 100%)',
      position: 'relative', overflow: 'hidden',
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <FloatingEmojis />
      <ConfettiExplosion trigger={showConfetti} />

      {/* Full-screen spark overlay */}
      <SparkOverlay
        show={showOverlay}
        sparkData={sparkData}
        onDismiss={handleOverlayDismiss}
        onRegenerate={handleRegenerate}
        onLetsGoHobby={handleLetsGoFromSpark}
      />

      <div style={{ position: 'relative', zIndex: 10, maxWidth: 480, margin: '0 auto', padding: '24px 16px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: '#111827' }}>⚡ ScrollSpark</h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Your spark of motivation</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/premium" style={{ textDecoration: 'none' }}>
              <button style={iconBtnStyle}><Crown size={18} color="#f59e0b" /></button>
            </Link>
            <Link to="/settings" style={{ textDecoration: 'none' }}>
              <button type="button" style={iconBtnStyle} aria-label="Settings"><Settings size={18} color="#9ca3af" /></button>
            </Link>
          </div>
        </div>

        {/* Streak */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <StreakBadge streak={profile?.current_streak || 0} />
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 32 }}>
          {[
            { label: 'Total Sparks', value: profile?.total_sparks || 0, emoji: '⚡' },
            { label: 'Best Streak', value: profile?.longest_streak || 0, emoji: '🏆' },
            { label: 'Hobbies', value: profile?.hobbies?.length || 0, emoji: '🎨' },
          ].map((stat) => (
            <div key={stat.label} style={statCardStyle}>
              <span style={{ fontSize: 20 }}>{stat.emoji}</span>
              <p style={{ fontSize: 26, fontWeight: 900, margin: '4px 0 2px', color: '#111827' }}>{stat.value}</p>
              <p style={{ fontSize: 11, color: '#6b7280', margin: 0, fontWeight: 600 }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Timer card */}
        <div style={cardStyle}>
          <h2 style={{ textAlign: 'center', fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#111827' }}>
            📱 Scroll Watch Timer
          </h2>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <TimerRing progress={progress} timeLeft={timeLeft} isRunning={countdownTicking} />
          </div>
          <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', marginBottom: 8, lineHeight: 1.5 }}>
            {awaitingEndSpark
              ? 'Scroll Watch is paused after your spark. Tap End the Spark? when you’re ready for the next step.'
              : standbyAfterSparkEnd
                ? 'Push notification standby: hourly “Reactivate Scroll Watch?” reminders are scheduled. Start or Stop to resume tracking or exit — both cancel the reminder series.'
                : scrollWatchArmed
                  ? countdownTicking
                    ? "Timer runs while you're not on this tab (Shorts / TikTok / Reels can't be detected by the browser — we use focus instead). Spark at zero, then repeats."
                    : isNativeScreenEvents && nativeScreenOff && awayFromDashboard
                      ? isAndroidNative
                        ? 'Screen is off — timer is paused and reset to 15:00. It resumes when you turn the screen on (Android uses the system screen broadcast).'
                        : 'Device is locked or screen is off — timer is paused and reset to 15:00. It resumes when you unlock (iOS uses system lock / protected-data notifications).'
                      : !isNativeScreenEvents && isCoarseMobile && !pageVisible && awayFromDashboard
                        ? 'On this device, the timer pauses and resets to 15:00 while this tab is in the background (browser can’t tell screen lock from leaving the tab).'
                        : "Paused — you're on ScrollSpark. Switch to Shorts, TikTok, or Reels to count down."
                  : 'Turn on Scroll Watch, then open Shorts, TikTok, or Reels in another app or tab. The 15-minute timer counts only while this page is in the background or unfocused.'}
          </p>
          <p style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af', marginBottom: 16, lineHeight: 1.45 }}>
            Stay on this page with focus for over 5 minutes and the timer resets to 15:00.
          </p>
          {standbyAfterSparkEnd ? (
            <>
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleStandbyStartScrollWatch}
                style={{
                  width: '100%', padding: '14px 0', borderRadius: 16, border: 'none',
                  fontWeight: 700, fontSize: 16, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                  color: 'white',
                  fontFamily: 'inherit',
                }}
              >
                <><Play size={18} /> Start Scroll Watch</>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleStandbyStopScrollWatch}
                style={{
                  width: '100%',
                  marginTop: 10,
                  padding: '14px 0',
                  borderRadius: 16,
                  border: 'none',
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: '#f3f4f6',
                  color: '#374151',
                  fontFamily: 'inherit',
                }}
              >
                <><Square size={18} /> Stop Scroll Watch</>
              </motion.button>
            </>
          ) : (
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleScrollWatchMainButton}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 16, border: 'none',
                fontWeight: 700, fontSize: 16, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: awaitingEndSpark || scrollWatchArmed ? '#f3f4f6' : 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                color: awaitingEndSpark || scrollWatchArmed ? '#374151' : 'white',
                fontFamily: 'inherit',
              }}
            >
              {awaitingEndSpark ? (
                <><Square size={18} /> End the Spark?</>
              ) : scrollWatchArmed ? (
                <><Square size={18} /> Stop Scroll Watch</>
              ) : (
                <><Play size={18} /> Start Scroll Watch</>
              )}
            </motion.button>
          )}
        </div>

        {/* Spark Me / Spark Prepared button */}
        <motion.button
          whileHover={{ scale: isGenerating ? 1 : 1.02 }}
          whileTap={{ scale: isGenerating ? 1 : 0.98 }}
          onClick={
            sparkPrepared
              ? () => {
                  setSparkError(null);
                  setShowOverlay(true);
                }
              : () => handleGenerateSpark()
          }
          disabled={isGenerating}
          style={{
            width: '100%', padding: '28px 0', borderRadius: 24, border: 'none',
            background: sparkPrepared
              ? 'linear-gradient(90deg, #10b981, #059669)'
              : 'linear-gradient(90deg, #8b5cf6, #ec4899, #f97316)',
            color: 'white', fontWeight: 900, fontSize: 20,
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            opacity: isGenerating ? 0.75 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: sparkPrepared
              ? '0 8px 30px rgba(16,185,129,0.4)'
              : '0 8px 30px rgba(139,92,246,0.4)',
            transition: 'background 0.4s, box-shadow 0.4s',
            fontFamily: 'inherit',
          }}
        >
          {isGenerating ? (
            <>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                border: '3px solid rgba(255,255,255,0.4)', borderTopColor: 'white',
                animation: 'spin 0.8s linear infinite',
              }} />
              Generating your spark...
            </>
          ) : sparkPrepared ? (
            <><CheckCircle size={22} /> Spark Prepared ✓</>
          ) : (
            <><Sparkles size={22} /> Spark Me! ⚡</>
          )}
        </motion.button>

        {sparkError && (
          <p style={{
            textAlign: 'center',
            fontSize: 13,
            color: '#dc2626',
            marginTop: 12,
            lineHeight: 1.5,
            padding: '0 8px',
          }}>
            {sparkError}
          </p>
        )}
        <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: sparkError ? 8 : 12 }}>
          {sparkPrepared
            ? 'Tap to view your spark again 👆'
            : 'Tap anytime for a burst of motivation about your hobbies! 🌟'}
        </p>
        {sparkLimitHint && !sparkPrepared && (
          <p style={{ textAlign: 'center', fontSize: 11, color: '#6b7280', marginTop: 8, lineHeight: 1.45, padding: '0 8px' }}>
            {sparkLimitHint}{' '}
            {!profile?.is_premium && (
              <Link to="/premium" style={{ color: '#8b5cf6', fontWeight: 600 }}>
                Premium
              </Link>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
