/**
 * Vietnamese public holidays (Tết âm lịch + ngày lễ cố định Gregorian).
 * Solar dates only — fixed dates that recur annually.
 * Lunar Tết dates pre-computed for 2024–2027.
 */

type HolidayInfo = {
  name: string;
  short: string;
};

const FIXED: Record<string, HolidayInfo> = {
  "01-01": { name: "Tết Dương lịch", short: "Tết DL" },
  "04-30": { name: "Giải phóng miền Nam", short: "30/4" },
  "05-01": { name: "Quốc tế Lao động", short: "1/5" },
  "09-02": { name: "Quốc khánh", short: "Quốc khánh" },
};

// Lunar Tết: 30 Tết + mùng 1 → mùng 5
// Pre-computed Gregorian dates for the lunar Tết holiday block
const LUNAR_TET: Record<number, string[]> = {
  2024: ["2024-02-08", "2024-02-09", "2024-02-10", "2024-02-11", "2024-02-12", "2024-02-13", "2024-02-14"],
  2025: ["2025-01-28", "2025-01-29", "2025-01-30", "2025-01-31", "2025-02-01", "2025-02-02", "2025-02-03"],
  2026: ["2026-02-16", "2026-02-17", "2026-02-18", "2026-02-19", "2026-02-20", "2026-02-21", "2026-02-22"],
  2027: ["2027-02-05", "2027-02-06", "2027-02-07", "2027-02-08", "2027-02-09", "2027-02-10", "2027-02-11"],
};

// Giỗ Tổ Hùng Vương: mùng 10/3 âm lịch — pre-computed for stability
const HUNG_KING: Record<number, string> = {
  2024: "2024-04-18",
  2025: "2025-04-07",
  2026: "2026-04-26",
  2027: "2027-04-16",
};

export function getHoliday(date: Date): HolidayInfo | null {
  const iso = date.toISOString().slice(0, 10);
  const mmdd = iso.slice(5);
  const year = date.getFullYear();

  if (FIXED[mmdd]) return FIXED[mmdd];
  if (LUNAR_TET[year]?.includes(iso)) return { name: "Tết Nguyên đán", short: "Tết" };
  if (HUNG_KING[year] === iso) return { name: "Giỗ Tổ Hùng Vương", short: "Giỗ Tổ" };
  return null;
}

export function isHoliday(date: Date): boolean {
  return getHoliday(date) !== null;
}

// ---------------------------------------------------------------------------
// Structured holiday list (used by week grid overlay & schedule warnings)
// ---------------------------------------------------------------------------

export type Holiday = {
  iso: string;
  name: string;
  type: "public" | "observed";
};

const FIXED_PUBLIC: Array<{ mmdd: string; name: string }> = [
  { mmdd: "01-01", name: "Tết Dương lịch" },
  { mmdd: "04-30", name: "Ngày Giải phóng" },
  { mmdd: "05-01", name: "Quốc tế Lao động" },
  { mmdd: "09-02", name: "Quốc khánh" },
];

const FIXED_OBSERVED: Array<{ mmdd: string; name: string }> = [
  { mmdd: "03-08", name: "Quốc tế Phụ nữ" },
  { mmdd: "10-20", name: "Phụ nữ Việt Nam" },
];

function buildList(): Holiday[] {
  const out: Holiday[] = [];
  for (const year of [2025, 2026, 2027]) {
    for (const f of FIXED_PUBLIC) {
      out.push({ iso: `${year}-${f.mmdd}`, name: f.name, type: "public" });
    }
    for (const f of FIXED_OBSERVED) {
      out.push({ iso: `${year}-${f.mmdd}`, name: f.name, type: "observed" });
    }
    const tet = LUNAR_TET[year] ?? [];
    tet.forEach((iso, idx) => {
      out.push({
        iso,
        name: `Tết Nguyên đán (Mồng ${idx + 1})`,
        type: "public",
      });
    });
    const hung = HUNG_KING[year];
    if (hung) {
      out.push({ iso: hung, name: "Giỗ Tổ Hùng Vương", type: "public" });
    }
  }
  out.sort((a, b) => a.iso.localeCompare(b.iso));
  return out;
}

export const VN_HOLIDAYS_2025_2027: Holiday[] = buildList();

function toIsoLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Returns holidays whose ISO date falls within [start, end). Inclusive start,
 * exclusive end. Uses local-date components of the input boundaries so it
 * matches week-grid logic (which builds days via local-time setDate).
 */
export function getHolidaysInRange(start: Date, end: Date): Holiday[] {
  const startIso = toIsoLocal(start);
  const endIso = toIsoLocal(end);
  return VN_HOLIDAYS_2025_2027.filter(
    (h) => h.iso >= startIso && h.iso < endIso,
  );
}

export function getHolidayByIso(iso: string): Holiday | null {
  return VN_HOLIDAYS_2025_2027.find((h) => h.iso === iso) ?? null;
}
