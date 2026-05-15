import type { PricingSuggestion } from "@/lib/xai";

export const COST_PER_CUP_MIN = 1000;
export const COST_PER_CUP_MAX = 50000;
export const COMPETITOR_AVG_MIN = 5000;
export const COMPETITOR_AVG_MAX = 200000;
export const TARGET_MARGIN_MIN = 40;
export const TARGET_MARGIN_MAX = 90;
export const MAX_ITEMS = 5;
export const MIN_ITEM_LEN = 2;
export const MAX_ITEM_LEN = 50;

export type PricingFormValues = {
  costPerCupVnd: string;
  competitorAvgVnd: string;
  targetMarginPct: string;
  itemsRaw: string;
};

export type PricingState = {
  values: PricingFormValues;
  costPerCupVnd: number | null;
  competitorAvgVnd: number | null;
  targetMarginPct: number | null;
  items: string[];
  suggestions: PricingSuggestion[] | null;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_PRICING_STATE: PricingState = {
  values: {
    costPerCupVnd: "12000",
    competitorAvgVnd: "35000",
    targetMarginPct: "65",
    itemsRaw: "Cà phê sữa đá\nBạc xỉu\nMatcha latte\nTrà đào cam sả\nCold brew",
  },
  costPerCupVnd: null,
  competitorAvgVnd: null,
  targetMarginPct: null,
  items: [],
  suggestions: null,
  error: null,
  generatedAt: null,
};

/**
 * Split a free-text items field by newlines OR commas, trim, drop empties.
 * Preserves ordering.
 */
export function splitItems(raw: string): string[] {
  if (typeof raw !== "string") return [];
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export type PricingValidationOk = {
  ok: true;
  costPerCupVnd: number;
  competitorAvgVnd: number;
  targetMarginPct: number;
  items: string[];
};

export type PricingValidationErr = {
  ok: false;
  error: string;
};

export function validatePricingInputs(
  values: PricingFormValues,
): PricingValidationOk | PricingValidationErr {
  const cost = Number(values.costPerCupVnd);
  if (
    !Number.isFinite(cost) ||
    cost < COST_PER_CUP_MIN ||
    cost > COST_PER_CUP_MAX
  ) {
    return {
      ok: false,
      error: `Chi phí trung bình mỗi ly phải trong khoảng ${COST_PER_CUP_MIN.toLocaleString("vi-VN")}-${COST_PER_CUP_MAX.toLocaleString("vi-VN")} VND.`,
    };
  }

  const competitor = Number(values.competitorAvgVnd);
  if (
    !Number.isFinite(competitor) ||
    competitor < COMPETITOR_AVG_MIN ||
    competitor > COMPETITOR_AVG_MAX
  ) {
    return {
      ok: false,
      error: `Giá trung bình của đối thủ phải trong khoảng ${COMPETITOR_AVG_MIN.toLocaleString("vi-VN")}-${COMPETITOR_AVG_MAX.toLocaleString("vi-VN")} VND.`,
    };
  }

  const margin = Number(values.targetMarginPct);
  if (
    !Number.isFinite(margin) ||
    margin < TARGET_MARGIN_MIN ||
    margin > TARGET_MARGIN_MAX
  ) {
    return {
      ok: false,
      error: `Tỉ suất lợi nhuận mục tiêu phải trong khoảng ${TARGET_MARGIN_MIN}-${TARGET_MARGIN_MAX}%.`,
    };
  }

  const rawItems = splitItems(values.itemsRaw);
  if (rawItems.length < 1) {
    return { ok: false, error: "Vui lòng nhập ít nhất 1 món." };
  }
  if (rawItems.length > MAX_ITEMS) {
    return {
      ok: false,
      error: `Chỉ nhập tối đa ${MAX_ITEMS} món (đã nhận ${rawItems.length}).`,
    };
  }

  for (const item of rawItems) {
    if (item.length < MIN_ITEM_LEN || item.length > MAX_ITEM_LEN) {
      return {
        ok: false,
        error: `Tên món "${item}" phải dài ${MIN_ITEM_LEN}-${MAX_ITEM_LEN} ký tự.`,
      };
    }
  }

  const seen = new Set<string>();
  for (const item of rawItems) {
    const key = item.toLowerCase();
    if (seen.has(key)) {
      return { ok: false, error: `Tên món bị trùng: "${item}".` };
    }
    seen.add(key);
  }

  return {
    ok: true,
    costPerCupVnd: Math.round(cost),
    competitorAvgVnd: Math.round(competitor),
    targetMarginPct: Math.round(margin),
    items: rawItems,
  };
}
