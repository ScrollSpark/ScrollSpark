/** First N sparks are the free trial (no daily cap). */
export const TRIAL_SPARK_CAP = 25;

/** After trial, free users get this many sparks per UTC calendar day. */
export const FREE_SPARKS_PER_DAY_AFTER_TRIAL = 1;

/** Premium subscribers: max sparks per UTC calendar month. */
export const PREMIUM_SPARKS_PER_MONTH = 200;

function todayUtcDateString() {
  return new Date().toISOString().split('T')[0];
}

function currentMonthUtc() {
  return todayUtcDateString().slice(0, 7);
}

/**
 * @param {object} profile - user_profiles row
 * @returns {{ ok: boolean, reason?: string, code?: string }}
 */
export function evaluateSparkGeneration(profile) {
  if (!profile || profile._guest) {
    return { ok: false, reason: 'Sign in to generate sparks.', code: 'auth' };
  }

  const total = profile.total_sparks || 0;
  const today = todayUtcDateString();

  if (profile.is_premium) {
    const month = currentMonthUtc();
    let count = profile.premium_sparks_monthly_count || 0;
    const bucket = profile.premium_spark_month;
    if (bucket !== month) {
      count = 0;
    }
    if (count >= PREMIUM_SPARKS_PER_MONTH) {
      return {
        ok: false,
        reason: `Premium includes ${PREMIUM_SPARKS_PER_MONTH} sparks per month. Your limit resets on the 1st (UTC).`,
        code: 'premium_cap',
      };
    }
    return { ok: true };
  }

  if (total < TRIAL_SPARK_CAP) {
    return { ok: true };
  }

  if (profile.last_spark_date === today) {
    return {
      ok: false,
      reason:
        'Free plan: 1 spark per day after your trial. Come back tomorrow — or upgrade to Premium for more.',
      code: 'free_daily',
    };
  }

  return { ok: true };
}

/**
 * Human-readable remaining sparks for UI (optional).
 */
export function sparkLimitSummary(profile) {
  if (!profile || profile._guest) return null;
  if (profile.is_premium) {
    const month = currentMonthUtc();
    let count = profile.premium_sparks_monthly_count || 0;
    if (profile.premium_spark_month !== month) count = 0;
    const left = Math.max(0, PREMIUM_SPARKS_PER_MONTH - count);
    return { kind: 'premium', remainingThisMonth: left, cap: PREMIUM_SPARKS_PER_MONTH };
  }
  const total = profile.total_sparks || 0;
  if (total < TRIAL_SPARK_CAP) {
    return { kind: 'trial', remainingInTrial: Math.max(0, TRIAL_SPARK_CAP - total), cap: TRIAL_SPARK_CAP };
  }
  const today = todayUtcDateString();
  const usedToday = profile.last_spark_date === today;
  return { kind: 'free', canSparkToday: !usedToday };
}
