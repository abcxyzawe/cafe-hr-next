"use server";

import { getSession } from "@/lib/auth";
import { generateMenuIdeas } from "@/lib/xai";
import {
  INITIAL_MENU_IDEAS_STATE,
  isMenuIdeaFlavor,
  isMenuIdeaSeason,
  type MenuIdeasState,
} from "./ideas-types";

export async function generateMenuIdeasAction(
  prevState: MenuIdeasState,
  formData: FormData,
): Promise<MenuIdeasState> {
  const rawSeason = formData.get("season");
  const rawFlavor = formData.get("flavor");

  const season = isMenuIdeaSeason(rawSeason)
    ? rawSeason
    : prevState.season ?? INITIAL_MENU_IDEAS_STATE.season;
  const flavor = isMenuIdeaFlavor(rawFlavor)
    ? rawFlavor
    : prevState.flavor ?? INITIAL_MENU_IDEAS_STATE.flavor;

  const baseState: MenuIdeasState = {
    season,
    flavor,
    ideas: null,
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
      error: "Chỉ quản trị viên mới có thể tạo ý tưởng menu.",
    };
  }

  if (!isMenuIdeaSeason(rawSeason)) {
    return { ...baseState, error: "Mùa không hợp lệ." };
  }
  if (!isMenuIdeaFlavor(rawFlavor)) {
    return { ...baseState, error: "Phong cách hương vị không hợp lệ." };
  }

  try {
    const { ideas } = await generateMenuIdeas({ season, flavor });
    return {
      season,
      flavor,
      ideas,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không tạo được ý tưởng menu. Vui lòng thử lại.";
    return { ...baseState, error: message };
  }
}
