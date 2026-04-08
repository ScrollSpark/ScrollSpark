import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TRIAL_SPARK_CAP = 25;
const PREMIUM_SPARKS_PER_MONTH = 200;

function checkSparkAllowed(profile: Record<string, unknown>): { ok: boolean; error?: string } {
  const today = new Date().toISOString().split('T')[0];
  const monthUtc = today.slice(0, 7);
  const total = (profile.total_sparks as number) || 0;

  if (profile.is_premium === true) {
    let count = (profile.premium_sparks_monthly_count as number) || 0;
    const bucket = profile.premium_spark_month as string | null | undefined;
    if (bucket !== monthUtc) count = 0;
    if (count >= PREMIUM_SPARKS_PER_MONTH) {
      return {
        ok: false,
        error: `Premium includes ${PREMIUM_SPARKS_PER_MONTH} sparks per month. Limit resets on the 1st (UTC).`,
      };
    }
    return { ok: true };
  }

  if (total < TRIAL_SPARK_CAP) return { ok: true };

  if (profile.last_spark_date === today) {
    return {
      ok: false,
      error:
        'Free plan: 1 spark per day after your trial. Come back tomorrow or upgrade to Premium.',
    };
  }
  return { ok: true };
}

function computeProfileAfterSpark(profile: Record<string, unknown>): Record<string, unknown> {
  const today = new Date().toISOString().split('T')[0];
  const monthUtc = today.slice(0, 7);
  const lastDate = profile.last_spark_date as string | null | undefined;
  let newStreak = (profile.current_streak as number) || 0;
  if (lastDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    newStreak = lastDate === yesterdayStr ? newStreak + 1 : 1;
  }
  const longestStreak = Math.max(newStreak, (profile.longest_streak as number) || 0);
  const total = (profile.total_sparks as number) || 0;

  const base: Record<string, unknown> = {
    last_spark_date: today,
    current_streak: newStreak,
    longest_streak: longestStreak,
    total_sparks: total + 1,
  };

  if (profile.is_premium === true) {
    let count = (profile.premium_sparks_monthly_count as number) || 0;
    const bucket = profile.premium_spark_month as string | null | undefined;
    if (bucket !== monthUtc) count = 0;
    base.premium_spark_month = monthUtc;
    base.premium_sparks_monthly_count = count + 1;
  }

  return base;
}

function sanitizeHobbyLabel(hobby: string): string {
  return String(hobby || 'a favorite hobby')
    .replace(/["'`]/g, '')
    .trim()
    .slice(0, 100);
}

function pickRandom<T>(choices: readonly T[]): T {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return choices[buf[0] % choices.length]!;
}

type PersonalizationIn = {
  gender?: string;
  ethnicity?: string;
  ethnicityCustom?: string;
  ageRange?: string;
  sleepStart?: string;
  sleepEnd?: string;
  timezone?: string;
  localHour?: number;
  localMinute?: number;
  quietHoursHobbyPick?: boolean;
};

function parseHmLocal(s: string | undefined | null): number | null {
  if (!s || typeof s !== 'string') return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const hh = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const mm = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return hh * 60 + mm;
}

function inSleepWindow(nowM: number, startM: number, endM: number): boolean {
  if (startM < endM) return nowM >= startM && nowM < endM;
  return nowM >= startM || nowM < endM;
}

function resolveLocalHourMinute(p: PersonalizationIn): { hour: number; minute: number } {
  if (typeof p.localHour === 'number' && p.localHour >= 0 && p.localHour <= 23) {
    const minute =
      typeof p.localMinute === 'number' && p.localMinute >= 0 && p.localMinute <= 59
        ? p.localMinute
        : 0;
    return { hour: p.localHour, minute };
  }
  const tz = typeof p.timezone === 'string' && p.timezone.trim() ? p.timezone.trim() : 'UTC';
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).formatToParts(new Date());
    const hour = parseInt(parts.find((x) => x.type === 'hour')?.value ?? '12', 10);
    const minute = parseInt(parts.find((x) => x.type === 'minute')?.value ?? '0', 10);
    return { hour, minute };
  } catch {
    const d = new Date();
    return { hour: d.getUTCHours(), minute: d.getUTCMinutes() };
  }
}

