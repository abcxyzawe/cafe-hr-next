"use server";

import { getSession } from "@/lib/auth";
import { analyzeSentiment } from "@/lib/xai";
import {
  MAX_FEEDBACK_LENGTH,
  MIN_FEEDBACK_LENGTH,
  type SentimentFormState,
} from "./sentiment-types";

export async function analyzeSentimentAction(
  prevState: SentimentFormState,
  formData: FormData,
): Promise<SentimentFormState> {
  const rawText = formData.get("text");
  const text = typeof rawText === "string" ? rawText : "";
  const trimmed = text.trim();

  const baseState: SentimentFormState = {
    text,
    analysis: null,
    error: null,
    analyzedAt: null,
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
      error: "Chỉ quản trị viên mới có thể phân tích phản hồi.",
    };
  }

  if (trimmed.length < MIN_FEEDBACK_LENGTH) {
    return {
      ...baseState,
      error: `Phản hồi cần ít nhất ${MIN_FEEDBACK_LENGTH} ký tự (đang có ${trimmed.length}).`,
    };
  }
  if (trimmed.length > MAX_FEEDBACK_LENGTH) {
    return {
      ...baseState,
      error: `Phản hồi tối đa ${MAX_FEEDBACK_LENGTH} ký tự (đang có ${trimmed.length}).`,
    };
  }

  try {
    const analysis = await analyzeSentiment(trimmed);
    return {
      text,
      analysis,
      error: null,
      analyzedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không phân tích được phản hồi. Vui lòng thử lại.";
    return { ...baseState, error: message };
  }
}
