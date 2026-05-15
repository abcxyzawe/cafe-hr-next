"use server";

import { getSession } from "@/lib/auth";
import { generateSocialContent } from "@/lib/xai";
import {
  INITIAL_SOCIAL_CONTENT_STATE,
  isSocialTone,
  type SocialContentState,
} from "./social-content-types";

export async function generateSocialContentAction(
  prevState: SocialContentState,
  formData: FormData,
): Promise<SocialContentState> {
  const rawTopic = formData.get("topic");
  const rawTone = formData.get("tone");
  const topic = typeof rawTopic === "string" ? rawTopic.trim() : "";
  const toneRaw = typeof rawTone === "string" ? rawTone.trim() : "";

  const baseState: SocialContentState = {
    ...INITIAL_SOCIAL_CONTENT_STATE,
    topic,
    tone: isSocialTone(toneRaw) ? toneRaw : prevState.tone,
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
      error: "Chỉ quản trị viên mới có thể tạo nội dung social.",
    };
  }

  if (topic.length < 5 || topic.length > 200) {
    return {
      ...baseState,
      error: "Chủ đề phải dài 5-200 ký tự.",
    };
  }

  if (!isSocialTone(toneRaw)) {
    return {
      ...baseState,
      error: "Tông giọng không hợp lệ.",
    };
  }

  try {
    const result = await generateSocialContent({ topic, tone: toneRaw });
    return {
      topic,
      tone: toneRaw,
      result,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không tạo được nội dung social. Vui lòng thử lại.";
    return { ...baseState, error: message };
  }
}
