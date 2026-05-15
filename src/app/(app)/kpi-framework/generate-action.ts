"use server";

import { getSession } from "@/lib/auth";
import { generateKpiFramework, type KpiGoal, type KpiStage } from "@/lib/xai";
import {
  INITIAL_KPI_STATE,
  validateKpiInputs,
  type KpiFormValues,
  type KpiState,
} from "./kpi-types";

function readStage(formData: FormData, fallback: KpiStage): KpiStage {
  const v = formData.get("stage");
  if (v === "startup" || v === "growth" || v === "mature") {
    return v;
  }
  return fallback;
}

function readGoals(formData: FormData, fallback: KpiGoal[]): KpiGoal[] {
  const raw = formData.getAll("goals");
  const out: KpiGoal[] = [];
  const seen = new Set<KpiGoal>();
  for (const v of raw) {
    if (typeof v !== "string") continue;
    if (
      v !== "revenue" &&
      v !== "staff_retention" &&
      v !== "customer_satisfaction" &&
      v !== "brand_awareness" &&
      v !== "operational_efficiency"
    ) {
      continue;
    }
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out.length > 0 ? out : fallback;
}

export async function generateKpiAction(
  prevState: KpiState,
  formData: FormData,
): Promise<KpiState> {
  const prev = prevState.values ?? INITIAL_KPI_STATE.values;

  const values: KpiFormValues = {
    stage: readStage(formData, prev.stage),
    goals: readGoals(formData, prev.goals),
  };

  const baseState: KpiState = {
    values,
    stage: null,
    goals: null,
    kpis: null,
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
      error: "Chỉ quản trị viên mới có thể tạo bộ KPI.",
    };
  }

  const parsed = validateKpiInputs(values);
  if (!parsed.ok) {
    return { ...baseState, error: parsed.error };
  }

  try {
    const { kpis } = await generateKpiFramework({
      stage: parsed.stage,
      goals: parsed.goals,
    });
    return {
      values,
      stage: parsed.stage,
      goals: parsed.goals,
      kpis,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không tạo được bộ KPI. Vui lòng thử lại.";
    return { ...baseState, error: message };
  }
}
