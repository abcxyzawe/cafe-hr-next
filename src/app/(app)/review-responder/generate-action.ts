"use server";

import { getSession } from "@/lib/auth";
import { generateReviewResponses } from "@/lib/xai";
import type {
  ReviewResponderLanguage,
  ReviewResponderPlatform,
} from "@/lib/xai";
import {
  INITIAL_REVIEW_RESPONDER_STATE,
  RATING_OPTIONS,
  isLanguage,
  isPlatform,
  isRating,
  validateReviewResponderInputs,
  type RatingOption,
  type ReviewResponderFormValues,
  type ReviewResponderState,
} from "./types";

function coercePlatform(
  raw: FormDataEntryValue | null,
): ReviewResponderPlatform {
  const v = typeof raw === "string" ? raw : "";
  if (isPlatform(v)) return v;
  return INITIAL_REVIEW_RESPONDER_STATE.values.platform;
}

function coerceLanguage(
  raw: FormDataEntryValue | null,
): ReviewResponderLanguage {
  const v = typeof raw === "string" ? raw : "";
  if (isLanguage(v)) return v;
  return INITIAL_REVIEW_RESPONDER_STATE.values.language;
}

function coerceRating(raw: FormDataEntryValue | null): RatingOption {
  const n = typeof raw === "string" ? Number.parseInt(raw, 10) : Number.NaN;
  if (isRating(n)) return n;
  return RATING_OPTIONS[RATING_OPTIONS.length - 1];
}

function coerceString(raw: FormDataEntryValue | null): string {
  return typeof raw === "string" ? raw : "";
}

export async function generateReviewResponderAction(
  _prevState: ReviewResponderState,
  formData: FormData,
): Promise<ReviewResponderState> {
  const values: ReviewResponderFormValues = {
    reviewText: coerceString(formData.get("reviewText")),
    rating: coerceRating(formData.get("rating")),
    platform: coercePlatform(formData.get("platform")),
    customerName: coerceString(formData.get("customerName")),
    language: coerceLanguage(formData.get("language")),
  };

  const baseState: ReviewResponderState = {
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
      error: "Chỉ quản trị viên mới có thể tạo phản hồi đánh giá.",
    };
  }

  const parsed = validateReviewResponderInputs(values);
  if (!parsed.ok) {
    return { ...baseState, error: parsed.error };
  }

  try {
    const result = await generateReviewResponses({
      reviewText: parsed.reviewText,
      rating: parsed.rating,
      platform: parsed.platform,
      customerName:
        parsed.customerName.length > 0 ? parsed.customerName : undefined,
      language: parsed.language,
    });
    return {
      values: {
        ...values,
        reviewText: parsed.reviewText,
        customerName: parsed.customerName,
      },
      result,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không tạo được phản hồi đánh giá. Vui lòng thử lại.";
    return { ...baseState, error: message };
  }
}
