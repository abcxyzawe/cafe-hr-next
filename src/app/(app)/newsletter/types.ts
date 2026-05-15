import type {
  WeeklyNewsletterLength,
  WeeklyNewsletterResult,
  WeeklyNewsletterTone,
} from "@/lib/xai";

export const HIGHLIGHTS_MAX = 1500;

export const TONE_OPTIONS: ReadonlyArray<{
  value: WeeklyNewsletterTone;
  label: string;
  hint: string;
}> = [
  { value: "warm", label: "Ấm áp", hint: "Gần gũi, gắn kết đội ngũ" },
  {
    value: "professional",
    label: "Chuyên nghiệp",
    hint: "Súc tích, trang trọng",
  },
  { value: "playful", label: "Vui tươi", hint: "Dí dỏm, năng động" },
];

export const LENGTH_OPTIONS: ReadonlyArray<{
  value: WeeklyNewsletterLength;
  label: string;
  hint: string;
}> = [
  { value: "short", label: "Ngắn", hint: "Khoảng 300 từ" },
  { value: "medium", label: "Trung bình", hint: "Khoảng 600 từ" },
  { value: "long", label: "Dài", hint: "Khoảng 1000 từ" },
];

const ALLOWED_TONES: ReadonlyArray<WeeklyNewsletterTone> = [
  "warm",
  "professional",
  "playful",
];

const ALLOWED_LENGTHS: ReadonlyArray<WeeklyNewsletterLength> = [
  "short",
  "medium",
  "long",
];

export function isTone(v: string): v is WeeklyNewsletterTone {
  return (ALLOWED_TONES as ReadonlyArray<string>).includes(v);
}

export function isLength(v: string): v is WeeklyNewsletterLength {
  return (ALLOWED_LENGTHS as ReadonlyArray<string>).includes(v);
}

export type NewsletterFormValues = {
  weekEndingIso: string;
  tone: WeeklyNewsletterTone;
  length: WeeklyNewsletterLength;
  highlights: string;
  includeWeather: boolean;
  includeQuote: boolean;
};

export type NewsletterState = {
  values: NewsletterFormValues;
  result: WeeklyNewsletterResult | null;
  error: string | null;
  generatedAt: number | null;
};

function nextSundayIso(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const offset = day === 0 ? 7 : 7 - day;
  d.setDate(d.getDate() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export const INITIAL_NEWSLETTER_STATE: NewsletterState = {
  values: {
    weekEndingIso: nextSundayIso(),
    tone: "warm",
    length: "medium",
    highlights: "",
    includeWeather: true,
    includeQuote: true,
  },
  result: null,
  error: null,
  generatedAt: null,
};

export type NewsletterValidationOk = {
  ok: true;
  weekEndingIso: string;
  tone: WeeklyNewsletterTone;
  length: WeeklyNewsletterLength;
  highlights: string;
  includeWeather: boolean;
  includeQuote: boolean;
};

export type NewsletterValidationErr = {
  ok: false;
  error: string;
};

export function validateNewsletterInputs(
  values: NewsletterFormValues,
): NewsletterValidationOk | NewsletterValidationErr {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.weekEndingIso)) {
    return {
      ok: false,
      error: "Ngày kết thúc tuần phải có định dạng YYYY-MM-DD.",
    };
  }
  if (!isTone(values.tone)) {
    return { ok: false, error: "Văn phong bản tin không hợp lệ." };
  }
  if (!isLength(values.length)) {
    return { ok: false, error: "Độ dài bản tin không hợp lệ." };
  }
  const highlights = values.highlights.trim();
  if (highlights.length > HIGHLIGHTS_MAX) {
    return {
      ok: false,
      error: `Điểm nhấn tối đa ${HIGHLIGHTS_MAX} ký tự.`,
    };
  }
  return {
    ok: true,
    weekEndingIso: values.weekEndingIso,
    tone: values.tone,
    length: values.length,
    highlights,
    includeWeather: values.includeWeather === true,
    includeQuote: values.includeQuote === true,
  };
}
