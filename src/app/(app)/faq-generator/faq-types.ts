import type { FaqFormality, FaqItem } from "@/lib/xai";

export type FaqGeneratorState = {
  topic: string;
  formality: FaqFormality;
  items: FaqItem[] | null;
  error: string | null;
};

export const INITIAL_FAQ_STATE: FaqGeneratorState = {
  topic: "",
  formality: "friendly",
  items: null,
  error: null,
};

export const FAQ_FORMALITIES: ReadonlyArray<{
  value: FaqFormality;
  label: string;
  hint: string;
}> = [
  {
    value: "friendly",
    label: "Thân thiện",
    hint: "Gần gũi, ấm áp — xưng 'bạn'",
  },
  {
    value: "formal",
    label: "Trang trọng",
    hint: "Lịch sự, chuyên nghiệp — xưng 'quý khách'",
  },
];

export const FAQ_TOPIC_MIN = 5;
export const FAQ_TOPIC_MAX = 200;

export function isFaqFormality(v: unknown): v is FaqFormality {
  return v === "formal" || v === "friendly";
}
