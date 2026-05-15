import type { SentimentAnalysis } from "@/lib/xai";

export const MIN_FEEDBACK_LENGTH = 10;
export const MAX_FEEDBACK_LENGTH = 2000;

export type SentimentFormState = {
  text: string;
  analysis: SentimentAnalysis | null;
  error: string | null;
  analyzedAt: number | null;
};

export const INITIAL_SENTIMENT_STATE: SentimentFormState = {
  text: "",
  analysis: null,
  error: null,
  analyzedAt: null,
};
