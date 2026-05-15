export const COACHING_FOCUS_OPTIONS = [
  {
    value: "skill-development",
    label: "Phát triển kỹ năng",
    hint: "Nâng cao chuyên môn và quy trình",
  },
  {
    value: "customer-service",
    label: "Phục vụ khách",
    hint: "Tương tác và trải nghiệm khách hàng",
  },
  {
    value: "time-management",
    label: "Quản lý thời gian",
    hint: "Sắp xếp công việc và ca làm",
  },
  {
    value: "teamwork",
    label: "Làm việc nhóm",
    hint: "Phối hợp với đồng nghiệp",
  },
  {
    value: "motivation",
    label: "Tạo động lực",
    hint: "Giữ năng lượng tích cực",
  },
] as const;

export const COACHING_FOCUS_VALUES = COACHING_FOCUS_OPTIONS.map(
  (o) => o.value,
);

export type CoachingFocusValue =
  (typeof COACHING_FOCUS_OPTIONS)[number]["value"];

export type CoachingTipEmployee = {
  id: number;
  name: string;
  role: string;
};

export type CoachingTipState = {
  employeeId: number | null;
  employeeName: string;
  employeeRole: string;
  focus: string;
  tip: string | null;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_COACHING_TIP_STATE: CoachingTipState = {
  employeeId: null,
  employeeName: "",
  employeeRole: "",
  focus: "skill-development",
  tip: null,
  error: null,
  generatedAt: null,
};
