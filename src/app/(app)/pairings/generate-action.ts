"use server";

import { getSession } from "@/lib/auth";
import { generatePairings } from "@/lib/xai";
import {
  INITIAL_PAIRINGS_STATE,
  isPairingMood,
  type PairingsState,
} from "./pairings-types";

export async function generatePairingsAction(
  prevState: PairingsState,
  formData: FormData,
): Promise<PairingsState> {
  const rawDrink = formData.get("drinkName");
  const rawMood = formData.get("mood");

  const drinkName =
    typeof rawDrink === "string" ? rawDrink.trim() : prevState.drinkName;
  const mood = isPairingMood(rawMood)
    ? rawMood
    : (prevState.mood ?? INITIAL_PAIRINGS_STATE.mood);

  const baseState: PairingsState = {
    drinkName,
    mood,
    pairings: null,
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
      error: "Chỉ quản trị viên mới có thể gợi ý món kèm.",
    };
  }

  if (drinkName.length < 2 || drinkName.length > 60) {
    return {
      ...baseState,
      error: "Tên đồ uống cần 2-60 ký tự.",
    };
  }
  if (!isPairingMood(rawMood)) {
    return { ...baseState, error: "Tâm trạng khách không hợp lệ." };
  }

  try {
    const { pairings } = await generatePairings({ drinkName, mood });
    return {
      drinkName,
      mood,
      pairings,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không tạo được gợi ý món kèm. Vui lòng thử lại.";
    return { ...baseState, error: message };
  }
}
