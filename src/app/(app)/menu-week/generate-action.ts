"use server";

import { getSession } from "@/lib/auth";
import { generateWeeklyMenu } from "@/lib/xai";
import {
  INITIAL_MENU_WEEK_STATE,
  isMenuWeekFocus,
  isMenuWeekSeason,
  type MenuWeekState,
} from "./menu-week-types";

export async function generateWeeklyMenuAction(
  prevState: MenuWeekState,
  formData: FormData,
): Promise<MenuWeekState> {
  const rawSeason = formData.get("season");
  const rawFocus = formData.get("focus");

  const season = isMenuWeekSeason(rawSeason)
    ? rawSeason
    : prevState.season ?? INITIAL_MENU_WEEK_STATE.season;
  const focus = isMenuWeekFocus(rawFocus)
    ? rawFocus
    : prevState.focus ?? INITIAL_MENU_WEEK_STATE.focus;

  const baseState: MenuWeekState = {
    season,
    focus,
    days: null,
    error: null,
    generatedAt: null,
  };

  const sess = await getSession();
  if (!sess) {
    return { ...baseState, error: "Bạn cần đăng nhập để dùng tính năng này." };
  }
  if (sess.role !== "admin") {
    return {
      ...baseState,
      error: "Chỉ quản trị viên mới có thể tạo menu tuần.",
    };
  }

  if (!isMenuWeekSeason(rawSeason)) {
    return { ...baseState, error: "Mùa không hợp lệ." };
  }
  if (!isMenuWeekFocus(rawFocus)) {
    return { ...baseState, error: "Chủ đề không hợp lệ." };
  }

  try {
    const { days } = await generateWeeklyMenu({ season, focus });
    return {
      season,
      focus,
      days,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không tạo được menu tuần. Vui lòng thử lại.";
    return { ...baseState, error: message };
  }
}
