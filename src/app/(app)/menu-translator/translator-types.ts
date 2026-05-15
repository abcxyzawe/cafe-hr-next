import type { MenuTranslation } from "@/lib/xai";

export type MenuTranslatorState = {
  input: string;
  translations: MenuTranslation[] | null;
  error: string | null;
};

export const INITIAL_TRANSLATOR_STATE: MenuTranslatorState = {
  input: "",
  translations: null,
  error: null,
};

export const MAX_MENU_ITEMS = 30;
