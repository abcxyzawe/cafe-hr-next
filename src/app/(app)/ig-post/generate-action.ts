"use server";

import { getSession } from "@/lib/auth";
import { generateIgPost } from "@/lib/xai";
import {
  DEFAULT_ACCENT,
  INITIAL_IG_POST_STATE,
  OVERLAY_MAX,
  TOPIC_MAX,
  TOPIC_MIN,
  VIBE_VALUES,
  isValidHex,
  type IgPostState,
} from "./ig-post-types";

export async function generateIgPostAction(
  prevState: IgPostState,
  formData: FormData,
): Promise<IgPostState> {
  const rawTopic = formData.get("topic");
  const rawVibe = formData.get("vibe");
  const rawAccent = formData.get("accent");
  const rawOverlay = formData.get("overlay");

  const topic =
    typeof rawTopic === "string" ? rawTopic.trim().replace(/\s+/g, " ") : "";
  const vibe = typeof rawVibe === "string" ? rawVibe : "";
  const accentInput = typeof rawAccent === "string" ? rawAccent.trim() : "";
  const overlay =
    typeof rawOverlay === "string" ? rawOverlay.trim().replace(/\s+/g, " ") : "";

  const accent = isValidHex(accentInput) ? accentInput.toLowerCase() : "";

  const echoState: IgPostState = {
    topic: topic || prevState.topic,
    vibe: vibe || prevState.vibe || INITIAL_IG_POST_STATE.vibe,
    accent: accent || prevState.accent || DEFAULT_ACCENT,
    overlay: overlay || prevState.overlay,
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
      error: "Chỉ quản trị viên mới có thể tạo IG post.",
    };
  }

  if (topic.length < TOPIC_MIN) {
    return {
      ...echoState,
      error: `Chủ đề IG post cần ít nhất ${TOPIC_MIN} ký tự.`,
    };
  }
  if (topic.length > TOPIC_MAX) {
    return {
      ...echoState,
      error: `Chủ đề IG post dài ${topic.length} ký tự (tối đa ${TOPIC_MAX}).`,
    };
  }
  if (!VIBE_VALUES.includes(vibe as (typeof VIBE_VALUES)[number])) {
    return { ...echoState, error: "Vibe không hợp lệ." };
  }
  if (!isValidHex(accentInput)) {
    return { ...echoState, error: "Mã màu nhấn không hợp lệ (cần dạng #rrggbb)." };
  }
  if (overlay.length > OVERLAY_MAX) {
    return {
      ...echoState,
      error: `Overlay text dài ${overlay.length} ký tự (tối đa ${OVERLAY_MAX}).`,
    };
  }

  try {
    const { url } = await generateIgPost({ topic, vibe });
    return {
      topic,
      vibe,
      accent,
      overlay,
      imageUrl: url,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không tạo được IG post. Vui lòng thử lại.";
    return { ...echoState, error: message };
  }
}
