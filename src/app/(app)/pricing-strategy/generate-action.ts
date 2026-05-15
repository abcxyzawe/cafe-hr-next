"use server";

import { getSession } from "@/lib/auth";
import { generatePricingStrategy } from "@/lib/xai";
import {
  INITIAL_PRICING_STATE,
  validatePricingInputs,
  type PricingFormValues,
  type PricingState,
} from "./pricing-types";

function readField(formData: FormData, key: string, fallback: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : fallback;
}

export async function generatePricingAction(
  prevState: PricingState,
  formData: FormData,
): Promise<PricingState> {
  const prev = prevState.values ?? INITIAL_PRICING_STATE.values;

  const values: PricingFormValues = {
    costPerCupVnd: readField(formData, "costPerCupVnd", prev.costPerCupVnd),
    competitorAvgVnd: readField(
      formData,
      "competitorAvgVnd",
      prev.competitorAvgVnd,
    ),
    targetMarginPct: readField(
      formData,
      "targetMarginPct",
      prev.targetMarginPct,
    ),
    itemsRaw: readField(formData, "itemsRaw", prev.itemsRaw),
  };

  const baseState: PricingState = {
    values,
    costPerCupVnd: null,
    competitorAvgVnd: null,
    targetMarginPct: null,
    items: [],
    suggestions: null,
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
      error: "Chỉ quản trị viên mới có thể tạo gợi ý giá.",
    };
  }

  const parsed = validatePricingInputs(values);
  if (!parsed.ok) {
    return { ...baseState, error: parsed.error };
  }

  try {
    const { suggestions } = await generatePricingStrategy({
      costPerCupVnd: parsed.costPerCupVnd,
      competitorAvgVnd: parsed.competitorAvgVnd,
      targetMarginPct: parsed.targetMarginPct,
      items: parsed.items,
    });
    return {
      values,
      costPerCupVnd: parsed.costPerCupVnd,
      competitorAvgVnd: parsed.competitorAvgVnd,
      targetMarginPct: parsed.targetMarginPct,
      items: parsed.items,
      suggestions,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không tạo được gợi ý giá. Vui lòng thử lại.";
    return { ...baseState, error: message };
  }
}
