"use server";

import { getSession } from "@/lib/auth";
import { generateCafePoster } from "@/lib/xai";
import {
  COLOR_MOOD_VALUES,
  HEADLINE_MAX,
  INITIAL_POSTER_STATE,
  STYLE_VALUES,
  TOPIC_MAX,
  TOPIC_MIN,
  type PosterState,
} from "./poster-types";

export async function generatePosterAction(
  prevState: PosterState,
  formData: FormData,
): Promise<PosterState> {
  const rawTopic = formData.get("topic");
  const rawStyle = formData.get("style");
  const rawColor = formData.get("colorMood");
  const rawHeadline = formData.get("headline");

  const topic =
    typeof rawTopic === "string" ? rawTopic.trim().replace(/\s+/g, " ") : "";
  const style = typeof rawStyle === "string" ? rawStyle : "";
  const colorMood = typeof rawColor === "string" ? rawColor : "";
  const headline =
    typeof rawHeadline === "string"
      ? rawHeadline.trim().replace(/\s+/g, " ")
      : "";

  const echoState: PosterState = {
    topic: topic || prevState.topic,
    style: style || prevState.style || INITIAL_POSTER_STATE.style,
    colorMood:
      colorMood || prevState.colorMood || INITIAL_POSTER_STATE.colorMood,
    headline: headline || prevState.headline,
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
      error: "Chỉ quản trị viên mới có thể tạo poster.",
    };
  }

  if (topic.length < TOPIC_MIN) {
    return {
      ...echoState,
      error: `Chủ đề poster cần ít nhất ${TOPIC_MIN} ký tự.`,
    };
  }
  if (topic.length > TOPIC_MAX) {
    return {
      ...echoState,
      error: `Chủ đề poster dài ${topic.length} ký tự (tối đa ${TOPIC_MAX}).`,
    };
  }
  if (!STYLE_VALUES.includes(style as (typeof STYLE_VALUES)[number])) {
    return { ...echoState, error: "Phong cách không hợp lệ." };
  }
  if (
    !COLOR_MOOD_VALUES.includes(colorMood as (typeof COLOR_MOOD_VALUES)[number])
  ) {
    return { ...echoState, error: "Tông màu không hợp lệ." };
  }
  if (headline.length > HEADLINE_MAX) {
    return {
      ...echoState,
      error: `Headline dài ${headline.length} ký tự (tối đa ${HEADLINE_MAX}).`,
    };
  }

  try {
    const { url } = await generateCafePoster({ topic, style, colorMood });
    return {
      topic,
      style,
      colorMood,
      headline,
      imageUrl: url,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không tạo được poster. Vui lòng thử lại.";
    return { ...echoState, error: message };
  }
}
