"use server";

import { getSession } from "@/lib/auth";
import { generateLogoConcepts } from "@/lib/xai";
import {
  INITIAL_LOGO_STATE,
  SYMBOL_VALUES,
  VIBE_VALUES,
  type LogoState,
} from "./logo-types";

export async function generateLogoAction(
  prevState: LogoState,
  formData: FormData,
): Promise<LogoState> {
  const rawName = formData.get("cafeName");
  const rawVibe = formData.get("vibe");
  const rawSymbol = formData.get("symbol");

  const cafeName = typeof rawName === "string" ? rawName.trim() : "";
  const vibe = typeof rawVibe === "string" ? rawVibe : "";
  const symbol = typeof rawSymbol === "string" ? rawSymbol : "";

  const echoState: LogoState = {
    cafeName: cafeName || prevState.cafeName,
    vibe: vibe || prevState.vibe || INITIAL_LOGO_STATE.vibe,
    symbol: symbol || prevState.symbol || INITIAL_LOGO_STATE.symbol,
    result: null,
    requested: 3,
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
      error: "Chỉ quản trị viên mới có thể sinh logo concept.",
    };
  }

  if (cafeName.length < 2 || cafeName.length > 30) {
    return { ...echoState, error: "Tên quán phải từ 2 đến 30 ký tự." };
  }
  if (!VIBE_VALUES.includes(vibe)) {
    return { ...echoState, error: "Vibe không hợp lệ." };
  }
  if (!SYMBOL_VALUES.includes(symbol)) {
    return { ...echoState, error: "Loại biểu tượng không hợp lệ." };
  }

  try {
    const result = await generateLogoConcepts({ cafeName, vibe, symbol });
    return {
      cafeName,
      vibe,
      symbol,
      result,
      requested: 3,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không sinh được logo. Vui lòng thử lại.";
    return { ...echoState, error: message };
  }
}
