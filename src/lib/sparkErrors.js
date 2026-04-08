/**
 * Supabase `functions.invoke` sets `error.context` to the raw `Response` on non-2xx.
 * Read the body so we show the real message (e.g. Grok errors, JSON parse hints).
 */
export async function messageFromFunctionsInvokeError(error) {
  if (!error) return 'Unknown error';
  if (error.context instanceof Response) {
    try {
      const text = await error.context.text();
      if (!text?.trim()) return error.message;
      try {
        const j = JSON.parse(text);
        if (j.error != null) return String(j.error);
      } catch {
        /* not JSON */
      }
      return text.length > 600 ? `${text.slice(0, 600)}…` : text;
    } catch {
      return error.message;
    }
  }
  return error.message || 'Function invoke failed';
}

export function formatSparkError(err) {
  if (!err) return 'Could not generate your spark. Please try again.';
  const msg = err.message || String(err);
  if (/failed to fetch|network/i.test(msg)) {
    return 'Network error — check your connection and try again.';
  }
  if (/invalid jwt/i.test(msg)) {
    return 'Your login session expired. Log out, log back in, then try Spark Me again.';
  }
  return msg;
}
