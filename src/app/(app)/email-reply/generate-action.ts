"use server";

import { getSession } from "@/lib/auth";
import { generateEmailReply } from "@/lib/xai";
import {
  EMAIL_REPLY_NAME_MAX,
  EMAIL_REPLY_ORIGINAL_MAX,
  EMAIL_REPLY_ORIGINAL_MIN,
  INITIAL_EMAIL_REPLY_STATE,
  isEmailReplyTone,
  type EmailReplyState,
} from "./email-reply-types";

export async function generateReplyAction(
  prevState: EmailReplyState,
  formData: FormData,
): Promise<EmailReplyState> {
  const rawOriginal = formData.get("original");
  const rawTone = formData.get("tone");
  const rawName = formData.get("customerName");

  const original = typeof rawOriginal === "string" ? rawOriginal.trim() : "";
  const customerName = typeof rawName === "string" ? rawName.trim() : "";
  const tone = isEmailReplyTone(rawTone)
    ? rawTone
    : (prevState.tone ?? INITIAL_EMAIL_REPLY_STATE.tone);

  const baseState: EmailReplyState = {
    original,
    tone,
    customerName,
    reply: null,
    error: null,
    generatedAt: null,
  };

  const sess = await getSession();
  if (!sess) {
    return { ...baseState, error: "Bạn cần đăng nhập để dùng tính năng này." };
  }
  if (sess.role !== "admin") {
    return {
      ...baseState,
      error: "Chỉ quản trị viên mới có thể dùng trợ lý phản hồi email.",
    };
  }

  if (!isEmailReplyTone(rawTone)) {
    return { ...baseState, error: "Tone không hợp lệ." };
  }

  if (original.length < EMAIL_REPLY_ORIGINAL_MIN) {
    return {
      ...baseState,
      error: `Email gốc cần ít nhất ${EMAIL_REPLY_ORIGINAL_MIN} ký tự.`,
    };
  }
  if (original.length > EMAIL_REPLY_ORIGINAL_MAX) {
    return {
      ...baseState,
      error: `Email gốc quá dài (tối đa ${EMAIL_REPLY_ORIGINAL_MAX} ký tự).`,
    };
  }
  if (customerName.length > EMAIL_REPLY_NAME_MAX) {
    return {
      ...baseState,
      error: `Tên khách quá dài (tối đa ${EMAIL_REPLY_NAME_MAX} ký tự).`,
    };
  }

  try {
    const { content } = await generateEmailReply({
      original,
      tone,
      customerName: customerName || undefined,
    });
    return {
      original,
      tone,
      customerName,
      reply: content,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không tạo được phản hồi. Vui lòng thử lại.";
    return { ...baseState, error: message };
  }
}
