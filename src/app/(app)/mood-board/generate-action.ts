"use server";

import { getSession } from "@/lib/auth";
import { generateMoodBoard } from "@/lib/xai";
import {
  INITIAL_MOOD_BOARD_STATE,
  THEME_OPTIONS,
  THEME_VALUES,
  parseKeywords,
  type MoodBoardState,
} from "./mood-board-types";

export async function generateMoodBoardAction(
  prevState: MoodBoardState,
  formData: FormData,
): Promise<MoodBoardState> {
  const rawTheme = formData.get("theme");
  const rawKeywords = formData.get("keywords");

  const theme = typeof rawTheme === "string" ? rawTheme : "";
  const keywordsRaw = typeof rawKeywords === "string" ? rawKeywords : "";

  const echoState: MoodBoardState = {
    theme: theme || prevState.theme || INITIAL_MOOD_BOARD_STATE.theme,
    keywordsRaw: keywordsRaw || prevState.keywordsRaw,
    result: null,
    requested: 4,
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
      error: "Chỉ quản trị viên mới có thể tạo mood board.",
    };
  }

  if (!THEME_VALUES.includes(theme)) {
    return { ...echoState, error: "Chủ đề aesthetic không hợp lệ." };
  }

  const keywords = parseKeywords(keywordsRaw);
  if (keywords.length < 1 || keywords.length > 5) {
    return {
      ...echoState,
      error: "Nhập 1-5 từ khoá, ngăn cách bằng dấu phẩy.",
    };
  }
  for (const k of keywords) {
    if (k.length < 2 || k.length > 30) {
      return {
        ...echoState,
        error: `Từ khoá '${k}' phải dài 2-30 ký tự (hiện ${k.length}).`,
      };
    }
  }

  const themeOpt = THEME_OPTIONS.find((o) => o.value === theme);
  const themePrompt = themeOpt ? themeOpt.prompt : theme;

  try {
    const result = await generateMoodBoard({ theme: themePrompt, keywords });
    return {
      theme,
      keywordsRaw,
      result,
      requested: 4,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không tạo được mood board. Vui lòng thử lại.";
    return { ...echoState, error: message };
  }
}
