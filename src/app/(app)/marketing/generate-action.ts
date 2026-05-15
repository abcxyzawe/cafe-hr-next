"use server";

import { getSession } from "@/lib/auth";
import { generateMarketingCopy } from "@/lib/xai";
import {
  isMarketingTone,
  OFFER_MAX,
  OFFER_MIN,
  TOPIC_MAX,
  TOPIC_MIN,
  type MarketingState,
} from "./marketing-types";

export async function generateMarketingAction(
  _prevState: MarketingState,
  formData: FormData,
): Promise<MarketingState> {
  const rawTopic = formData.get("topic");
  const rawTone = formData.get("tone");
  const rawOffer = formData.get("offer");

  const topic = (typeof rawTopic === "string" ? rawTopic : "").trim();
  const toneStr = typeof rawTone === "string" ? rawTone : "";
  const offer = (typeof rawOffer === "string" ? rawOffer : "").trim();

  const tone = isMarketingTone(toneStr) ? toneStr : "playful";

  const baseState: MarketingState = {
    values: { topic, tone, offer },
    result: null,
    error: null,
  };

  const sess = await getSession();
  if (!sess) {
    return { ...baseState, error: "Bạn cần đăng nhập để dùng tính năng này." };
  }
  if (sess.role !== "admin") {
    return {
      ...baseState,
      error: "Chỉ quản trị viên mới có thể tạo nội dung marketing.",
    };
  }

  if (topic.length < TOPIC_MIN) {
    return {
      ...baseState,
      error: `Chủ đề chiến dịch cần ít nhất ${TOPIC_MIN} ký tự.`,
    };
  }
  if (topic.length > TOPIC_MAX) {
    return {
      ...baseState,
      error: `Chủ đề chiến dịch tối đa ${TOPIC_MAX} ký tự (hiện ${topic.length}).`,
    };
  }
  if (!isMarketingTone(toneStr)) {
    return { ...baseState, error: "Tông giọng không hợp lệ." };
  }
  if (offer.length < OFFER_MIN) {
    return {
      ...baseState,
      error: "Vui lòng nhập ưu đãi hoặc điểm nổi bật.",
    };
  }
  if (offer.length > OFFER_MAX) {
    return {
      ...baseState,
      error: `Ưu đãi tối đa ${OFFER_MAX} ký tự (hiện ${offer.length}).`,
    };
  }

  try {
    const result = await generateMarketingCopy({ topic, tone, offer });
    return {
      values: { topic, tone, offer },
      result,
      error: null,
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không tạo được nội dung marketing. Vui lòng thử lại.";
    return { ...baseState, error: message };
  }
}