function parsePersonalization(raw: unknown): PersonalizationIn | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  return {
    gender: o.gender === 'male' || o.gender === 'female' ? o.gender : undefined,
    ethnicity: typeof o.ethnicity === 'string' ? o.ethnicity.slice(0, 40) : undefined,
    ethnicityCustom: typeof o.ethnicityCustom === 'string' ? o.ethnicityCustom.slice(0, 120) : undefined,
    ageRange: typeof o.ageRange === 'string' ? o.ageRange.slice(0, 24) : undefined,
    sleepStart: typeof o.sleepStart === 'string' ? o.sleepStart.slice(0, 8) : undefined,
    sleepEnd: typeof o.sleepEnd === 'string' ? o.sleepEnd.slice(0, 8) : undefined,
    timezone: typeof o.timezone === 'string' ? o.timezone.slice(0, 80) : undefined,
    localHour: typeof o.localHour === 'number' ? o.localHour : undefined,
    localMinute: typeof o.localMinute === 'number' ? o.localMinute : undefined,
    quietHoursHobbyPick: o.quietHoursHobbyPick === true,
  };
}

function buildTimingInstructionBlock(p: PersonalizationIn | null): string {
  if (!p) return '';
  const { hour, minute } = resolveLocalHourMinute(p);
  const nowM = hour * 60 + minute;
  const sm = parseHmLocal(p.sleepStart);
  const em = parseHmLocal(p.sleepEnd);
  let inSleep = false;
  if (sm !== null && em !== null) inSleep = inSleepWindow(nowM, sm, em);
  const lateNight = hour >= 22 || hour < 6;
  const tz = p.timezone?.trim() || 'not specified';

  const hobbyPickNote = p.quietHoursHobbyPick
    ? '- This spark’s **hobby** was picked from their list using **timezone + sleep hours**: during **evening wind-down (about 7–11pm), late night, or usual sleep window**, we biased toward calmer hobbies they actually listed — reflect that in the message; do not switch to a different activity they never added.'
    : '- The hobby was chosen at random among their list (neutral time of day).';

  return `
PERSONALIZATION — LOCAL TIME & SLEEP (smarter spark text only; user opted in; not for data collection):
- User-selected timezone: ${JSON.stringify(tz)}. Approximate local time when this spark was generated: ${hour}:${String(minute).padStart(2, '0')}.
- ${inSleep ? 'They are likely in their usual sleep window right now.' : 'Outside their stated usual sleep window, or sleep times not set.'}
- ${lateNight ? 'Local time is late night or very early morning.' : 'Local time is not treated as late night.'}
${hobbyPickNote}
- When LATE NIGHT (roughly 10pm–6am local) OR user is IN THEIR SLEEP WINDOW: do **not** push immediate loud outdoor or risky exertion (e.g. “run outside right now”). Prefer quiet indoor angles, light prep, stretching, planning a morning outing, or a calm version of the hobby. The **final sentence must still be strong and immediate**, but **time-smart** (e.g. “So set your shoes by the door for sunrise!” or “So give me ten quiet minutes right here now!”).
- When daytime AND outside sleep: enthusiastic physical nudges are fine when they fit the hobby.
`;
}

const AGE_FOR_IMAGE: Record<string, string> = {
  under_18: 'visibly about 16–17 years old (teen, not a young child, not an adult in their twenties)',
  '18_24': 'visibly young adult, about 18–24 — not middle-aged, not a young teenager',
  '25_34': 'visibly about mid-twenties to mid-thirties — not teen, not visibly 50+',
  '35_44': 'visibly about late thirties to mid-forties — not twenties, not senior',
  '45_54': 'visibly about mid-forties to mid-fifties — not thirty-something, not elderly',
  '55_64': 'visibly about late fifties to mid-sixties — mature but not frail senior by default',
  '65_plus': 'visibly older adult / senior — clearly not middle-aged',
};

const ETHNICITY_FOR_IMAGE: Record<string, string> = {
  asian:
    'read unmistakably as Asian — skin tone, hair texture, and facial structure consistent with Asian heritage (not substituted with a White or Black default model)',
  black:
    'read unmistakably as Black or of African heritage — skin tone, hair texture, and facial features consistent with that presentation (not a White or Asian default)',
  hispanic:
    'read unmistakably as Hispanic or Latino — features and coloring consistent with that heritage (not a generic White or other default)',
  mena:
    'read unmistakably as Middle Eastern or North African — features and coloring consistent with that heritage',
  native_american:
    'read unmistakably as Indigenous or Native American — features and presentation consistent with that heritage',
  pacific:
    'read unmistakably as Pacific Islander or Native Hawaiian — features and presentation consistent with that heritage',
  white:
    'read unmistakably as White or of European heritage — features and coloring consistent with that presentation (not substituted with another broad group)',
  multiracial:
    'read clearly as multiracial or multi-ethnic — blend visible in features and coloring, not a single-race stock stereotype',
};

