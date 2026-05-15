import type { SeoMetaResult } from "@/lib/xai";

export type SeoMetaState = {
  cafeName: string;
  uspsRaw: string;
  result: SeoMetaResult | null;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_SEO_META_STATE: SeoMetaState = {
  cafeName: "",
  uspsRaw: "",
  result: null,
  error: null,
  generatedAt: null,
};

export function parseUspsRaw(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 3);
}
