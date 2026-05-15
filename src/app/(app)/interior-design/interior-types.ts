import type { InteriorConceptsResult } from "@/lib/xai";

export const STYLE_OPTIONS = [
  { value: "cozy-rustic", label: "Cozy Rustic — ấm cúng, mộc mạc" },
  { value: "minimalist-zen", label: "Minimalist Zen — tối giản kiểu Nhật" },
  { value: "industrial-loft", label: "Industrial Loft — công nghiệp, gạch thô" },
  { value: "vintage-french", label: "Vintage French — Pháp cổ điển" },
  { value: "modern-bright", label: "Modern Bright — hiện đại, sáng" },
] as const;

export const BUDGET_OPTIONS = [
  { value: "low", label: "Thấp (~30-80tr)" },
  { value: "mid", label: "Trung bình (~80-200tr)" },
  { value: "high", label: "Cao (>200tr)" },
] as const;

export const SPACE_OPTIONS = [
  { value: "small", label: "Nhỏ (<30m²)" },
  { value: "medium", label: "Trung bình (30-80m²)" },
  { value: "large", label: "Lớn (>80m²)" },
] as const;

export const STYLE_VALUES = STYLE_OPTIONS.map((o) => o.value);
export const BUDGET_VALUES = BUDGET_OPTIONS.map((o) => o.value);
export const SPACE_VALUES = SPACE_OPTIONS.map((o) => o.value);

export type StyleValue = (typeof STYLE_OPTIONS)[number]["value"];
export type BudgetValue = (typeof BUDGET_OPTIONS)[number]["value"];
export type SpaceValue = (typeof SPACE_OPTIONS)[number]["value"];

export type InteriorState = {
  style: string;
  budget: string;
  spaceSize: string;
  result: InteriorConceptsResult | null;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_INTERIOR_STATE: InteriorState = {
  style: "cozy-rustic",
  budget: "mid",
  spaceSize: "medium",
  result: null,
  error: null,
  generatedAt: null,
};
