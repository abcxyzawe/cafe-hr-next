import type { DrinkPairing, PairingMood } from "@/lib/xai";

export const PAIRING_MOODS: ReadonlyArray<{
  value: PairingMood;
  label: string;
  hint: string;
}> = [
  { value: "relax", label: "Thư giãn", hint: "Khách ngồi thưởng thức từ tốn" },
  {
    value: "work-focus",
    label: "Tập trung làm việc",
    hint: "Khách cần năng lượng + ít gián đoạn",
  },
  { value: "social", label: "Giao lưu", hint: "Nhóm bạn / hẹn hò trò chuyện" },
  {
    value: "quick-takeaway",
    label: "Mua mang về",
    hint: "Khách vội, cần món gọn nhẹ",
  },
];

export function isPairingMood(v: unknown): v is PairingMood {
  return typeof v === "string" && PAIRING_MOODS.some((m) => m.value === v);
}

export type PairingsState = {
  drinkName: string;
  mood: PairingMood;
  pairings: DrinkPairing[] | null;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_PAIRINGS_STATE: PairingsState = {
  drinkName: "",
  mood: "relax",
  pairings: null,
  error: null,
  generatedAt: null,
};
