"use server";

import { getSession } from "@/lib/auth";
import { generatePlateStyling } from "@/lib/xai";
import {
  BACKGROUND_VALUES,
  DISH_NAME_MAX,
  DISH_NAME_MIN,
  GARNISHES_MAX,
  INITIAL_PLATE_STYLING_STATE,
  MOOD_VALUES,
  PLATE_SHAPE_VALUES,
  type PlateStylingState,
} from "./types";

export async function generatePlateStylingAction(
  prevState: PlateStylingState,
  formData: FormData,
): Promise<PlateStylingState> {
  const rawDish = formData.get("dishName");
  const rawShape = formData.get("plateShape");
  const rawMood = formData.get("mood");
  const rawBackground = formData.get("background");
  const rawGarnishes = formData.get("garnishes");

  const dishName =
    typeof rawDish === "string" ? rawDish.trim().replace(/\s+/g, " ") : "";
  const plateShape = typeof rawShape === "string" ? rawShape : "";
  const mood = typeof rawMood === "string" ? rawMood : "";
  const background =
    typeof rawBackground === "string" ? rawBackground : "";
  const garnishes =
    typeof rawGarnishes === "string"
      ? rawGarnishes.trim().replace(/\s+/g, " ")
      : "";

  const echoState: PlateStylingState = {
    dishName: dishName || prevState.dishName,
    plateShape:
      plateShape ||
      prevState.plateShape ||
      INITIAL_PLATE_STYLING_STATE.plateShape,
    mood: mood || prevState.mood || INITIAL_PLATE_STYLING_STATE.mood,
    background:
      background ||
      prevState.background ||
      INITIAL_PLATE_STYLING_STATE.background,
    garnishes: garnishes || prevState.garnishes,
    result: null,
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
      error: "Chỉ quản trị viên mới có thể tạo concept trình bày món.",
    };
  }

  if (dishName.length < DISH_NAME_MIN) {
    return {
      ...echoState,
      error: `Tên món cần ít nhất ${DISH_NAME_MIN} ký tự.`,
    };
  }
  if (dishName.length > DISH_NAME_MAX) {
    return {
      ...echoState,
      error: `Tên món dài ${dishName.length} ký tự (tối đa ${DISH_NAME_MAX}).`,
    };
  }
  if (!PLATE_SHAPE_VALUES.includes(plateShape)) {
    return { ...echoState, error: "Kiểu đĩa không hợp lệ." };
  }
  if (!MOOD_VALUES.includes(mood)) {
    return { ...echoState, error: "Phong cách trình bày không hợp lệ." };
  }
  if (!BACKGROUND_VALUES.includes(background)) {
    return { ...echoState, error: "Nền chụp không hợp lệ." };
  }
  if (garnishes.length > GARNISHES_MAX) {
    return {
      ...echoState,
      error: `Trang trí dài ${garnishes.length} ký tự (tối đa ${GARNISHES_MAX}).`,
    };
  }

  try {
    const out = await generatePlateStyling({
      dishName,
      plateShape,
      mood,
      background,
      garnishes: garnishes || undefined,
    });
    return {
      dishName,
      plateShape,
      mood,
      background,
      garnishes,
      result: {
        imageBase64: out.imageBase64,
        prompt: out.prompt,
        revisedPrompt: out.revisedPrompt ?? null,
      },
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không tạo được concept trình bày món. Vui lòng thử lại.";
    return { ...echoState, error: message };
  }
}
