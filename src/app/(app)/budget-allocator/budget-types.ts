import type { BudgetAllocation, BudgetPhase } from "@/lib/xai";

export const BUDGET_TOTAL_MIN = 5_000_000;
export const BUDGET_TOTAL_MAX = 500_000_000;

export const BUDGET_PHASES: ReadonlyArray<{
  value: BudgetPhase;
  label: string;
  description: string;
}> = [
  {
    value: "startup",
    label: "Khởi nghiệp",
    description:
      "Quán mới mở dưới 12 tháng, đang xây thương hiệu, doanh thu chưa ổn định.",
  },
  {
    value: "growth",
    label: "Tăng trưởng",
    description:
      "Quán đã có khách quen, doanh thu tăng đều, đang mở rộng tệp khách.",
  },
  {
    value: "mature",
    label: "Ổn định",
    description:
      "Quán đã chạy ổn định nhiều năm, ưu tiên duy trì chất lượng và tối ưu chi phí.",
  },
];

export type BudgetFormValues = {
  totalVnd: string;
  phase: BudgetPhase;
};

export type BudgetState = {
  values: BudgetFormValues;
  totalVnd: number | null;
  phase: BudgetPhase | null;
  allocations: BudgetAllocation[] | null;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_BUDGET_STATE: BudgetState = {
  values: {
    totalVnd: "30000000",
    phase: "growth",
  },
  totalVnd: null,
  phase: null,
  allocations: null,
  error: null,
  generatedAt: null,
};

export type BudgetValidationOk = {
  ok: true;
  totalVnd: number;
  phase: BudgetPhase;
};

export type BudgetValidationErr = {
  ok: false;
  error: string;
};

export function validateBudgetInputs(
  values: BudgetFormValues,
): BudgetValidationOk | BudgetValidationErr {
  const total = Number(values.totalVnd);
  if (
    !Number.isFinite(total) ||
    total < BUDGET_TOTAL_MIN ||
    total > BUDGET_TOTAL_MAX
  ) {
    return {
      ok: false,
      error: `Tổng ngân sách tháng phải trong khoảng ${BUDGET_TOTAL_MIN.toLocaleString(
        "vi-VN",
      )}-${BUDGET_TOTAL_MAX.toLocaleString("vi-VN")} VND.`,
    };
  }

  const phase = values.phase;
  if (phase !== "startup" && phase !== "growth" && phase !== "mature") {
    return {
      ok: false,
      error: "Giai đoạn phải là 'Khởi nghiệp', 'Tăng trưởng' hoặc 'Ổn định'.",
    };
  }

  return {
    ok: true,
    totalVnd: Math.round(total),
    phase,
  };
}
