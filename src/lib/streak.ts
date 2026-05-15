export type StreakInfo = {
  currentStreak: number; // consecutive days ending today or yesterday
  longestStreak: number; // historical max
  lastWorkedDate: Date | null;
};

/**
 * Build a YYYY-MM-DD key in local time (avoids UTC off-by-one near midnight).
 */
function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string back into a local Date at midnight.
 */
function parseLocalDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Difference in whole calendar days between two day-keys (b - a),
 * computed in local time using Date arithmetic at midnight.
 */
function dayDiff(aKey: string, bKey: string): number {
  const a = parseLocalDayKey(aKey);
  const b = parseLocalDayKey(bKey);
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/**
 * Compute consecutive-days-worked streaks from a list of check-in timestamps.
 * - currentStreak counts consecutive days ending today (or yesterday).
 * - longestStreak is the maximum consecutive run anywhere in history.
 */
export function computeStreak(
  checkInDates: Date[],
  today?: Date,
): StreakInfo {
  if (checkInDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastWorkedDate: null };
  }

  // Dedupe by local day-key
  const keys = Array.from(new Set(checkInDates.map(localDayKey))).sort();

  // Compute longest run anywhere in history
  let longest = 1;
  let run = 1;
  for (let i = 1; i < keys.length; i++) {
    const gap = dayDiff(keys[i - 1], keys[i]);
    if (gap === 1) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  // Compute current streak — consecutive days ending today or yesterday
  const now = today ?? new Date();
  const todayKey = localDayKey(now);
  const lastKey = keys[keys.length - 1];
  const lastWorkedDate = parseLocalDayKey(lastKey);

  const distFromToday = dayDiff(lastKey, todayKey);
  let current = 0;
  if (distFromToday === 0 || distFromToday === 1) {
    current = 1;
    for (let i = keys.length - 2; i >= 0; i--) {
      if (dayDiff(keys[i], keys[i + 1]) === 1) {
        current++;
      } else {
        break;
      }
    }
  }

  return {
    currentStreak: current,
    longestStreak: longest,
    lastWorkedDate,
  };
}
