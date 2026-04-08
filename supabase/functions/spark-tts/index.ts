import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_VOICES = new Set(['ara', 'eve', 'rex', 'sal', 'leo']);

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body: { text?: string; voice_id?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text) {
      return new Response(JSON.stringify({ error: 'Missing or empty text' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (text.length > 15_000) {
      return new Response(JSON.stringify({ error: 'Text exceeds maximum length (15,000 characters).' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('GROK_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'TTS is not configured (GROK_API_KEY).' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fromEnv = (Deno.env.get('GROK_TTS_VOICE') ?? 'ara').trim().toLowerCase();
    const fromBody = typeof body.voice_id === 'string' ? body.voice_id.trim().toLowerCase() : '';
    const voice_id = fromBody && ALLOWED_VOICES.has(fromBody) ? fromBody : ALLOWED_VOICES.has(fromEnv) ? fromEnv : 'ara';

    const ttsRes = await fetch('https://api.x.ai/v1/tts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice_id,
        language: 'en',
      }),
    });

    if (!ttsRes.ok) {
      const errText = await ttsRes.text();
      console.error('xAI TTS error:', ttsRes.status, errText);
      return new Response(
        JSON.stringify({
          error: `Grok voice failed (${ttsRes.status}). ${errText.slice(0, 200)}`,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const audioBuffer = new Uint8Array(await ttsRes.arrayBuffer());

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('spark-tts error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
