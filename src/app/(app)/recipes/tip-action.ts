"use server";

import { getSession } from "@/lib/auth";
import { generateBrewingTip } from "@/lib/xai";
import { getRecipeById } from "@/lib/recipe-catalogue";

export type TipResult =
  | { ok: true; tip: string }
  | { ok: false; error: string };

export async function getBrewingTipAction(
  recipeId: string,
): Promise<TipResult> {
  const sess = await getSession();
  if (!sess) {
    return { ok: false, error: "Bạn cần đăng nhập để xem mẹo pha chế." };
  }

  const recipe = getRecipeById(recipeId);
  if (!recipe) {
    return { ok: false, error: "Không tìm thấy công thức yêu cầu." };
  }

  const context =
    `Độ khó: ${recipe.difficulty}. ` +
    `Tỉ lệ: ${recipe.ratio}. ` +
    `Thời gian chiết: ${recipe.brewTimeSeconds}s. ` +
    `Dụng cụ: ${recipe.equipment.join(", ")}.`;

  try {
    const { content } = await generateBrewingTip(recipe.name, context);
    return { ok: true, tip: content };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Không lấy được mẹo từ AI.";
    return { ok: false, error: message };
  }
}
