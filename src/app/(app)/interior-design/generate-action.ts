"use server";

import { getSession } from "@/lib/auth";
import { generateInteriorConcepts } from "@/lib/xai";
import {
  BUDGET_VALUES,
  INITIAL_INTERIOR_STATE,
  SPACE_VALUES,
  STYLE_VALUES,
  type InteriorState,
} from "./interior-types";

export async function generateInteriorAction(
  prevState: InteriorState,
  formData: FormData,
): Promise<InteriorState> {
  const rawStyle = formData.get("style");
  const rawBudget = formData.get("budget");
  const rawSpace = formData.get("spaceSize");

  const style = typeof rawStyle === "string" ? rawStyle : "";
  const budget = typeof rawBudget === "string" ? rawBudget : "";
  const spaceSize = typeof rawSpace === "string" ? rawSpace : "";

  const echoState: InteriorState = {
    style: style || prevState.style || INITIAL_INTERIOR_STATE.style,
    budget: budget || prevState.budget || INITIAL_INTERIOR_STATE.budget,
    spaceSize:
      spaceSize || prevState.spaceSize || INITIAL_INTERIOR_STATE.spaceSize,
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
      error: "Chỉ quản trị viên mới có thể sinh concept nội thất.",
    };
  }

  if (!STYLE_VALUES.includes(style as (typeof STYLE_VALUES)[number])) {
    return { ...echoState, error: "Phong cách không hợp lệ." };
  }
  if (!BUDGET_VALUES.includes(budget as (typeof BUDGET_VALUES)[number])) {
    return { ...echoState, error: "Mức ngân sách không hợp lệ." };
  }
  if (!SPACE_VALUES.includes(spaceSize as (typeof SPACE_VALUES)[number])) {
    return { ...echoState, error: "Diện tích không hợp lệ." };
  }

  try {
    const result = await generateInteriorConcepts({ style, budget, spaceSize });
    return {
      style,
      budget,
      spaceSize,
      result,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không sinh được concept. Vui lòng thử lại.";
    return { ...echoState, error: message };
  }
}
