import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabaseClient';

/**
 * Grok TTS voices used for sparks: two female (ara, eve) + two male (rex, leo).
 * @see https://docs.x.ai/docs/guides/voice
 */
export const SPARK_TTS_VOICE_POOL = Object.freeze(['ara', 'eve', 'rex', 'leo']);

export function pickRandomSparkVoice() {
  return SPARK_TTS_VOICE_POOL[Math.floor(Math.random() * SPARK_TTS_VOICE_POOL.length)];
}

/**
 * Fetch MP3 audio for spark narration via Supabase Edge (xAI Grok TTS).
 * @param {string} text
 * @param {AbortSignal} [signal]
 * @param {string} [voiceId] — must be in {@link SPARK_TTS_VOICE_POOL}; otherwise a random pool voice is used
 * @returns {Promise<Blob>}
 */
export async function fetchSparkTtsAudio(text, signal, voiceId) {
  const voice_id =
    typeof voiceId === 'string' && SPARK_TTS_VOICE_POOL.includes(voiceId)
      ? voiceId
      : pickRandomSparkVoice();

  const res = await fetch(`${SUPABASE_URL}/functions/v1/spark-tts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, voice_id }),
    signal,
  });

  const ct = (res.headers.get('content-type') || '').toLowerCase();

  if (!res.ok) {
    let msg = `Voice failed (${res.status})`;
    try {
      const t = await res.text();
      const j = JSON.parse(t);
      if (j?.error != null) msg = String(j.error);
    } catch {
      /* keep default */
    }
    throw new Error(msg);
  }

  if (!ct.includes('audio') && !ct.includes('octet-stream')) {
    throw new Error('Unexpected response from voice service.');
  }

  return res.blob();
}
