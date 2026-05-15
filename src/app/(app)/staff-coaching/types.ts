import type {
  StaffCoachingReason,
  StaffCoachingRole,
  StaffCoachingScript,
  StaffCoachingTone,
} from "@/lib/xai";

export const STAFF_COACHING_DURATIONS = [5, 10, 15, 20, 30] as const;
export type StaffCoachingDuration = (typeof STAFF_COACHING_DURATIONS)[number];

export const STAFF_COACHING_ROLE_OPTIONS: ReadonlyArray<{
  value: StaffCoachingRole;
  label: string;
}> = [
  { value: "Pha chế", label: "Pha chế" },
  { value: "Phục vụ", label: "Phục vụ" },
  { value: "Thu ngân", label: "Thu ngân" },
  { value: "Quản lý", label: "Quản lý" },
];

export const STAFF_COACHING_REASON_OPTIONS: ReadonlyArray<{
  value: StaffCoachingReason;
  label: string;
  description: string;
}> = [
  {
    value: "positive-recognition",
    label: "Ghi nhận tích cực",
    description: "Khen ngợi, củng cố hành vi tốt vừa quan sát được.",
  },
  {
    value: "performance-gap",
    label: "Khoảng cách hiệu suất",
    description: "Trao đổi khi kết quả công việc chưa đạt kỳ vọng.",
  },
  {
    value: "behavioral-concern",
    label: "Vấn đề hành vi",
    description: "Thái độ, ứng xử với đồng nghiệp hoặc khách hàng.",
  },
  {
    value: "career-development",
    label: "Định hướng phát triển",
    description: "Lộ trình thăng tiến, mục tiêu nghề nghiệp.",
  },
  {
    value: "onboarding",
    label: "Onboarding nhân sự mới",
    description: "Hỗ trợ trong 30/60/90 ngày đầu.",
  },
  {
    value: "return-from-leave",
    label: "Quay lại sau kỳ nghỉ",
    description: "Reonboard sau nghỉ thai sản / dài ngày.",
  },
];

export const STAFF_COACHING_TONE_OPTIONS: ReadonlyArray<{
  value: StaffCoachingTone;
  label: string;
  description: string;
}> = [
  {
    value: "supportive",
    label: "Đồng hành",
    description: "Ấm áp, nhấn mạnh sự hỗ trợ và an toàn tâm lý.",
  },
  {
    value: "direct",
    label: "Thẳng thắn",
    description: "Rõ ràng, đi thẳng vào vấn đề nhưng tôn trọng.",
  },
  {
    value: "coaching",
    label: "Khai vấn",
    description: "Đặt câu hỏi mở, khuyến khích nhân sự tự tìm câu trả lời.",
  },
  {
    value: "mentor",
    label: "Cố vấn",
    description: "Chia sẻ kinh nghiệm như người đi trước dày dạn.",
  },
];

export const EMPLOYEE_NAME_MIN = 2;
export const EMPLOYEE_NAME_MAX = 50;
export const SITUATION_MIN = 20;
export const SITUATION_MAX = 600;

export type StaffCoachingFormValues = {
  employeeName: string;
  role: StaffCoachingRole;
  reason: StaffCoachingReason;
  situation: string;
  tone: StaffCoachingTone;
  durationMinutes: StaffCoachingDuration;
};

export type StaffCoachingState = {
  values: StaffCoachingFormValues;
  script: StaffCoachingScript | null;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_STAFF_COACHING_STATE: StaffCoachingState = {
  values: {
    employeeName: "",
    role: "Pha chế",
    reason: "performance-gap",
    situation: "",
    tone: "supportive",
    durationMinutes: 15,
  },
  script: null,
  error: null,
  generatedAt: null,
};

const ALLOWED_ROLES: ReadonlyArray<StaffCoachingRole> = [
  "Pha chế",
  "Phục vụ",
  "Thu ngân",
  "Quản lý",
];
const ALLOWED_REASONS: ReadonlyArray<StaffCoachingReason> = [
  "positive-recognition",
  "performance-gap",
  "behavioral-concern",
  "career-development",
  "onboarding",
  "return-from-leave",
];
const ALLOWED_TONES: ReadonlyArray<StaffCoachingTone> = [
  "supportive",
  "direct",
  "coaching",
  "mentor",
];

export function isStaffCoachingRole(v: string): v is StaffCoachingRole {
  return (ALLOWED_ROLES as ReadonlyArray<string>).includes(v);
}
export function isStaffCoachingReason(v: string): v is StaffCoachingReason {
  return (ALLOWED_REASONS as ReadonlyArray<string>).includes(v);
}
export function isStaffCoachingTone(v: string): v is StaffCoachingTone {
  return (ALLOWED_TONES as ReadonlyArray<string>).includes(v);
}
export function isStaffCoachingDuration(n: number): n is StaffCoachingDuration {
  return (STAFF_COACHING_DURATIONS as ReadonlyArray<number>).includes(n);
}

export type StaffCoachingValidationOk = {
  ok: true;
  employeeName: string;
  role: StaffCoachingRole;
  reason: StaffCoachingReason;
  situation: string;
  tone: StaffCoachingTone;
  durationMinutes: StaffCoachingDuration;
};

export type StaffCoachingValidationErr = {
  ok: false;
  error: string;
};

export function validateStaffCoachingInputs(
  values: StaffCoachingFormValues,
): StaffCoachingValidationOk | StaffCoachingValidationErr {
  const name = values.employeeName.trim().replace(/\s+/g, " ");
  if (name.length < EMPLOYEE_NAME_MIN || name.length > EMPLOYEE_NAME_MAX) {
    return {
      ok: false,
      error: `Tên nhân sự phải dài ${EMPLOYEE_NAME_MIN}-${EMPLOYEE_NAME_MAX} ký tự.`,
    };
  }
  if (!isStaffCoachingRole(values.role)) {
    return { ok: false, error: "Vai trò nhân sự không hợp lệ." };
  }
  if (!isStaffCoachingReason(values.reason)) {
    return { ok: false, error: "Lý do huấn luyện không hợp lệ." };
  }
  if (!isStaffCoachingTone(values.tone)) {
    return { ok: false, error: "Văn phong không hợp lệ." };
  }
  if (!isStaffCoachingDuration(values.durationMinutes)) {
    return { ok: false, error: "Thời lượng buổi nói chuyện không hợp lệ." };
  }
  const situation = values.situation.trim().replace(/\s+/g, " ");
  if (situation.length < SITUATION_MIN || situation.length > SITUATION_MAX) {
    return {
      ok: false,
      error: `Mô tả tình huống phải dài ${SITUATION_MIN}-${SITUATION_MAX} ký tự.`,
    };
  }
  return {
    ok: true,
    employeeName: name,
    role: values.role,
    reason: values.reason,
    situation,
    tone: values.tone,
    durationMinutes: values.durationMinutes,
  };
}
