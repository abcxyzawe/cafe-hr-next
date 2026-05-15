import type {
  ReviewResponderLanguage,
  ReviewResponderPlatform,
  ReviewResponderResult,
} from "@/lib/xai";

export const REVIEW_TEXT_MIN = 10;
export const REVIEW_TEXT_MAX = 1500;
export const CUSTOMER_NAME_MAX = 80;

export const RATING_OPTIONS = [1, 2, 3, 4, 5] as const;
export type RatingOption = (typeof RATING_OPTIONS)[number];

export const PLATFORM_OPTIONS: ReadonlyArray<{
  value: ReviewResponderPlatform;
  label: string;
}> = [
  { value: "google", label: "Google Maps" },
  { value: "facebook", label: "Facebook" },
  { value: "shopeefood", label: "ShopeeFood" },
  { value: "grabfood", label: "GrabFood" },
  { value: "foody", label: "Foody" },
  { value: "internal", label: "Phản hồi nội bộ" },
];

export const LANGUAGE_OPTIONS: ReadonlyArray<{
  value: ReviewResponderLanguage;
  label: string;
  hint: string;
}> = [
  { value: "vi", label: "Tiếng Việt", hint: "Phản hồi bằng tiếng Việt" },
  { value: "en", label: "English", hint: "Reply in English" },
];

export const RESPONSE_KEYS = ["empathetic", "professional", "warm"] as const;
export type ResponseKey = (typeof RESPONSE_KEYS)[number];

export const RESPONSE_META: Record<
  ResponseKey,
  { title: string; subtitle: string }
> = {
  empathetic: {
    title: "Thấu cảm",
    subtitle: "Thể hiện sự lắng nghe & xin lỗi",
  },
  professional: {
    title: "Chuyên nghiệp",
    subtitle: "Văn phong trang trọng, rõ ràng",
  },
  warm: {
    title: "Ấm áp",
    subtitle: "Gần gũi, thân thiện với khách",
  },
};

export type ReviewResponderFormValues = {
  reviewText: string;
  rating: RatingOption;
  platform: ReviewResponderPlatform;
  customerName: string;
  language: ReviewResponderLanguage;
};

export type ReviewResponderState = {
  values: ReviewResponderFormValues;
  result: ReviewResponderResult | null;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_REVIEW_RESPONDER_STATE: ReviewResponderState = {
  values: {
    reviewText: "",
    rating: 5,
    platform: "google",
    customerName: "",
    language: "vi",
  },
  result: null,
  error: null,
  generatedAt: null,
};

export type ReviewResponderValidationOk = {
  ok: true;
  reviewText: string;
  rating: RatingOption;
  platform: ReviewResponderPlatform;
  customerName: string;
  language: ReviewResponderLanguage;
};

export type ReviewResponderValidationErr = {
  ok: false;
  error: string;
};

const ALLOWED_PLATFORMS: ReadonlyArray<ReviewResponderPlatform> = [
  "google",
  "facebook",
  "shopeefood",
  "grabfood",
  "foody",
  "internal",
];

const ALLOWED_LANGUAGES: ReadonlyArray<ReviewResponderLanguage> = ["vi", "en"];

export function isPlatform(v: string): v is ReviewResponderPlatform {
  return (ALLOWED_PLATFORMS as ReadonlyArray<string>).includes(v);
}

export function isLanguage(v: string): v is ReviewResponderLanguage {
  return (ALLOWED_LANGUAGES as ReadonlyArray<string>).includes(v);
}

export function isRating(n: number): n is RatingOption {
  return (RATING_OPTIONS as ReadonlyArray<number>).includes(n);
}

export function validateReviewResponderInputs(
  values: ReviewResponderFormValues,
): ReviewResponderValidationOk | ReviewResponderValidationErr {
  const review = values.reviewText.trim();
  if (review.length < REVIEW_TEXT_MIN || review.length > REVIEW_TEXT_MAX) {
    return {
      ok: false,
      error: `Nội dung đánh giá phải dài ${REVIEW_TEXT_MIN}-${REVIEW_TEXT_MAX} ký tự.`,
    };
  }
  if (!isRating(values.rating)) {
    return { ok: false, error: "Số sao đánh giá phải là số nguyên 1-5." };
  }
  if (!isPlatform(values.platform)) {
    return { ok: false, error: "Nền tảng đánh giá không hợp lệ." };
  }
  if (!isLanguage(values.language)) {
    return { ok: false, error: "Ngôn ngữ phản hồi không hợp lệ." };
  }
  const name = values.customerName.trim().slice(0, CUSTOMER_NAME_MAX);
  return {
    ok: true,
    reviewText: review,
    rating: values.rating,
    platform: values.platform,
    customerName: name,
    language: values.language,
  };
}

export const SENTIMENT_LABEL_VI: Record<
  "very_negative" | "negative" | "neutral" | "positive" | "very_positive",
  string
> = {
  very_negative: "Rất tiêu cực",
  negative: "Tiêu cực",
  neutral: "Trung tính",
  positive: "Tích cực",
  very_positive: "Rất tích cực",
};
