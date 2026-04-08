export const SPARK_GENDER_OPTIONS = [
  { value: '', label: 'Prefer not to say' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

export const SPARK_ETHNICITY_OPTIONS = [
  { value: '', label: 'Prefer not to say' },
  { value: 'asian', label: 'Asian' },
  { value: 'black', label: 'Black or African American' },
  { value: 'hispanic', label: 'Hispanic or Latino' },
  { value: 'mena', label: 'Middle Eastern or North African' },
  { value: 'native_american', label: 'Native American or Alaska Native' },
  { value: 'pacific', label: 'Native Hawaiian or Pacific Islander' },
  { value: 'white', label: 'White' },
  { value: 'multiracial', label: 'Multiracial or mixed' },
  { value: 'other', label: 'Self-describe (below)' },
];

export const SPARK_AGE_OPTIONS = [
  { value: '', label: 'Prefer not to say' },
  { value: 'under_18', label: 'Under 18' },
  { value: '18_24', label: '18–24' },
  { value: '25_34', label: '25–34' },
  { value: '35_44', label: '35–44' },
  { value: '45_54', label: '45–54' },
  { value: '55_64', label: '55–64' },
  { value: '65_plus', label: '65 or older' },
];

/** Common IANA zones; user can still type another in the text field. */
export const COMMON_TIMEZONES = [
  'Pacific/Honolulu',
  'America/Anchorage',
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Toronto',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Pacific/Auckland',
];

/**
 * @param {string} [iana]
 * @returns {{ hour: number, minute: number }}
 */
export function getLocalHourMinuteInTimezone(iana) {
  const tz = iana && String(iana).trim() ? String(iana).trim() : Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    const d = new Date();
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).formatToParts(d);
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
    return { hour: Number.isFinite(hour) ? hour : 0, minute: Number.isFinite(minute) ? minute : 0 };
  } catch {
    const d = new Date();
    return { hour: d.getHours(), minute: d.getMinutes() };
  }
}

function parseHm(s) {
  if (!s || typeof s !== 'string') return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const hh = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const mm = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return hh * 60 + mm;
}

/**
 * @param {number} hour 0-23
 * @param {number} minute 0-59
 * @param {string} [sleepStart] HH:MM
 * @param {string} [sleepEnd] HH:MM
 */
export function isWithinSleepWindowLocal(hour, minute, sleepStart, sleepEnd) {
  const nowM = hour * 60 + minute;
  const s = parseHm(sleepStart);
  const e = parseHm(sleepEnd);
  if (s == null || e == null) return false;
  if (s < e) return nowM >= s && nowM < e;
  return nowM >= s || nowM < e;
}

/** ~10pm–5:59am local: avoid “go run outside now” style nudges. */
export function isLateNightLocal(hour) {
  return hour >= 22 || hour < 6;
}

/** ~7pm–10:59pm: slight bias toward calmer hobbies (not as strong as late night). */
export function isEveningWindDownLocal(hour) {
  return hour >= 19 && hour <= 22;
}

/**
 * Rough fit for time-of-day: higher = better when it's late night, sleep window, or wind-down.
 * @param {string} hobby
 * @param {{ lateNight: boolean, inSleep: boolean, evening: boolean, morning: boolean }} ctx
 */
export function hobbyTimeFitScore(hobby, ctx) {
  const h = String(hobby || '').toLowerCase();
  let score = 0;

  const vigorous = /\b(run|jog|jogg|running|jogging|cycling|cyclist|bik(e|ing)|hik(e|ing)|trail|marathon|5k|10k|soccer|football|basketball|rugby|lacrosse|tennis|swimming|surf|skate|ski|snowboard|crossfit|sparring|boxing|parkour)\b/.test(
    h
  );
  const calm = /\b(read|reading|book|knit|knitting|crochet|paint|painting|draw|drawing|writ|writing|journal|puzzle|chess|code|coding|gaming|game|piano|guitar|ukulele|meditat|meditation|yoga|stretch|cook|cooking|bake|baking|sew|sewing|embroid|pottery|origami|calligraphy|stud(y|ies)|poetry|blogger|photography|photo)\b/.test(
    h
  );

  if (vigorous) {
    if (ctx.inSleep || ctx.lateNight) score -= 6;
    else if (ctx.evening) score -= 2;
    if (ctx.morning) score += 1;
  }
  if (calm) {
    if (ctx.inSleep || ctx.lateNight) score += 5;
    else if (ctx.evening) score += 2;
  }

  return score;
}

/**
 * Pick a hobby that fits sleep / timezone when possible; otherwise random.
 * @param {string[]} hobbies
 * @param {Record<string, unknown>} profile
 * @returns {{ hobby: string, usedQuietHoursPick: boolean }}
 */
export function pickHobbyForSparkContext(hobbies, profile) {
  const list = Array.isArray(hobbies) ? hobbies.filter((x) => x != null && String(x).trim() !== '') : [];
  if (list.length === 0) return { hobby: '', usedQuietHoursPick: false };
  if (list.length === 1) return { hobby: list[0], usedQuietHoursPick: false };

  const tz =
    (profile?.spark_timezone && String(profile.spark_timezone).trim()) ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { hour, minute } = getLocalHourMinuteInTimezone(tz);
  const inSleep = isWithinSleepWindowLocal(hour, minute, profile?.spark_sleep_start, profile?.spark_sleep_end);
  const lateNight = isLateNightLocal(hour);
  const evening = isEveningWindDownLocal(hour);
  const morning = hour >= 6 && hour < 10;

  const ctx = { lateNight, inSleep, evening, morning };
  const useSmartPick = lateNight || inSleep || evening;

  if (!useSmartPick) {
    return { hobby: list[Math.floor(Math.random() * list.length)], usedQuietHoursPick: false };
  }

  const scored = list.map((h) => ({ h, s: hobbyTimeFitScore(h, ctx) }));
  scored.sort((a, b) => b.s - a.s);
  const best = scored[0].s;
  const top = scored.filter((x) => x.s === best);
  const picked = top[Math.floor(Math.random() * top.length)].h;
  return { hobby: picked, usedQuietHoursPick: true };
}

/**
 * @param {Record<string, unknown>} profile
 */
export function buildPersonalizationForSpark(profile) {
  if (!profile || typeof profile !== 'object') return undefined;
  const tz =
    (profile.spark_timezone && String(profile.spark_timezone).trim()) ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { hour, minute } = getLocalHourMinuteInTimezone(tz);
  const payload = {
    gender: profile.spark_gender || null,
    ethnicity: profile.spark_ethnicity || null,
    ethnicityCustom: profile.spark_ethnicity_custom || null,
    ageRange: profile.spark_age_range || null,
    sleepStart: profile.spark_sleep_start || null,
    sleepEnd: profile.spark_sleep_end || null,
    timezone: tz,
    localHour: hour,
    localMinute: minute,
  };
  const cleaned = Object.fromEntries(Object.entries(payload).filter(([, v]) => v != null && v !== ''));
  return Object.keys(cleaned).length ? cleaned : undefined;
}
