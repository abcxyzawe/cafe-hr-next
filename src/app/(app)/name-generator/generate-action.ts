"use server";

import { getSession } from "@/lib/auth";
import { generateCafeNames } from "@/lib/xai";
import {
  INITIAL_CAFE_NAME_STATE,
  isCafeNameStyle,
  isCafeNameVibe,
  parseHintsRaw,
  type CafeNameState,
} from "./name-types";

export async function generateNamesAction(
  prevState: CafeNameState,
  formData: FormData,
): Promise<CafeNameState> {
  const rawVibe = formData.get("vibe");
  const rawStyle = formData.get("style");
  const rawHints = formData.get("hints");
  const hintsRaw = typeof rawHints === "string" ? rawHints : "";

  const vibe = isCafeNameVibe(rawVibe)
    ? rawVibe
    : prevState.vibe ?? INITIAL_CAFE_NAME_STATE.vibe;
  const style = isCafeNameStyle(rawStyle)
    ? rawStyle
    : prevState.style ?? INITIAL_CAFE_NAME_STATE.style;

  const baseState: CafeNameState = {
    vibe,
    style,
    hintsRaw,
    names: null,
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
      error: "Chỉ quản trị viên mới có thể tạo tên quán.",
    };
  }

  if (!isCafeNameVibe(rawVibe)) {
    return { ...baseState, error: "Vibe không hợp lệ." };
  }
  if (!isCafeNameStyle(rawStyle)) {
    return { ...baseState, error: "Phong cách ngôn ngữ không hợp lệ." };
  }

  const hints = parseHintsRaw(hintsRaw);

  try {
    const { names } = await generateCafeNames({ vibe, style, hints });
    return {
      vibe,
      style,
      hintsRaw,
      names,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không tạo được tên quán. Vui lòng thử lại.";
    return { ...baseState, error: message };
  }
}