function buildImageSubjectInstruction(p: PersonalizationIn | null): string | null {
  if (!p) return null;

  const locks: string[] = [];

  if (p.gender === 'male') {
    locks.push(
      'GENDER LOCK — REQUIRED: The only main human must be an adult man — clearly male-presenting face and body. Do not output a woman, a child, or an androgynous figure when a man is required.'
    );
  } else if (p.gender === 'female') {
    locks.push(
      'GENDER LOCK — REQUIRED: The only main human must be an adult woman — clearly female-presenting face and body. Do not output a man, a child, or an androgynous figure when a woman is required.'
    );
  }

  const age = p.ageRange ? AGE_FOR_IMAGE[p.ageRange] : '';
  if (age) {
    locks.push(
      `AGE LOCK — REQUIRED: Visible age of the main subject must match: ${age}. Skin, posture, and proportions must align; do not default to a generic 25-year-old model if that violates this band.`
    );
  }

  if (p.ethnicity === 'other' && p.ethnicityCustom?.trim()) {
    const desc = p.ethnicityCustom.trim().slice(0, 200);
    locks.push(
      `HERITAGE / LOOKS LOCK — REQUIRED (user self-described): The main subject must visibly match: "${desc}". Apply across face shape, skin tone, hair texture, and features. Do not ignore this in favor of a generic catalog model.`
    );
  } else if (p.ethnicity && p.ethnicity !== 'prefer_not' && p.ethnicity !== 'other') {
    const ethLine = ETHNICITY_FOR_IMAGE[p.ethnicity];
    if (ethLine) {
      locks.push(
        `HERITAGE LOCK — REQUIRED: The main subject must ${ethLine}. This is a hard constraint — do not swap in a subject who reads as a different ethnicity.`
      );
    }
  }

  if (locks.length === 0) return null;

  return (
    `=== IDENTITY CONSTRAINTS FOR IMAGE (apply to the single primary person; photoreal; respectful; no caricature) === ` +
    locks.join(' ') +
    ` ALL stated locks apply at once to the same individual. Natural skin texture and lighting.`
  );
}

/**
 * Builds a different creative brief each call so Imagine outputs don’t all look like the same stock shot.
 */
