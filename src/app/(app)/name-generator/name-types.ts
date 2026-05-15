import type { CafeNameSuggestion } from "@/lib/xai";

export type CafeNameVibe = "cozy" | "modern" | "luxe" | "youth";
export type CafeNameStyle = "vietnamese" | "english" | "mix";

export const CAFE_NAME_VIBES: ReadonlyArray<{
  value: CafeNameVibe;
  label: string;
  hint: string;
}> = [
  { value: "cozy", label: "Ấm cúng", hint: "Thân mật, mộc mạc" },
  { value: "modern", label: "Hiện đại", hint: "Tối giản, sạch sẽ" },
  { value: "luxe", label: "Sang trọng", hint: "Cao cấp, tinh tế" },
  { value: "youth", label: "Trẻ trung", hint: "Năng động, vui tươi" },
];

export const CAFE_NAME_STYLES: ReadonlyArray<{
  value: CafeNameStyle;
  label: string;
}> = [
  { value: "vietnamese", label: "Tiếng Việt" },
  { value: "english", label: "Tiếng Anh" },
  { value: "mix", label: "Anh + phụ đề Việt" },
];

export type CafeNameState = {
  vibe: CafeNameVibe;
  style: CafeNameStyle;
  hintsRaw: string;
  names: CafeNameSuggestion[] | null;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_CAFE_NAME_STATE: CafeNameState = {
  vibe: "cozy",
  style: "mix",
  hintsRaw: "",
  names: null,
  error: null,
  generatedAt: null,
};

export function isCafeNameVibe(v: unknown): v is CafeNameVibe {
  return (
    typeof v === "string" && CAFE_NAME_VIBES.some((o) => o.value === v)
  );
}

export function isCafeNameStyle(v: unknown): v is CafeNameStyle {
  return (
    typeof v === "string" && CAFE_NAME_STYLES.some((o) => o.value === v)
  );
}

export function parseHintsRaw(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 3);
}
