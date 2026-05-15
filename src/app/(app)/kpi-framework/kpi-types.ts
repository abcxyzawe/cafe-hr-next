import type { KpiEntry, KpiGoal, KpiStage } from "@/lib/xai";

export const KPI_STAGES: ReadonlyArray<{
  value: KpiStage;
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
      "Quán đã chạy ổn định nhiều năm, ưu tiên duy trì chất lượng và giữ chân nhân viên.",
  },
];

export const KPI_GOALS: ReadonlyArray<{
  value: KpiGoal;
  label: string;
  description: string;
}> = [
  {
    value: "revenue",
    label: "Doanh thu",
    description: "Tăng doanh thu hàng tháng và giá trị đơn trung bình.",
  },
  {
    value: "staff_retention",
    label: "Giữ chân nhân viên",
    description: "Giảm tỉ lệ nghỉ việc và tăng thâm niên trung bình.",
  },
  {
    value: "customer_satisfaction",
    label: "Hài lòng khách hàng",
    description: "Nâng cao trải nghiệm và đánh giá của khách.",
  },
  {
    value: "brand_awareness",
    label: "Nhận diện thương hiệu",
    description: "Mở rộng độ phủ trên mạng xã hội và truyền miệng.",
  },
  {
    value: "operational_efficiency",
    label: "Hiệu quả vận hành",
    description: "Tối ưu chi phí, tốc độ phục vụ và quy trình quán.",
  },
];

export const KPI_GOAL_MIN = 1;
export const KPI_GOAL_MAX = 3;

export type KpiFormValues = {
  stage: KpiStage;
  goals: KpiGoal[];
};

export type KpiState = {
  values: KpiFormValues;
  stage: KpiStage | null;
  goals: KpiGoal[] | null;
  kpis: KpiEntry[] | null;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_KPI_STATE: KpiState = {
  values: {
    stage: "growth",
    goals: ["revenue", "customer_satisfaction"],
  },
  stage: null,
  goals: null,
  kpis: null,
  error: null,
  generatedAt: null,
};

export type KpiValidationOk = {
  ok: true;
  stage: KpiStage;
  goals: KpiGoal[];
};

export type KpiValidationErr = {
  ok: false;
  error: string;
};

function isKpiStage(s: string): s is KpiStage {
  return s === "startup" || s === "growth" || s === "mature";
}

function isKpiGoal(s: string): s is KpiGoal {
  return (
    s === "revenue" ||
    s === "staff_retention" ||
    s === "customer_satisfaction" ||
    s === "brand_awareness" ||
    s === "operational_efficiency"
  );
}

export function validateKpiInputs(
  values: KpiFormValues,
): KpiValidationOk | KpiValidationErr {
  if (!isKpiStage(values.stage)) {
    return {
      ok: false,
      error: "Giai đoạn phải là 'Khởi nghiệp', 'Tăng trưởng' hoặc 'Ổn định'.",
    };
  }
  if (!Array.isArray(values.goals)) {
    return { ok: false, error: "Mục tiêu kinh doanh không hợp lệ." };
  }
  const seen = new Set<KpiGoal>();
  const goals: KpiGoal[] = [];
  for (const g of values.goals) {
    if (!isKpiGoal(g)) {
      return { ok: false, error: `Mục tiêu không hợp lệ: '${g}'.` };
    }
    if (seen.has(g)) continue;
    seen.add(g);
    goals.push(g);
  }
  if (goals.length < KPI_GOAL_MIN || goals.length > KPI_GOAL_MAX) {
    return {
      ok: false,
      error: `Vui lòng chọn ${KPI_GOAL_MIN}-${KPI_GOAL_MAX} mục tiêu kinh doanh.`,
    };
  }
  return { ok: true, stage: values.stage, goals };
}
