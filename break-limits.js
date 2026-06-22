/* =========================
   BREAK / LUNCH DAILY LIMITS
   Rules: 3 breaks + 1 lunch per day. Back-to-back ("burst") an agent may take
   either up to 3 breaks in a row, OR 1 break + 1 lunch. Once a combo is
   finished, the remaining pauses unlock 30 min after the last one ended.
   Pauses less than COOLDOWN_MS apart count as the same burst.
========================= */

const DAILY_BREAK_LIMIT = 3;        // max 3 breaks per day
const DAILY_LUNCH_LIMIT = 1;        // max 1 lunch per day
const COOLDOWN_MS = 30 * 60 * 1000; // 30 min cooldown between combos

// Analyses today's break log and returns daily counts plus, for each pause
// type, whether it can be started right now and (if not) why / until when.
// `now` is injectable for testing; defaults to the current time.
function getDailyBreakStats(breakLog, now = Date.now()) {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayTs = todayStart.getTime();

  const today = (breakLog || [])
    .filter((e) => e.start >= todayTs)
    .sort((a, b) => a.start - b.start);

  let breakCount = 0;
  let lunchCount = 0;
  // Composition of the current (trailing) burst — pauses chained < 30 min apart.
  let burstBreaks = 0;
  let burstLunch = 0;
  let lastEnd = null; // end of the most recent pause (or now if still active)

  for (const e of today) {
    const eEnd = e.end || now;
    if (lastEnd !== null && e.start - lastEnd >= COOLDOWN_MS) {
      // A 30-min gap ends the previous burst and starts a fresh one.
      burstBreaks = 0;
      burstLunch = 0;
    }
    if (e.type === 'break') { breakCount++; burstBreaks++; }
    else if (e.type === 'lunch') { lunchCount++; burstLunch++; }
    lastEnd = eEnd;
  }

  // A burst is "complete" (triggers the 30-min cooldown) once it is either
  // 3 breaks, or a break paired with a lunch.
  let burstComplete = burstBreaks >= 3 || (burstBreaks >= 1 && burstLunch >= 1);

  // If the cooldown after a completed burst has already elapsed, the next
  // pause starts a fresh burst.
  if (burstComplete && lastEnd !== null && now >= lastEnd + COOLDOWN_MS) {
    burstBreaks = 0;
    burstLunch = 0;
    burstComplete = false;
  }

  const burstCooldownUntil =
    burstComplete && lastEnd !== null && now < lastEnd + COOLDOWN_MS
      ? lastEnd + COOLDOWN_MS
      : null;

  const breakRemaining = Math.max(0, DAILY_BREAK_LIMIT - breakCount);
  const lunchRemaining = Math.max(0, DAILY_LUNCH_LIMIT - lunchCount);

  // ---- Break availability ----
  let breakAllowed = false;
  let breakCooldownUntil = null;
  let breakReason = null;
  if (breakRemaining <= 0) {
    breakReason = `Лимит брейков исчерпан — максимум ${DAILY_BREAK_LIMIT} в день`;
  } else if (burstCooldownUntil) {
    breakCooldownUntil = burstCooldownUntil;
    breakReason = 'Брейк недоступен — подожди 30 мин после комбо';
  } else {
    breakAllowed = true;
  }

  // ---- Lunch availability ----
  let lunchAllowed = false;
  let lunchCooldownUntil = null;
  let lunchReason = null;
  if (lunchRemaining <= 0) {
    lunchReason = 'Лимит ланча исчерпан — максимум 1 в день';
  } else if (burstCooldownUntil) {
    lunchCooldownUntil = burstCooldownUntil;
    lunchReason = 'Ланч недоступен — подожди 30 мин после комбо';
  } else if (burstBreaks >= 2) {
    // Lunch is only a valid combo continuation after a single break;
    // after 2+ breaks it needs a fresh burst (30 min from the last pause).
    const cd = (lastEnd || now) + COOLDOWN_MS;
    if (now < cd) {
      lunchCooldownUntil = cd;
      lunchReason = 'Ланч после 2 брейков — доступен через 30 мин';
    } else {
      lunchAllowed = true;
    }
  } else {
    lunchAllowed = true;
  }

  return {
    breakCount,
    lunchCount,
    breakRemaining,
    lunchRemaining,
    breakAllowed,
    lunchAllowed,
    breakCooldownUntil,
    lunchCooldownUntil,
    breakReason,
    lunchReason,
  };
}

module.exports = {
  DAILY_BREAK_LIMIT,
  DAILY_LUNCH_LIMIT,
  COOLDOWN_MS,
  getDailyBreakStats,
};
