"use server";

import { getSession } from "@/lib/auth";
import { translateMenu } from "@/lib/xai";
import {
  MAX_MENU_ITEMS,
  type MenuTranslatorState,
} from "./translator-types";

function parseItems(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export async function translateMenuAction(
  _prevState: MenuTranslatorState,
  formData: FormData,
): Promise<MenuTranslatorState> {
  const rawInput = formData.get("input");
  const input = typeof rawInput === "string" ? rawInput : "";

  const baseState: MenuTranslatorState = {
    input,
    translations: null,
    error: null,
  };

  const sess = await getSession();
  if (!sess) {
    return { ...baseState, error: "Bạn cần đăng nhập để dùng tính năng này." };
  }
  if (sess.role !== "admin") {
    return {
      ...baseState,
      error: "Chỉ quản trị viên mới có thể dịch menu.",
    };
  }

  const items = parseItems(input);
  if (items.length === 0) {
    return {
      ...baseState,
      error: "Vui lòng nhập ít nhất một món (mỗi món một dòng).",
    };
  }
  if (items.length > MAX_MENU_ITEMS) {
    return {
      ...baseState,
      error: `Tối đa ${MAX_MENU_ITEMS} món mỗi lần dịch (bạn đã nhập ${items.length}).`,
    };
  }

  try {
    const { translations } = await translateMenu(items);
    return {
      input,
      translations,
      error: null,
    };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Không dịch được menu. Vui lòng thử lại.";
    return { ...baseState, error: message };
  }
}
