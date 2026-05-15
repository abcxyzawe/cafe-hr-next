import type {
  ShiftTemplateDay,
  ShiftTemplateShiftKey,
  ShiftTemplateWeekday,
} from "@/lib/xai";

export type ShiftTemplateRoleKey = "barista" | "server" | "cashier" | "manager";

export const SHIFT_TEMPLATE_ROLES: ReadonlyArray<{
  value: ShiftTemplateRoleKey;
  label: string;
}> = [
  { value: "barista", label: "Pha chế" },
  { value: "server", label: "Phục vụ" },
  { value: "cashier", label: "Thu ngân" },
  { value: "manager", label: "Quản lý" },
];

export const SHIFT_TEMPLATE_SHIFT_OPTS: ReadonlyArray<{
  value: ShiftTemplateShiftKey;
  label: string;
}> = [
  { value: "morning", label: "Sáng" },
  { value: "afternoon", label: "Chiều" },
  { value: "evening", label: "Tối" },
];

export const SHIFT_TEMPLATE_WEEKDAY_FULL: Record<ShiftTemplateWeekday, string> = {
  T2: "Thứ Hai",
  T3: "Thứ Ba",
  T4: "Thứ Tư",
  T5: "Thứ Năm",
  T6: "Thứ Sáu",
  T7: "Thứ Bảy",
  CN: "Chủ Nhật",
};

export type ShiftTemplateEmployee = {
  id: number;
  name: string;
  role: string;
};

export type ShiftTemplateTargets = Record<
  ShiftTemplateShiftKey,
  Record<ShiftTemplateRoleKey, number>
>;

export const INITIAL_SHIFT_TEMPLATE_TARGETS: ShiftTemplateTargets = {
  morning: { barista: 2, server: 1, cashier: 1, manager: 0 },
  afternoon: { barista: 2, server: 2, cashier: 1, manager: 1 },
  evening: { barista: 2, server: 2, cashier: 1, manager: 0 },
};

export type ShiftTemplateState = {
  targets: ShiftTemplateTargets;
  template: ShiftTemplateDay[] | null;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_SHIFT_TEMPLATE_STATE: ShiftTemplateState = {
  targets: INITIAL_SHIFT_TEMPLATE_TARGETS,
  template: null,
  error: null,
  generatedAt: null,
};

export function isShiftTemplateRoleKey(v: string): v is ShiftTemplateRoleKey {
  return SHIFT_TEMPLATE_ROLES.some((r) => r.value === v);
}

export function shiftTemplateRoleLabel(role: string): string {
  return SHIFT_TEMPLATE_ROLES.find((r) => r.value === role)?.label ?? role;
}

export function shiftTemplateShiftLabel(shift: ShiftTemplateShiftKey): string {
  return SHIFT_TEMPLATE_SHIFT_OPTS.find((s) => s.value === shift)?.label ?? shift;
}

export function targetsFieldName(
  shift: ShiftTemplateShiftKey,
  role: ShiftTemplateRoleKey,
): string {
  return `target_${shift}_${role}`;
}
