"use server";

import { getSession } from "@/lib/auth";
import { generatePwaIcon } from "@/lib/xai";
import {
  HEX_COLOR_PATTERN,
  INITIAL_PWA_ICON_STATE,
  PWA_ICON_STYLE_VALUES,
  type PwaIconState,
} from "./pwa-icon-types";

export async function generatePwaIconAction(
  prevState: PwaIconState,
  formData: FormData,
): Promise<PwaIconState> {
  const rawInitial = formData.get("initial");
  const rawStyle = formData.get("style");
  const rawColor = formData.get("backgroundColor");

  const initial = typeof rawInitial === "string" ? rawInitial.trim() : "";
  const style = typeof rawStyle === "string" ? rawStyle : "";
  const backgroundColor =
    typeof rawColor === "string" ? rawColor.trim() : "";

  const echoState: PwaIconState = {
    initial: initial || prevState.initial,
    style: style || prevState.style || INITIAL_PWA_ICON_STATE.style,
    backgroundColor:
      backgroundColor ||
      prevState.backgroundColor ||
      INITIAL_PWA_ICON_STATE.backgroundColor,
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
      error: "Chỉ quản trị viên mới có thể tạo icon PWA.",
    };
  }

  if (initial.length < 1 || initial.length > 3) {
    return { ...echoState, error: "Initial phải có 1 đến 3 ký tự." };
  }
  if (!PWA_ICON_STYLE_VALUES.includes(style)) {
    return { ...echoState, error: "Style không hợp lệ." };
  }
  if (!HEX_COLOR_PATTERN.test(backgroundColor)) {
    return {
      ...echoState,
      error: "Màu nền phải ở dạng hex 6 ký tự, ví dụ #6f4e37.",
    };
  }

  try {
    const result = await generatePwaIcon({ initial, style, backgroundColor });
    return {
      initial,
      style,
      backgroundColor,
      imageUrl: result.url,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không tạo được icon. Vui lòng thử lại.";
    return { ...echoState, error: message };
  }
}
