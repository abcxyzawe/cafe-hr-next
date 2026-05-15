import type { FinanceHealthResult } from "@/lib/xai";

export type FinanceHealthState = {
  revenueWeek: number;
  revenueMonth: number;
  expensesWeek: number;
  expensesMonth: number;
  payrollMonth: number;
  payrollPrevMonth: number;
  employeeCount: number;
  result: FinanceHealthResult | null;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_FINANCE_HEALTH_STATE: FinanceHealthState = {
  revenueWeek: 0,
  revenueMonth: 0,
  expensesWeek: 0,
  expensesMonth: 0,
  payrollMonth: 0,
  payrollPrevMonth: 0,
  employeeCount: 0,
  result: null,
  error: null,
  generatedAt: null,
};

/**
 * Parses a non-negative finite number from FormData. Returns 0 on any failure
 * so the AI still receives a usable JSON facts payload.
 */
export function parseNonNegativeAmount(raw: unknown): number {
  if (typeof raw !== "string") return 0;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return 0;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return 0;
  // Cap at 1 trillion VND to avoid pathological inputs reaching the AI.
  if (n > 1_000_000_000_000) return 1_000_000_000_000;
  return Math.round(n);
}
