import type {
  ShiftSuggestionResult,
  ShiftOptimizerEmployeeInput,
} from "@/lib/xai";

export const NOTES_MAX = 500;

export const TRAFFIC_OPTIONS: ReadonlyArray<{
  value: ShiftTraffic;
  label: string;
  hint: string;
}> = [
  { value: "low", label: "Thấp", hint: "Ngày vắng, ít khách" },
  { value: "medium", label: "Trung bình", hint: "Lượng khách đều" },
  { value: "high", label: "Cao", hint: "Cao điểm, đông khách" },
];

export type ShiftTraffic = "low" | "medium" | "high";

export type ShiftOptimizerEmployee = ShiftOptimizerEmployeeInput;

export type ShiftOptimizerEmployeeGroup = {
  role: string;
  roleLabel: string;
  members: ShiftOptimizerEmployee[];
};

export type ShiftOptimizerFormValues = {
  weekStart: string;
  traffic: ShiftTraffic;
  notes: string;
};

export type ShiftOptimizerActionState = {
  values: ShiftOptimizerFormValues;
  result: ShiftSuggestionResult | null;
  error: string | null;
  generatedAt: number | null;
};

export type ShiftOptimizerActionResult =
  | { ok: true; data: ShiftSuggestionResult }
  | { ok: false; error: string };

export const ROLE_LABELS: Record<string, string> = {
  barista: "Pha chế (Barista)",
  server: "Phục vụ (Server)",
  cashier: "Thu ngân (Cashier)",
  manager: "Quản lý (Manager)",
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

function todayMondayISO(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const d = String(monday.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const INITIAL_SHIFT_OPTIMIZER_STATE: ShiftOptimizerActionState = {
  values: {
    weekStart: todayMondayISO(),
    traffic: "medium",
    notes: "",
  },
  result: null,
  error: null,
  generatedAt: null,
};

const VN_WEEKDAY_LABELS = [
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
  "Chủ nhật",
];

export type WeekDayPlan = {
  weekdayLabel: string;
  date: string; // YYYY-MM-DD
};

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  const [y, m, day] = value.split("-").map((v) => Number.parseInt(v, 10));
  return (
    d.getUTCFullYear() === y &&
    d.getUTCMonth() + 1 === m &&
    d.getUTCDate() === day
  );
}

export function isMondayIso(value: string): boolean {
  if (!isValidIsoDate(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return d.getUTCDay() === 1;
}

export function buildWeekDays(mondayIso: string): WeekDayPlan[] {
  const base = new Date(`${mondayIso}T00:00:00Z`);
  const out: WeekDayPlan[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() + i);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    out.push({
      weekdayLabel: VN_WEEKDAY_LABELS[i],
      date: `${y}-${m}-${day}`,
    });
  }
  return out;
}

export type ShiftOptimizerValidationOk = {
  ok: true;
  weekStart: string;
  traffic: ShiftTraffic;
  notes: string;
  weekDays: WeekDayPlan[];
};

export type ShiftOptimizerValidationErr = {
  ok: false;
  error: string;
};

export function validateShiftOptimizerInputs(
  values: ShiftOptimizerFormValues,
): ShiftOptimizerValidationOk | ShiftOptimizerValidationErr {
  const weekStart = values.weekStart.trim();
  if (!isValidIsoDate(weekStart)) {
    return {
      ok: false,
      error: "Ngày bắt đầu tuần không hợp lệ (định dạng YYYY-MM-DD).",
    };
  }
  if (!isMondayIso(weekStart)) {
    return {
      ok: false,
      error: "Ngày bắt đầu tuần phải rơi vào Thứ 2.",
    };
  }
  const traffic = values.traffic;
  if (traffic !== "low" && traffic !== "medium" && traffic !== "high") {
    return {
      ok: false,
      error: "Lưu lượng khách không hợp lệ.",
    };
  }
  const notes = values.notes.trim();
  if (notes.length > NOTES_MAX) {
    return {
      ok: false,
      error: `Ghi chú không được vượt quá ${NOTES_MAX} ký tự.`,
    };
  }
  return {
    ok: true,
    weekStart,
    traffic,
    notes,
    weekDays: buildWeekDays(weekStart),
  };
}
