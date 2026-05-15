import type { CustomerPersona } from "@/lib/xai";

export type PersonaVibe =
  | "cozy"
  | "modern"
  | "luxe"
  | "youth"
  | "bohemian"
  | "student-friendly";

export type PersonaLocation =
  | "downtown"
  | "residential"
  | "university"
  | "business district"
  | "touristy";

export type PersonaPriceTier = "budget" | "mid" | "premium";

export const PERSONA_VIBES: ReadonlyArray<{
  value: PersonaVibe;
  label: string;
  hint: string;
}> = [
  { value: "cozy", label: "Cozy", hint: "Ấm cúng, gần gũi" },
  { value: "modern", label: "Modern", hint: "Hiện đại, tối giản" },
  { value: "luxe", label: "Luxe", hint: "Sang trọng, cao cấp" },
  { value: "youth", label: "Youth", hint: "Trẻ trung, gen Z" },
  { value: "bohemian", label: "Bohemian", hint: "Phóng khoáng, nghệ sĩ" },
  {
    value: "student-friendly",
    label: "Student-friendly",
    hint: "Thân thiện sinh viên",
  },
];

export const PERSONA_LOCATIONS: ReadonlyArray<{
  value: PersonaLocation;
  label: string;
}> = [
  { value: "downtown", label: "Trung tâm (Downtown)" },
  { value: "residential", label: "Khu dân cư (Residential)" },
  { value: "university", label: "Gần đại học (University)" },
  { value: "business district", label: "Khu văn phòng (Business district)" },
  { value: "touristy", label: "Khu du lịch (Touristy)" },
];

export const PERSONA_PRICE_TIERS: ReadonlyArray<{
  value: PersonaPriceTier;
  label: string;
  hint: string;
}> = [
  { value: "budget", label: "Budget", hint: "Bình dân" },
  { value: "mid", label: "Mid", hint: "Tầm trung" },
  { value: "premium", label: "Premium", hint: "Cao cấp" },
];

export type PersonaState = {
  vibe: PersonaVibe;
  location: PersonaLocation;
  priceTier: PersonaPriceTier;
  personas: CustomerPersona[] | null;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_PERSONA_STATE: PersonaState = {
  vibe: "cozy",
  location: "downtown",
  priceTier: "mid",
  personas: null,
  error: null,
  generatedAt: null,
};

export function isPersonaVibe(v: unknown): v is PersonaVibe {
  return typeof v === "string" && PERSONA_VIBES.some((x) => x.value === v);
}

export function isPersonaLocation(v: unknown): v is PersonaLocation {
  return typeof v === "string" && PERSONA_LOCATIONS.some((x) => x.value === v);
}

export function isPersonaPriceTier(v: unknown): v is PersonaPriceTier {
  return (
    typeof v === "string" && PERSONA_PRICE_TIERS.some((x) => x.value === v)
  );
}

export function personaVibeLabel(v: PersonaVibe): string {
  return PERSONA_VIBES.find((x) => x.value === v)?.label ?? v;
}

export function personaLocationLabel(v: PersonaLocation): string {
  return PERSONA_LOCATIONS.find((x) => x.value === v)?.label ?? v;
}

export function personaPriceTierLabel(v: PersonaPriceTier): string {
  return PERSONA_PRICE_TIERS.find((x) => x.value === v)?.label ?? v;
}