function buildVariedImagePrompt(hobbyLabel: string, subjectExtra: string | null): string {
  const label = hobbyLabel;

  const lighting = pickRandom([
    'golden-hour side light with long soft shadows',
    'bright diffused overcast daylight, even and natural',
    'warm late-afternoon sun through a large window',
    'soft north-facing window light, flattering and subtle',
    'early morning cool ambient light with one warm practical lamp',
    'dappled sunlight through trees or blinds',
    'clear blue-sky day with crisp natural color',
  ] as const);

  const setting = pickRandom([
    'in a cozy, lived-in home environment',
    'outdoors in a park, trail, or garden',
    'on a porch, patio, or balcony',
    'in a casual creative studio, garage, or workshop corner',
    'in a bright kitchen or dining area',
    'near a big window in a relaxed living space',
    'in a quiet urban outdoor spot with soft background bokeh',
    'by the water’s edge — lake, river, or calm shoreline',
  ] as const);

  const framing = pickRandom([
    'medium candid shot, caught mid-activity, not posing at the camera',
    'environmental portrait with lots of real-world context in frame',
    'three-quarter angle, attention on hands and the hobby, face optional',
    'slightly low camera angle for energy; subject immersed in the moment',
    'over-the-shoulder or beside-the-subject documentary framing',
    'wide establishing shot that shows place and activity together',
    'tighter intimate framing on tools, materials, or motion of the hobby',
  ] as const);

  const mood = pickRandom([
    'authentic laugh or relaxed smile',
    'quiet focused flow, brows soft, absorbed in the task',
    'playful spontaneous energy',
    'calm contentment',
    'quiet confidence and ease',
    'bright optimistic presence without a stiff grin',
  ] as const);

  const lensLook = pickRandom([
    '35mm documentary still — natural perspective',
    '50mm everyday lens look',
    'shallow depth of field, 85mm portrait compression on the subject',
    'moderate depth of field so environment stays readable',
  ] as const);

  const grade = pickRandom([
    'true-to-life natural color',
    'warm gentle film-inspired tones',
    'clean neutral grade, accurate whites',
    'soft contrast, lifted shadows, pleasing highlights',
  ] as const);

  const activityHook = pickRandom([
    `Show a specific, concrete moment of someone doing ${label} — not a vague pose.`,
    `Emphasize real props, tools, or materials used for ${label} in the frame.`,
    `Capture motion or interaction with the hobby — not a static stock stance.`,
    `One clear story beat: starting, practicing, or enjoying ${label} in a believable way.`,
  ] as const);

  const personLead = subjectExtra
    ? `Cinematic photorealistic photograph: one primary human who fully satisfies every IDENTITY CONSTRAINT at the start of this prompt, showing ${mood}, genuinely engaged in ${label}.`
    : `Cinematic photorealistic photograph: a real person with ${mood} while genuinely engaged in ${label}.`;

  const chunks: string[] = [];
  if (subjectExtra) {
    chunks.push(
      `${subjectExtra} Priority: if scene composition conflicts with these identity locks, change composition — never break gender, age, or heritage requirements.`
    );
  }
  chunks.push(
    personLead,
    `${setting}. ${framing}.`,
    `${lighting}. ${lensLook}, ${grade}.`,
    `${activityHook}`,
    'Each generation must feel like a different real day, location, and moment — avoid generic duplicate compositions, identical poses, or same “stock model” look across images.',
    'Photoreal only: real skin and fabric texture, believable physics. Not a drawing, cartoon, illustration, anime, vector art, or painterly CGI.'
  );
  if (subjectExtra) {
    chunks.push(
      'FINAL CHECK before render: verify the main subject still matches every GENDER / AGE / HERITAGE lock above — all three when all three were given.'
    );
  }
  chunks.push('No text, no words, no letters, no logos, no watermarks. Family friendly.');
  return chunks.join(' ');
}

