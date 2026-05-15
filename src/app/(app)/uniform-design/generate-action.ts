"use server";

import { getSession } from "@/lib/auth";
import { generateUniformConcepts } from "@/lib/xai";
import {
  DEFAULT_DOMINANT_COLOR,
  INITIAL_UNIFORM_STATE,
  ROLE_VALUES,
  STYLE_VALUES,
  type UniformState,
} from "./uniform-types";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export async function generateUniformAction(
  prevState: UniformState,
  formData: FormData,
): Promise<UniformState> {
  const rawRole = formData.get("role");
  const rawStyle = formData.get("style");
  const rawColor = formData.get("dominantColor");

  const role = typeof rawRole === "string" ? rawRole : "";
  const style = typeof rawStyle === "string" ? rawStyle : "";
  const dominantColorRaw =
    typeof rawColor === "string" ? rawColor.trim() : "";
  const dominantColor = dominantColorRaw || prevState.dominantColor;

  const echoState: UniformState = {
    role: role || prevState.role || INITIAL_UNIFORM_STATE.role,
    style: style || prevState.style || INITIAL_UNIFORM_STATE.style,
    dominantColor: dominantColor || DEFAULT_DOMINANT_COLOR,
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
      error: "Chỉ quản trị viên mới có thể sinh concept đồng phục.",
    };
  }

  if (!ROLE_VALUES.includes(role)) {
    return { ...echoState, error: "Vai trò không hợp lệ." };
  }
  if (!STYLE_VALUES.includes(style)) {
    return { ...echoState, error: "Phong cách không hợp lệ." };
  }
  if (!HEX_RE.test(dominantColor)) {
    return {
      ...echoState,
      error: "Mã màu chủ đạo phải dạng #RRGGBB (ví dụ: #6f4e37).",
    };
  }

  try {
    const result = await generateUniformConcepts({
      role,
      style,
      dominantColor,
    });
    return {
      role,
      style,
      dominantColor,
      result,
      requested: 3,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không sinh được concept đồng phục. Vui lòng thử lại.";
    return { ...echoState, error: message };
  }
}
