/** Strip emoji / pictographs so TTS doesn’t read them aloud. */
export function stripForSpeech(text) {
  if (!text) return '';
  return text
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\p{Emoji_Modifier}/gu, '')
    .replace(/\uFE0F/g, '')
    .replace(/\u200D/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Full script for Grok TTS — matches edge `message` (no client intro). */
export function buildSpeechText(sparkData) {
  if (!sparkData?.message) return '';
  return stripForSpeech(sparkData.message);
}