/** Grok Imagine — same xAI API key as chat. Returns null on failure so text spark still succeeds. */
async function generateGrokImagineImageUrl(
  hobby: string,
  apiKey: string,
  subjectExtra: string | null
): Promise<string | null> {
  const label = sanitizeHobbyLabel(hobby);
  const imagePrompt = buildVariedImagePrompt(label, subjectExtra);

  const imgRes = await fetch('https://api.x.ai/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-imagine-image',
      prompt: imagePrompt,
      aspect_ratio: pickRandom(['16:9', '3:2'] as const),
      n: 1,
    }),
  });

  if (!imgRes.ok) {
    const errText = await imgRes.text();
    console.error('Grok Imagine API error:', imgRes.status, errText);
    return null;
  }

  const imgData = (await imgRes.json()) as { data?: Array<{ url?: string }> };
  const url = imgData.data?.[0]?.url;
  return typeof url === 'string' && url.length > 0 ? url : null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let body: { hobby?: string; userName?: string; personalization?: unknown };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Request body must be JSON with a hobby field.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { hobby, userName, personalization: personalizationRaw } = body;
    const personalization = parsePersonalization(personalizationRaw);

    if (!hobby) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: hobby' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseAnon || !serviceKey) {
      throw new Error('Supabase env (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY) must be set');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Sign in required.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authErr,
    } = await authClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile, error: profErr } = await admin
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profErr || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found. Complete onboarding first.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const gate = checkSparkAllowed(profile as Record<string, unknown>);
    if (!gate.ok) {
      return new Response(JSON.stringify({ error: gate.error }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('GROK_API_KEY');
    if (!apiKey) throw new Error('GROK_API_KEY is not set in Supabase secrets');

    const name = userName && userName !== 'friend' ? userName : null;
    const heyName = name ?? 'there';
    const requiredOpening = `Hey ${heyName}, `;

    const timingBlock = buildTimingInstructionBlock(personalization);

    const prompt = `You write voice lines for an app called ScrollSpark. Sound like a real friend — warm, casual, never corporate or "motivational poster."
${timingBlock}
Their hobby: ${JSON.stringify(hobby)}.
${name ? `Their first name is ${JSON.stringify(name)}.` : `No first name on file — use "there" as the name in the opening only (see below).`}

Return ONLY one JSON object (no markdown, no backticks) with exactly these keys:
- "title": string, 4–7 words, about this hobby, sounds like a friend not clickbait
- "subtitle": string, one short sentence, max 12 words
- "message": string — full script read aloud; see rules below
- "hobby": must be exactly ${JSON.stringify(hobby)} (copy this value character-for-character)

Rules for "message" (nothing is prepended — this is the entire spoken script, read aloud by text-to-speech):
- HARD RULE: "message" MUST begin with exactly this text (character-for-character, including the trailing space): ${JSON.stringify(requiredOpening)}
  Do not use a nickname, do not add a title, do not change "Hey" or the comma — only this opening, then continue the first sentence.
- DURATION TARGET: The full "message" should average **~12 seconds** when spoken at a natural pace (typical English TTS ~2.3–2.8 words/sec). Aim for **about 28–36 words** total; stay within **26–40 words** — never above 40. Short clauses, easy to say aloud.
- Structure: **3 or 4 sentences** total (not more). Normal punctuation.
- Sentence 1 (after the fixed opening): Continue from the opening — lightly acknowledge the feed / shorts / scrolling (zero guilt), and pivot toward ${JSON.stringify(hobby)}. Keep this sentence lean. Vary the *rest* every time; never reuse the same full sentence twice.
- Sentences 2–3 (middle): One or two **short** lines — casual encouragement or a concrete nudge. Contractions, simple words. No rambling.
- CLOSING (required): The **last sentence** must be a short, fired-up push to act **now** — same energy as "So go do it now!" or "Get after it — right this minute!" Vary the exact words each time, but it must feel urgent and cheering, not polite or optional.
- BANNED in "message" (especially at the end): hedging or delaying action — e.g. "when you can", "when you get a chance", "whenever you have time", "sometime", "no rush", "if you feel like it later", "give it a go when you can", "try it when you get a chance". Never end on a soft deferral; the app exists to pull them off the feed **immediately**.
- No emojis in "message". No bullet points, lists, or ALL CAPS. Do not say you are an AI.

Example JSON shape only (~12s voice; invent NEW lines; do not copy):
{"title":"Go make some noise","subtitle":"Your amp is waiting.","message":"Hey Sam, the feed can wait — pick up your guitar for fifteen minutes. You don't need it perfect; just start messing around. So go do it now!","hobby":"guitar"}`;

    const model = Deno.env.get('GROK_MODEL') ?? 'grok-3-mini';

    const grokRes = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!grokRes.ok) {
      const err = await grokRes.text();
      throw new Error(`Grok API error: ${err}`);
    }

    const grokData = await grokRes.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = grokData.choices?.[0]?.message?.content;
    const rawText = (typeof content === 'string' ? content : '').trim();
    if (!rawText) {
      return new Response(
        JSON.stringify({ error: 'Grok returned empty text. Check GROK_MODEL or try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripped = rawText.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    const jsonSlice =
      start >= 0 && end > start ? stripped.slice(start, end + 1) : stripped;

    let sparkData: { title?: string; subtitle?: string; message?: string; hobby?: string };
    try {
      sparkData = JSON.parse(jsonSlice);
    } catch {
      return new Response(
        JSON.stringify({
          error:
            'Could not parse AI reply as JSON. Try again, or set secret GROK_MODEL to another model (e.g. grok-3).',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!sparkData?.message || !sparkData?.title) {
      return new Response(
        JSON.stringify({ error: 'AI response was missing title or message.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!sparkData.subtitle) sparkData.subtitle = "You've got this!";
    sparkData.hobby = sparkData.hobby ?? hobby;

    try {
      const imageSubject = buildImageSubjectInstruction(personalization);
      const imageUrl = await generateGrokImagineImageUrl(hobby, apiKey, imageSubject);
      if (imageUrl) {
        (sparkData as { imageUrl?: string }).imageUrl = imageUrl;
      }
    } catch (imgErr) {
      console.error('Grok Imagine image generation failed:', imgErr);
    }

    const updates = computeProfileAfterSpark(profile as Record<string, unknown>);
    const { error: updErr } = await admin.from('user_profiles').update(updates).eq('user_id', user.id);
    if (updErr) {
      console.error('user_profiles update failed', updErr);
      return new Response(
        JSON.stringify({ error: 'Could not save spark progress. Try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify(sparkData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('generate-spark error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
