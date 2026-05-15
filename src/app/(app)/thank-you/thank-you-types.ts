import type { ThankYouChannel, ThankYouMessages } from "@/lib/xai";

export type ThankYouContext =
  | "loyal-customer"
  | "first-visit"
  | "complaint-resolved"
  | "large-group"
  | "regular-order";

export type ThankYouContextOption = {
  value: ThankYouContext;
  label: string;
  hint: string;
};

export const THANK_YOU_CONTEXTS: readonly ThankYouContextOption[] = [
  {
    value: "loyal-customer",
    label: "Khách thân thiết",
    hint: "Ghé thường xuyên",
  },
  {
    value: "first-visit",
    label: "Lần đầu ghé",
    hint: "Khách mới",
  },
  {
    value: "complaint-resolved",
    label: "Vừa xử lý khiếu nại",
    hint: "Sau hỗ trợ",
  },
  {
    value: "large-group",
    label: "Nhóm đông",
    hint: "Đặt theo nhóm",
  },
  {
    value: "regular-order",
    label: "Đặt món quen",
    hint: "Đơn hàng định kỳ",
  },
] as const;

export type ThankYouChannelOption = {
  value: ThankYouChannel;
  label: string;
  hint: string;
};

export const THANK_YOU_CHANNELS: readonly ThankYouChannelOption[] = [
  { value: "sms", label: "SMS", hint: "Cô đọng" },
  { value: "email", label: "Email", hint: "Trang trọng" },
  {
    value: "facebook-message",
    label: "Facebook",
    hint: "Thân thiện",
  },
] as const;

export const THANK_YOU_NAME_MAX = 60;

export type ThankYouChannelLimits = {
  short: number;
  medium: number;
  long: number;
};

export const THANK_YOU_CHANNEL_LIMITS: Record<
  ThankYouChannel,
  ThankYouChannelLimits
> = {
  sms: { short: 80, medium: 150, long: 300 },
  email: { short: 120, medium: 250, long: 500 },
  "facebook-message": { short: 100, medium: 200, long: 350 },
};

export function isThankYouContext(v: unknown): v is ThankYouContext {
  return (
    v === "loyal-customer" ||
    v === "first-visit" ||
    v === "complaint-resolved" ||
    v === "large-group" ||
    v === "regular-order"
  );
}

export function isThankYouChannel(v: unknown): v is ThankYouChannel {
  return v === "sms" || v === "email" || v === "facebook-message";
}

export type ThankYouState = {
  context: ThankYouContext;
  customerName: string;
  channel: ThankYouChannel;
  messages: ThankYouMessages | null;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_THANK_YOU_STATE: ThankYouState = {
  context: "loyal-customer",
  customerName: "",
  channel: "sms",
  messages: null,
  error: null,
  generatedAt: null,
};
