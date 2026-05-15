import type { EmailReplyTone } from "@/lib/xai";

export type EmailReplyToneOption = {
  value: EmailReplyTone;
  label: string;
  hint: string;
};

export const EMAIL_REPLY_TONES: readonly EmailReplyToneOption[] = [
  {
    value: "professional",
    label: "Trang trọng",
    hint: "Lịch sự, cấu trúc rõ",
  },
  { value: "friendly", label: "Thân thiện", hint: "Ấm áp, gần gũi" },
  {
    value: "apologetic",
    label: "Xin lỗi",
    hint: "Chân thành, đề xuất giải pháp",
  },
] as const;

export const EMAIL_REPLY_ORIGINAL_MIN = 10;
export const EMAIL_REPLY_ORIGINAL_MAX = 3000;
export const EMAIL_REPLY_NAME_MAX = 60;

export function isEmailReplyTone(v: unknown): v is EmailReplyTone {
  return v === "professional" || v === "friendly" || v === "apologetic";
}

export type EmailReplyState = {
  original: string;
  tone: EmailReplyTone;
  customerName: string;
  reply: string | null;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_EMAIL_REPLY_STATE: EmailReplyState = {
  original: "",
  tone: "professional",
  customerName: "",
  reply: null,
  error: null,
  generatedAt: null,
};
