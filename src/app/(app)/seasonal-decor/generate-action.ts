"use server";

import { getSession } from "@/lib/auth";
import { generateSeasonalDecor } from "@/lib/xai";
import {
  HOLIDAY_VALUES,
  INITIAL_SEASONAL_DECOR_STATE,
  PLACEMENT_COUNT,
  SEASON_VALUES,
  type SeasonalDecorState,
} from "./seasonal-decor-types";

export async function generateSeasonalDecorAction(
  prevState: SeasonalDecorState,
  formData: FormData,
): Promise<SeasonalDecorState> {
  const rawSeason = formData.get("season");
  const rawHoliday = formData.get("holiday");

  const season = typeof rawSeason === "string" ? rawSeason : "";
  const holiday = typeof rawHoliday === "string" ? rawHoliday : "";

  const echoState: SeasonalDecorState = {
    season:
      season || prevState.season || INITIAL_SEASONAL_DECOR_STATE.season,
    holiday:
      holiday || prevState.holiday || INITIAL_SEASONAL_DECOR_STATE.holiday,
    result: null,
    requested: PLACEMENT_COUNT,
    error: null,
    generatedAt: null,
  };

  const sess = await getSession();
  if (!sess) {
    return {
      ...echoState,
      error: "Bạn cần đăng nhập để dùng tính năng này.",
    };
  }
  if (sess.role !== "admin") {
    return {
      ...echoState,
      error: "Chỉ quản trị viên mới có thể sinh concept trang trí.",
    };
  }

  if (!SEASON_VALUES.includes(season)) {
    return { ...echoState, error: "Mùa không hợp lệ." };
  }
  if (!HOLIDAY_VALUES.includes(holiday)) {
    return { ...echoState, error: "Bối cảnh lễ hội không hợp lệ." };
  }

  try {
    const result = await generateSeasonalDecor({ season, holiday });
    return {
      season,
      holiday,
      result,
      requested: PLACEMENT_COUNT,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không sinh được concept. Vui lòng thử lại.";
    return { ...echoState, error: message };
  }
}
