"use server";

import { getSession } from "@/lib/auth";
import { generateGreetingImage, generateGreetingMessage } from "@/lib/xai";
import {
  INITIAL_GREETING_CARD_STATE,
  OCCASION_VALUES,
  RECIPIENT_MAX,
  RECIPIENT_MIN,
  TONE_VALUES,
  type GreetingCardState,
} from "./greeting-card-types";

export async function generateGreetingCardAction(
  prevState: GreetingCardState,
  formData: FormData,
): Promise<GreetingCardState> {
  const rawOccasion = formData.get("occasion");
  const rawRecipient = formData.get("recipientName");
  const rawTone = formData.get("tone");

  const occasion = typeof rawOccasion === "string" ? rawOccasion : "";
  const recipientName =
    typeof rawRecipient === "string"
      ? rawRecipient.trim().replace(/\s+/g, " ")
      : "";
  const tone = typeof rawTone === "string" ? rawTone : "";

  const echoState: GreetingCardState = {
    occasion: occasion || prevState.occasion || INITIAL_GREETING_CARD_STATE.occasion,
    recipientName,
    tone: tone || prevState.tone || INITIAL_GREETING_CARD_STATE.tone,
    message: null,
    imageUrl: null,
    error: null,
    generatedAt: null,
  };

  const sess = await getSession();
  if (!sess) {
    return {
      ...echoState,
      error: "Bạn cần đăng nhập để dùng tính năng này.",
    };
  }
  if (sess.role !== "admin") {
    return {
      ...echoState,
      error: "Chỉ quản trị viên mới có thể tạo thiệp.",
    };
  }

  if (!OCCASION_VALUES.includes(occasion as (typeof OCCASION_VALUES)[number])) {
    return { ...echoState, error: "Dịp không hợp lệ." };
  }
  if (!TONE_VALUES.includes(tone as (typeof TONE_VALUES)[number])) {
    return { ...echoState, error: "Giọng văn không hợp lệ." };
  }
  if (recipientName.length > 0 && recipientName.length < RECIPIENT_MIN) {
    return {
      ...echoState,
      error: `Tên người nhận cần ít nhất ${RECIPIENT_MIN} ký tự.`,
    };
  }
  if (recipientName.length > RECIPIENT_MAX) {
    return {
      ...echoState,
      error: `Tên người nhận dài ${recipientName.length} ký tự (tối đa ${RECIPIENT_MAX}).`,
    };
  }

  try {
    const [messageResult, imageResult] = await Promise.all([
      generateGreetingMessage({ occasion, recipientName, tone }),
      generateGreetingImage({ occasion, tone }),
    ]);

    return {
      occasion,
      recipientName,
      tone,
      message: messageResult.content,
      imageUrl: imageResult.url,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không tạo được thiệp. Vui lòng thử lại.";
    return { ...echoState, error: message };
  }
}
