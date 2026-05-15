"use server";

import { getSession } from "@/lib/auth";
import { generateTrainingScript } from "@/lib/xai";
import type { TrainingFormState } from "./training-types";

const ROLE_VALUES = ["barista", "server", "cashier", "manager"] as const;
const EXPERIENCE_VALUES = ["novice", "experienced"] as const;
const DURATION_VALUES = ["1day", "3day", "1week"] as const;

type RoleValue = (typeof ROLE_VALUES)[number];
type ExperienceValue = (typeof EXPERIENCE_VALUES)[number];
type DurationValue = (typeof DURATION_VALUES)[number];

function isRole(value: string): value is RoleValue {
  return (ROLE_VALUES as readonly string[]).includes(value);
}

function isExperience(value: string): value is ExperienceValue {
  return (EXPERIENCE_VALUES as readonly string[]).includes(value);
}

function isDuration(value: string): value is DurationValue {
  return (DURATION_VALUES as readonly string[]).includes(value);
}

export async function generateTrainingAction(
  _prevState: TrainingFormState,
  formData: FormData,
): Promise<TrainingFormState> {
  const rawRole = formData.get("role");
  const rawExperience = formData.get("experience");
  const rawDuration = formData.get("duration");

  const role = typeof rawRole === "string" ? rawRole.trim() : "";
  const experience =
    typeof rawExperience === "string" ? rawExperience.trim() : "";
  const duration = typeof rawDuration === "string" ? rawDuration.trim() : "";

  const baseState: TrainingFormState = {
    role,
    experience,
    duration,
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
      error: "Chỉ quản trị viên mới có thể tạo lộ trình đào tạo.",
    };
  }

  if (!isRole(role)) {
    return { ...baseState, error: "Vai trò không hợp lệ." };
  }
  if (!isExperience(experience)) {
    return { ...baseState, error: "Mức kinh nghiệm không hợp lệ." };
  }
  if (!isDuration(duration)) {
    return { ...baseState, error: "Thời lượng đào tạo không hợp lệ." };
  }

  try {
    const { content } = await generateTrainingScript({
      role,
      experience,
      duration,
    });
    return {
      role,
      experience,
      duration,
      content,
      error: null,
    };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Không tạo được lộ trình đào tạo.";
    return { ...baseState, error: message };
  }
}
