"use server";

import { getSession } from "@/lib/auth";
import { generatePodcastScript } from "@/lib/xai";
import {
  INITIAL_PODCAST_SCRIPT_STATE,
  isPodcastDuration,
  isPodcastStyle,
  type PodcastScriptFormState,
} from "./podcast-script-types";

function readString(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

export async function generatePodcastScriptAction(
  prevState: PodcastScriptFormState,
  formData: FormData,
): Promise<PodcastScriptFormState> {
  const topic = readString(formData, "topic").trim();
  const hostName = readString(formData, "hostName").trim();
  const rawDuration = formData.get("duration");
  const rawStyle = formData.get("style");

  const duration = isPodcastDuration(rawDuration)
    ? rawDuration
    : prevState.duration ?? INITIAL_PODCAST_SCRIPT_STATE.duration;
  const style = isPodcastStyle(rawStyle)
    ? rawStyle
    : prevState.style ?? INITIAL_PODCAST_SCRIPT_STATE.style;

  const echo: PodcastScriptFormState = {
    topic,
    duration,
    style,
    hostName,
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
      error: "Chỉ quản trị viên mới có thể tạo kịch bản podcast.",
    };
  }

  if (topic.length < 5 || topic.length > 200) {
    return { ...echo, error: "Chủ đề phải có độ dài 5-200 ký tự." };
  }
  if (!isPodcastDuration(rawDuration)) {
    return { ...echo, error: "Thời lượng không hợp lệ." };
  }
  if (!isPodcastStyle(rawStyle)) {
    return { ...echo, error: "Phong cách không hợp lệ." };
  }
  if (hostName.length > 60) {
    return { ...echo, error: "Tên host tối đa 60 ký tự." };
  }

  try {
    const data = await generatePodcastScript({
      topic,
      duration,
      style,
      hostName,
    });
    return {
      topic,
      duration,
      style,
      hostName,
      data,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không tạo được kịch bản podcast. Vui lòng thử lại.";
    return { ...echo, error: message };
  }
}
