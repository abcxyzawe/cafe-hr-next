import type { LogoConceptsResult } from "@/lib/xai";

export const VIBE_OPTIONS = [
  { value: "cozy", label: "Cozy — ấm cúng, mộc mạc" },
  { value: "modern", label: "Modern — hiện đại, tối giản" },
  { value: "luxe", label: "Luxe — sang trọng, cao cấp" },
  { value: "playful", label: "Playful — vui tươi, trẻ trung" },
  { value: "vintage", label: "Vintage — cổ điển, hoài niệm" },
] as const;

export const SYMBOL_OPTIONS = [
  { value: "coffee-bean", label: "Hạt cà phê" },
  { value: "cup", label: "Cốc / tách cà phê" },
  { value: "leaf", label: "Lá / thực vật" },
  { value: "abstract", label: "Hình khối trừu tượng" },
  { value: "wordmark-only", label: "Chỉ chữ (wordmark)" },
] as const;

export const VIBE_VALUES: ReadonlyArray<string> = VIBE_OPTIONS.map(
  (o) => o.value,
);
export const SYMBOL_VALUES: ReadonlyArray<string> = SYMBOL_OPTIONS.map(
  (o) => o.value,
);

export type VibeValue = (typeof VIBE_OPTIONS)[number]["value"];
export type SymbolValue = (typeof SYMBOL_OPTIONS)[number]["value"];

export type LogoState = {
  cafeName: string;
  vibe: string;
  symbol: string;
  result: LogoConceptsResult | null;
  requested: number;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_LOGO_STATE: LogoState = {
  cafeName: "",
  vibe: "cozy",
  symbol: "coffee-bean",
  result: null,
  requested: 3,
  error: null,
  generatedAt: null,
};
