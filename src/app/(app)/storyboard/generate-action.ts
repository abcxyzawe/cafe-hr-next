"use server";

import { getSession } from "@/lib/auth";
import { generateStoryboard } from "@/lib/xai";
import {
  INITIAL_STORYBOARD_STATE,
  isStoryboardDuration,
  isStoryboardStyle,
  type StoryboardFormState,
} from "./storyboard-types";

function readString(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

export async function generateStoryboardAction(
  prevState: StoryboardFormState,
  formData: FormData,
): Promise<StoryboardFormState> {
  const concept = readString(formData, "concept").trim();
  const rawDuration = formData.get("duration");
  const rawStyle = formData.get("style");

  const duration = isStoryboardDuration(rawDuration)
    ? rawDuration
    : prevState.duration ?? INITIAL_STORYBOARD_STATE.duration;
  const style = isStoryboardStyle(rawStyle)
    ? rawStyle
    : prevState.style ?? INITIAL_STORYBOARD_STATE.style;

  const echo: StoryboardFormState = {
    concept,
    duration,
    style,
    data: null,
    error: null,
    generatedAt: null,
  };

  const sess = await getSession();
  if (!sess) {
    return { ...echo, error: "Bạn cần đăng nhập để dùng tính năng này." };
  }
  if (sess.role !== "admin") {
    return {
      ...echo,
      error: "Chỉ quản trị viên mới có thể tạo storyboard.",
    };
  }

  if (concept.length < 5 || concept.length > 200) {
    return { ...echo, error: "Ý tưởng phải có độ dài 5-200 ký tự." };
  }
  if (!isStoryboardDuration(rawDuration)) {
    return { ...echo, error: "Thời lượng không hợp lệ." };
  }
  if (!isStoryboardStyle(rawStyle)) {
    return { ...echo, error: "Phong cách không hợp lệ." };
  }

  try {
    const data = await generateStoryboard({ concept, duration, style });
    return {
      concept,
      duration,
      style,
      data,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không tạo được storyboard. Vui lòng thử lại.";
    return { ...echo, error: message };
  }
}
