"use server";

import { getSession } from "@/lib/auth";
import { generateWeeklyNewsletter } from "@/lib/xai";
import type {
  WeeklyNewsletterLength,
  WeeklyNewsletterTone,
} from "@/lib/xai";
import {
  INITIAL_NEWSLETTER_STATE,
  isLength,
  isTone,
  validateNewsletterInputs,
  type NewsletterFormValues,
  type NewsletterState,
} from "./types";

function coerceString(raw: FormDataEntryValue | null): string {
  return typeof raw === "string" ? raw : "";
}

function coerceBool(raw: FormDataEntryValue | null): boolean {
  if (typeof raw !== "string") return false;
  const v = raw.trim().toLowerCase();
  return v === "on" || v === "true" || v === "1" || v === "yes";
}

function coerceTone(raw: FormDataEntryValue | null): WeeklyNewsletterTone {
  const v = typeof raw === "string" ? raw : "";
  if (isTone(v)) return v;
  return INITIAL_NEWSLETTER_STATE.values.tone;
}

function coerceLength(raw: FormDataEntryValue | null): WeeklyNewsletterLength {
  const v = typeof raw === "string" ? raw : "";
  if (isLength(v)) return v;
  return INITIAL_NEWSLETTER_STATE.values.length;
}

export async function generateNewsletterAction(
  _prevState: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const values: NewsletterFormValues = {
    weekEndingIso: coerceString(formData.get("weekEndingIso")),
    tone: coerceTone(formData.get("tone")),
    length: coerceLength(formData.get("length")),
    highlights: coerceString(formData.get("highlights")),
    includeWeather: coerceBool(formData.get("includeWeather")),
    includeQuote: coerceBool(formData.get("includeQuote")),
  };

  const baseState: NewsletterState = {
    values,
    result: null,
    error: null,
    generatedAt: null,
  };

  const sess = await getSession();
  if (!sess) {
    return {
      ...baseState,
      error: "Bạn cần đăng nhập để dùng tính năng này.",
    };
  }
  if (sess.role !== "admin") {
    return {
      ...baseState,
      error: "Chỉ quản trị viên mới có thể tạo bản tin nội bộ.",
    };
  }

  const parsed = validateNewsletterInputs(values);
  if (!parsed.ok) {
    return { ...baseState, error: parsed.error };
  }

  try {
    const result = await generateWeeklyNewsletter({
      weekEndingIso: parsed.weekEndingIso,
      tone: parsed.tone,
      length: parsed.length,
      highlights:
        parsed.highlights.length > 0 ? parsed.highlights : undefined,
      includeWeather: parsed.includeWeather,
      includeQuote: parsed.includeQuote,
    });
    return {
      values: { ...values, highlights: parsed.highlights },
      result,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không tạo được bản tin tuần. Vui lòng thử lại.";
    return { ...baseState, error: message };
  }
}
