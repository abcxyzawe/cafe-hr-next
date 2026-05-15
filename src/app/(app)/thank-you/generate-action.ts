"use server";

import { getSession } from "@/lib/auth";
import { generateThankYouMessages } from "@/lib/xai";
import {
  INITIAL_THANK_YOU_STATE,
  THANK_YOU_NAME_MAX,
  isThankYouChannel,
  isThankYouContext,
  type ThankYouState,
} from "./thank-you-types";

export async function generateThankYouAction(
  prevState: ThankYouState,
  formData: FormData,
): Promise<ThankYouState> {
  const rawContext = formData.get("context");
  const rawName = formData.get("customerName");
  const rawChannel = formData.get("channel");

  const customerName = typeof rawName === "string" ? rawName.trim() : "";
  const context = isThankYouContext(rawContext)
    ? rawContext
    : (prevState.context ?? INITIAL_THANK_YOU_STATE.context);
  const channel = isThankYouChannel(rawChannel)
    ? rawChannel
    : (prevState.channel ?? INITIAL_THANK_YOU_STATE.channel);

  const baseState: ThankYouState = {
    context,
    customerName,
    channel,
    messages: null,
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
      error: "Chỉ quản trị viên mới có thể tạo lời cảm ơn AI.",
    };
  }

  if (!isThankYouContext(rawContext)) {
    return { ...baseState, error: "Ngữ cảnh không hợp lệ." };
  }
  if (!isThankYouChannel(rawChannel)) {
    return { ...baseState, error: "Kênh gửi không hợp lệ." };
  }
  if (customerName.length > THANK_YOU_NAME_MAX) {
    return {
      ...baseState,
      error: `Tên khách quá dài (tối đa ${THANK_YOU_NAME_MAX} ký tự).`,
    };
  }

  try {
    const { messages } = await generateThankYouMessages({
      context,
      customerName,
      channel,
    });
    return {
      context,
      customerName,
      channel,
      messages,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không tạo được lời cảm ơn. Vui lòng thử lại.";
    return { ...baseState, error: message };
  }
}
