import type { UniformConceptsResult } from "@/lib/xai";

export const ROLE_OPTIONS = [
  { value: "barista", label: "Barista — pha chế" },
  { value: "server", label: "Server — phục vụ bàn" },
  { value: "cashier", label: "Cashier — thu ngân" },
  { value: "manager", label: "Manager — quản lý ca" },
] as const;

export const STYLE_OPTIONS = [
  { value: "smart-casual", label: "Smart Casual — lịch sự, thoải mái" },
  { value: "classic-formal", label: "Classic Formal — bistro cổ điển" },
  { value: "streetwear", label: "Streetwear — đường phố, năng động" },
  { value: "vintage", label: "Vintage — hoài cổ, retro" },
  { value: "athleisure", label: "Athleisure — thể thao, co giãn" },
] as const;

export const ROLE_VALUES: ReadonlyArray<string> = ROLE_OPTIONS.map(
  (o) => o.value,
);
export const STYLE_VALUES: ReadonlyArray<string> = STYLE_OPTIONS.map(
  (o) => o.value,
);

export const DEFAULT_DOMINANT_COLOR = "#6f4e37";

export type RoleValue = (typeof ROLE_OPTIONS)[number]["value"];
export type StyleValue = (typeof STYLE_OPTIONS)[number]["value"];

export type UniformState = {
  role: string;
  style: string;
  dominantColor: string;
  result: UniformConceptsResult | null;
  requested: number;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_UNIFORM_STATE: UniformState = {
  role: "barista",
  style: "smart-casual",
  dominantColor: DEFAULT_DOMINANT_COLOR,
  result: null,
  requested: 3,
  error: null,
  generatedAt: null,
};
