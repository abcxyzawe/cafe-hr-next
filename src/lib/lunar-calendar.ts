/**
 * Vietnamese lunar calendar (âm lịch) conversion utility.
 *
 * APPROXIMATE — NOT astronomically accurate.
 *
 * A real Vietnamese lunar converter requires astronomical computation of new
 * moons in the GMT+7 timezone, plus leap-month detection (Trung Khí rule).
 * For this cafe HR app's display-chip use case we use a pragmatic shortcut:
 *
 *   1. Hard-code the Gregorian date of mùng 1 Tết for each lunar year covered
 *      (2024..2028). These come from the standard Vietnamese Lịch Vạn Niên.
 *   2. Hard-code a per-year month-length table (12 months × 29 or 30 days).
 *      Leap months are NOT modelled — production usage would need a full lib
 *      (e.g. an ISC-licensed VN lunar package).
 *   3. For any Gregorian date, find the most-recent Tết on or before it, then
 *      walk the per-year month-length table to derive lunar month + day.
 *
 * Coverage: dates whose lunar year is in 2024..2028. Anything outside this
 * window falls back to a best-effort (treats lunar year ≡ gregorian year and
 * assumes 30-day months).
 */

export type LunarDate = {
  lunarYear: number;
  lunarMonth: number;
  lunarDay: number;
};

// Mùng 1 Tết (Gregorian date) for each lunar year. Sourced from VN Lịch Vạn
// Niên references. Kept independent of `holidays.ts` (which uses these for the
// Tết holiday block but does not export the table).
const TET_BY_LUNAR_YEAR: Record<number, string> = {
  2024: "2024-02-10",
  2025: "2025-01-29",
  2026: "2026-02-17",
  2027: "2027-02-06",
  2028: "2028-01-26",
};

// Per-lunar-year month lengths (12 entries × 29|30 days). Leap months omitted.
const MONTH_LENGTHS: Record<number, ReadonlyArray<number>> = {
  2024: [29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30],
  2025: [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29],
  2026: [30, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30],
  2027: [29, 30, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29],
  2028: [30, 29, 30, 30, 29, 30, 29, 30, 29, 30, 29, 30],
};

// Heavenly stems (Thiên Can) — index 0 = Giáp.
const STEMS = [
  "Giáp",
  "Ất",
  "Bính",
  "Đinh",
  "Mậu",
  "Kỷ",
  "Canh",
  "Tân",
  "Nhâm",
  "Quý",
] as const;

// Earthly branches (Địa Chi) — index 0 = Tý.
const BRANCHES = [
  "Tý",
  "Sửu",
  "Dần",
  "Mão",
  "Thìn",
  "Tỵ",
  "Ngọ",
  "Mùi",
  "Thân",
  "Dậu",
  "Tuất",
  "Hợi",
] as const;

function parseIsoLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map((p) => Number.parseInt(p, 10));
  return new Date(y, m - 1, d);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function diffDays(a: Date, b: Date): number {
  const ms = startOfDay(a).getTime() - startOfDay(b).getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * Convert a Gregorian date to an approximate Vietnamese lunar date.
 *
 * Algorithm:
 *   - Pick the most-recent Tết (mùng 1) on or before the input date.
 *   - Walk that lunar year's month-length table, subtracting day counts until
 *     the remainder fits inside a month → that yields lunarMonth + lunarDay.
 *   - If the remainder overflows the table (e.g. due to an un-modelled leap
 *     month), advance into the next lunar year.
 */
export function gregorianToLunar(date: Date): LunarDate {
  const target = startOfDay(date);

  // Find the latest Tết on or before `target`.
  const candidateYears = Object.keys(TET_BY_LUNAR_YEAR)
    .map((y) => Number.parseInt(y, 10))
    .sort((a, b) => a - b);

  let lunarYear = candidateYears[0];
  for (const y of candidateYears) {
    const tetIso = TET_BY_LUNAR_YEAR[y];
    if (!tetIso) continue;
    const tet = parseIsoLocal(tetIso);
    if (tet.getTime() <= target.getTime()) {
      lunarYear = y;
    }
  }

  let tetDate = parseIsoLocal(
    TET_BY_LUNAR_YEAR[lunarYear] ?? `${lunarYear}-02-01`,
  );
  let elapsed = diffDays(target, tetDate);

  // Out-of-range past dates: fall back to crude estimate.
  if (elapsed < 0) {
    return {
      lunarYear,
      lunarMonth: 1,
      lunarDay: 1,
    };
  }

  let months = MONTH_LENGTHS[lunarYear];
  // Walk forward, possibly across a year boundary.
  while (months) {
    const yearLength = months.reduce((a, b) => a + b, 0);
    if (elapsed < yearLength) {
      let monthIdx = 0;
      let remaining = elapsed;
      while (monthIdx < months.length && remaining >= months[monthIdx]) {
        remaining -= months[monthIdx];
        monthIdx += 1;
      }
      return {
        lunarYear,
        lunarMonth: monthIdx + 1,
        lunarDay: remaining + 1,
      };
    }
    // Overflow into next lunar year.
    elapsed -= yearLength;
    lunarYear += 1;
    tetDate = parseIsoLocal(
      TET_BY_LUNAR_YEAR[lunarYear] ?? `${lunarYear}-02-01`,
    );
    months = MONTH_LENGTHS[lunarYear];
  }

  // Beyond table coverage — best-effort 30-day fallback.
  const monthIdx = Math.min(11, Math.floor(elapsed / 30));
  const day = (elapsed % 30) + 1;
  return {
    lunarYear,
    lunarMonth: monthIdx + 1,
    lunarDay: day,
  };
}

/**
 * Stem-Branch (Can Chi) name of a lunar year. The 60-year cycle is anchored
 * such that 1984 = Giáp Tý.
 */
export function lunarYearStemBranch(lunarYear: number): string {
  const stemIdx = ((lunarYear - 1984) % 10 + 10) % 10;
  const branchIdx = ((lunarYear - 1984) % 12 + 12) % 12;
  return `${STEMS[stemIdx]} ${BRANCHES[branchIdx]}`;
}

/** "15/8 (âm)" */
export function formatLunarShort(d: LunarDate): string {
  return `${d.lunarDay}/${d.lunarMonth} (âm)`;
}

/** "Mồng 1 tháng 8 năm Giáp Thìn" */
export function formatLunarLong(d: LunarDate): string {
  const dayLabel = d.lunarDay <= 10 ? `Mồng ${d.lunarDay}` : `Ngày ${d.lunarDay}`;
  return `${dayLabel} tháng ${d.lunarMonth} năm ${lunarYearStemBranch(d.lunarYear)}`;
}
