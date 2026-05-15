"use server";

import { getSession } from "@/lib/auth";
import { generateFaq } from "@/lib/xai";
import {
  FAQ_TOPIC_MAX,
  FAQ_TOPIC_MIN,
  isFaqFormality,
  type FaqGeneratorState,
} from "./faq-types";

export async function generateFaqAction(
  _prevState: FaqGeneratorState,
  formData: FormData,
): Promise<FaqGeneratorState> {
  const rawTopic = formData.get("topic");
  const rawFormality = formData.get("formality");
  const topic = typeof rawTopic === "string" ? rawTopic.trim() : "";
  const formality = isFaqFormality(rawFormality) ? rawFormality : "friendly";

  const baseState: FaqGeneratorState = {
    topic,
    formality,
    items: null,
    error: null,
  };

  const sess = await getSession();
  if (!sess) {
    return { ...baseState, error: "Bạn cần đăng nhập để dùng tính năng này." };
  }
  if (sess.role !== "admin") {
    return {
      ...baseState,
      error: "Chỉ quản trị viên mới có thể tạo FAQ.",
    };
  }

  if (topic.length < FAQ_TOPIC_MIN || topic.length > FAQ_TOPIC_MAX) {
    return {
      ...baseState,
      error: `Chủ đề cần ${FAQ_TOPIC_MIN}-${FAQ_TOPIC_MAX} ký tự (hiện ${topic.length}).`,
    };
  }
  if (!isFaqFormality(rawFormality)) {
    return { ...baseState, error: "Giọng văn không hợp lệ." };
  }

  try {
    const { items } = await generateFaq({ topic, formality });
    return { topic, formality, items, error: null };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Không tạo được FAQ. Vui lòng thử lại.";
    return { ...baseState, error: message };
  }
}
