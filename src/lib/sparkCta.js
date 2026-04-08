/**
 * Spark overlay primary button — avoids patterns like "Let's go do playing guitar!".
 * @param {string} [hobby]
 * @returns {string}
 */
export function sparkPrimaryCtaLabel(hobby) {
  const h = String(hobby ?? '').trim();
  if (!h) return "Let's go!";

  if (/^working on\s+/i.test(h)) {
    const rest = h.replace(/^working on\s+/i, '').trim();
    return `Let's work on ${rest}!`;
  }

  // Gerund + object: "playing guitar", "learning piano"
  const gerundRest = /^(playing|practicing|learning|trying|studying|reading|writing|drawing|painting|knitting|cooking|baking|coding|building|gardening|hiking|swimming|cycling|running)\s+(.+)$/i.exec(
    h
  );
  if (gerundRest) {
    const g = gerundRest[1].toLowerCase();
    const rest = gerundRest[2].trim();
    const map = {
      playing: () => `Let's go play ${rest}!`,
      practicing: () => `Let's practice ${rest}!`,
      learning: () => `Let's learn ${rest}!`,
      trying: () => `Let's try ${rest}!`,
      studying: () => `Let's study ${rest}!`,
      reading: () => `Let's read ${rest}!`,
      writing: () => `Let's write ${rest}!`,
      drawing: () => `Let's draw ${rest}!`,
      painting: () => `Let's paint ${rest}!`,
      knitting: () => `Let's knit ${rest}!`,
      cooking: () => `Let's cook ${rest}!`,
      baking: () => `Let's bake ${rest}!`,
      coding: () => `Let's code ${rest}!`,
      building: () => `Let's build ${rest}!`,
      gardening: () => `Let's garden ${rest}!`,
      hiking: () => `Let's hike ${rest}!`,
      swimming: () => `Let's swim ${rest}!`,
      cycling: () => `Let's cycle ${rest}!`,
      running: () => `Let's run ${rest}!`,
    };
    const fn = map[g];
    if (fn) return fn();
  }

  // Single-word activity gerunds
  const lower = h.toLowerCase();
  const only = {
    running: "Let's go for a run!",
    swimming: "Let's go swim!",
    reading: "Time to read!",
    writing: "Time to write!",
    knitting: "Time to knit!",
    cooking: "Time to cook!",
    baking: "Time to bake!",
    yoga: "Time for yoga!",
    meditation: "Time to meditate!",
    meditating: "Time to meditate!",
  };
  if (only[lower]) return only[lower];

  // "play guitar" style (already imperative)
  if (/^play\s+/i.test(h)) return `Let's go ${h}!`;

  // Noun / phrase: "guitar", "watercolor", "board games" — "Time for …" reads well
  return `Time for ${h}!`;
}
