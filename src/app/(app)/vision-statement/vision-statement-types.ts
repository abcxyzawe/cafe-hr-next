import type { VisionStatementResult } from "@/lib/xai";

export type VisionStatementState = {
  yearsInBusiness: number;
  targetCustomer: string;
  usp: string;
  result: VisionStatementResult | null;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_VISION_STATEMENT_STATE: VisionStatementState = {
  yearsInBusiness: 1,
  targetCustomer: "",
  usp: "",
  result: null,
  error: null,
  generatedAt: null,
};

export function parseYearsInBusiness(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < 1 || rounded > 50) return null;
  return rounded;
}
