"use server";

import { getSession } from "@/lib/auth";
import { generateMenuIllustration } from "@/lib/xai";
import {
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  INITIAL_MENU_ILLUSTRATE_STATE,
  ITEM_NAME_MAX,
  ITEM_NAME_MIN,
  STYLE_VALUES,
  type MenuIllustrateState,
} from "./menu-illustrate-types";

export async function generateMenuIllustrationAction(
  prevState: MenuIllustrateState,
  formData: FormData,
): Promise<MenuIllustrateState> {
  const rawName = formData.get("itemName");
  const rawDesc = formData.get("description");
  const rawStyle = formData.get("style");

  const itemName =
    typeof rawName === "string" ? rawName.trim().replace(/\s+/g, " ") : "";
  const description =
    typeof rawDesc === "string" ? rawDesc.trim().replace(/\s+/g, " ") : "";
  const style = typeof rawStyle === "string" ? rawStyle : "";

  const echoState: MenuIllustrateState = {
    itemName: itemName || prevState.itemName,
    description: description || prevState.description,
    style:
      style || prevState.style || INITIAL_MENU_ILLUSTRATE_STATE.style,
    imageUrl: null,
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
      error: "Chỉ quản trị viên mới có thể tạo minh họa món.",
    };
  }

  if (itemName.length < ITEM_NAME_MIN) {
    return {
      ...echoState,
      error: `Tên món cần ít nhất ${ITEM_NAME_MIN} ký tự.`,
    };
  }
  if (itemName.length > ITEM_NAME_MAX) {
    return {
      ...echoState,
      error: `Tên món dài ${itemName.length} ký tự (tối đa ${ITEM_NAME_MAX}).`,
    };
  }
  if (description.length < DESCRIPTION_MIN) {
    return {
      ...echoState,
      error: `Mô tả cần ít nhất ${DESCRIPTION_MIN} ký tự.`,
    };
  }
  if (description.length > DESCRIPTION_MAX) {
    return {
      ...echoState,
      error: `Mô tả dài ${description.length} ký tự (tối đa ${DESCRIPTION_MAX}).`,
    };
  }
  if (!STYLE_VALUES.includes(style as (typeof STYLE_VALUES)[number])) {
    return { ...echoState, error: "Phong cách không hợp lệ." };
  }

  try {
    const { url } = await generateMenuIllustration({
      itemName,
      description,
      style,
    });
    return {
      itemName,
      description,
      style,
      imageUrl: url,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không tạo được minh họa. Vui lòng thử lại.";
    return { ...echoState, error: message };
  }
}
