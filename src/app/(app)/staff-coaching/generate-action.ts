"use server";

import { getSession } from "@/lib/auth";
import { generateStaffCoachingScript } from "@/lib/xai";
import {
  INITIAL_STAFF_COACHING_STATE,
  STAFF_COACHING_DURATIONS,
  isStaffCoachingDuration,
  isStaffCoachingReason,
  isStaffCoachingRole,
  isStaffCoachingTone,
  validateStaffCoachingInputs,
  type StaffCoachingDuration,
  type StaffCoachingFormValues,
  type StaffCoachingState,
} from "./types";
import type {
  StaffCoachingReason,
  StaffCoachingRole,
  StaffCoachingTone,
} from "@/lib/xai";

function coerceRole(raw: FormDataEntryValue | null): StaffCoachingRole {
  const v = typeof raw === "string" ? raw : "";
  if (isStaffCoachingRole(v)) return v;
  return INITIAL_STAFF_COACHING_STATE.values.role;
}

function coerceReason(raw: FormDataEntryValue | null): StaffCoachingReason {
  const v = typeof raw === "string" ? raw : "";
  if (isStaffCoachingReason(v)) return v;
  return INITIAL_STAFF_COACHING_STATE.values.reason;
}

function coerceTone(raw: FormDataEntryValue | null): StaffCoachingTone {
  const v = typeof raw === "string" ? raw : "";
  if (isStaffCoachingTone(v)) return v;
  return INITIAL_STAFF_COACHING_STATE.values.tone;
}

function coerceDuration(
  raw: FormDataEntryValue | null,
): StaffCoachingDuration {
  const n = typeof raw === "string" ? Number.parseInt(raw, 10) : Number.NaN;
  if (Number.isFinite(n) && isStaffCoachingDuration(n)) {
    return n;
  }
  return INITIAL_STAFF_COACHING_STATE.values.durationMinutes;
}

function coerceText(raw: FormDataEntryValue | null): string {
  return typeof raw === "string" ? raw : "";
}

export async function generateStaffCoachingAction(
  _prevState: StaffCoachingState,
  formData: FormData,
): Promise<StaffCoachingState> {
  void _prevState;
  void STAFF_COACHING_DURATIONS;

  const values: StaffCoachingFormValues = {
    employeeName: coerceText(formData.get("employeeName")),
    role: coerceRole(formData.get("role")),
    reason: coerceReason(formData.get("reason")),
    situation: coerceText(formData.get("situation")),
    tone: coerceTone(formData.get("tone")),
    durationMinutes: coerceDuration(formData.get("durationMinutes")),
  };

  const baseState: StaffCoachingState = {
    values,
    script: null,
    error: null,
    generatedAt: null,
  };

  const sess = await getSession();
  if (!sess) {
    return {
      ...baseState,
      error: "Bạn cần đăng nhập để dùng tính năng này.",
    };
  }
  if (sess.role !== "admin") {
    return {
      ...baseState,
      error: "Chỉ quản trị viên mới có thể tạo kịch bản huấn luyện.",
    };
  }

  const parsed = validateStaffCoachingInputs(values);
  if (!parsed.ok) {
    return { ...baseState, error: parsed.error };
  }

  try {
    const script = await generateStaffCoachingScript({
      employeeName: parsed.employeeName,
      role: parsed.role,
      reason: parsed.reason,
      situation: parsed.situation,
      tone: parsed.tone,
      durationMinutes: parsed.durationMinutes,
    });
    return {
      values,
      script,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không tạo được kịch bản huấn luyện. Vui lòng thử lại.";
    return { ...baseState, error: message };
  }
}
