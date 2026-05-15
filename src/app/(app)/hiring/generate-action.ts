"use server";

import { getSession } from "@/lib/auth";
import { generateJobPosting } from "@/lib/xai";
import type { HiringFormState } from "./hiring-types";

const ROLE_VALUES = ["barista", "server", "cashier", "manager"] as const;
const SHIFT_VALUES = ["morning", "afternoon", "evening"] as const;

type RoleValue = (typeof ROLE_VALUES)[number];
type ShiftValue = (typeof SHIFT_VALUES)[number];

function isRole(value: string): value is RoleValue {
  return (ROLE_VALUES as readonly string[]).includes(value);
}

function isShift(value: string): value is ShiftValue {
  return (SHIFT_VALUES as readonly string[]).includes(value);
}

export async function generateJobPostingAction(
  _prevState: HiringFormState,
  formData: FormData,
): Promise<HiringFormState> {
  const rawRole = formData.get("role");
  const rawShifts = formData.getAll("shifts");
  const rawPerk = formData.get("perk");

  const role = typeof rawRole === "string" ? rawRole.trim() : "";
  const shifts = rawShifts
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
  const perk = typeof rawPerk === "string" ? rawPerk.trim() : "";

  const baseState: HiringFormState = {
    role,
    shifts,
    perk,
    content: null,
    error: null,
  };

  const sess = await getSession();
  if (!sess) {
    return { ...baseState, error: "Bạn cần đăng nhập để dùng tính năng này." };
  }
  if (sess.role !== "admin") {
    return {
      ...baseState,
      error: "Chỉ quản trị viên mới có thể tạo tin tuyển dụng.",
    };
  }

  if (!isRole(role)) {
    return { ...baseState, error: "Vai trò không hợp lệ." };
  }
  if (shifts.length === 0) {
    return { ...baseState, error: "Vui lòng chọn ít nhất một ca làm việc." };
  }
  if (!shifts.every(isShift)) {
    return { ...baseState, error: "Ca làm việc không hợp lệ." };
  }
  // Dedupe to subset
  const uniqueShifts = Array.from(new Set(shifts));
  if (perk.length < 1 || perk.length > 200) {
    return {
      ...baseState,
      error: "Mô tả quyền lợi cần từ 1 đến 200 ký tự.",
    };
  }

  try {
    const { content } = await generateJobPosting({
      role,
      shifts: uniqueShifts,
      perk,
    });
    return {
      role,
      shifts: uniqueShifts,
      perk,
      content,
      error: null,
    };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Không tạo được tin tuyển dụng.";
    return { ...baseState, shifts: uniqueShifts, error: message };
  }
}
