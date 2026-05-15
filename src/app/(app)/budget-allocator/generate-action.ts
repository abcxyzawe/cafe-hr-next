"use server";

import { getSession } from "@/lib/auth";
import { generateBudgetAllocation, type BudgetPhase } from "@/lib/xai";
import {
  INITIAL_BUDGET_STATE,
  validateBudgetInputs,
  type BudgetFormValues,
  type BudgetState,
} from "./budget-types";

function readField(formData: FormData, key: string, fallback: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : fallback;
}

function readPhase(formData: FormData, fallback: BudgetPhase): BudgetPhase {
  const v = formData.get("phase");
  if (v === "startup" || v === "growth" || v === "mature") {
    return v;
  }
  return fallback;
}

export async function generateBudgetAction(
  prevState: BudgetState,
  formData: FormData,
): Promise<BudgetState> {
  const prev = prevState.values ?? INITIAL_BUDGET_STATE.values;

  const values: BudgetFormValues = {
    totalVnd: readField(formData, "totalVnd", prev.totalVnd),
    phase: readPhase(formData, prev.phase),
  };

  const baseState: BudgetState = {
    values,
    totalVnd: null,
    phase: null,
    allocations: null,
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
      error: "Chỉ quản trị viên mới có thể phân bổ ngân sách.",
    };
  }

  const parsed = validateBudgetInputs(values);
  if (!parsed.ok) {
    return { ...baseState, error: parsed.error };
  }

  try {
    const { allocations } = await generateBudgetAllocation({
      totalVnd: parsed.totalVnd,
      phase: parsed.phase,
    });
    return {
      values,
      totalVnd: parsed.totalVnd,
      phase: parsed.phase,
      allocations,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không phân bổ được ngân sách. Vui lòng thử lại.";
    return { ...baseState, error: message };
  }
}
