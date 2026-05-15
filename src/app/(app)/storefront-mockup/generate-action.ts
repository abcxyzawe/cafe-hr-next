"use server";

import { getSession } from "@/lib/auth";
import { generateStorefrontMockup } from "@/lib/xai";
import {
  EMPHASIZE_VALUES,
  FACADE_VALUES,
  INITIAL_STOREFRONT_STATE,
  STYLE_VALUES,
  type StorefrontState,
} from "./storefront-types";

export async function generateStorefrontAction(
  prevState: StorefrontState,
  formData: FormData,
): Promise<StorefrontState> {
  const rawName = formData.get("cafeName");
  const rawStyle = formData.get("style");
  const rawFacade = formData.get("facadeType");
  const rawEmphasize = formData.get("emphasize");

  const cafeName = typeof rawName === "string" ? rawName.trim() : "";
  const style = typeof rawStyle === "string" ? rawStyle : "";
  const facadeType = typeof rawFacade === "string" ? rawFacade : "";
  const emphasize = typeof rawEmphasize === "string" ? rawEmphasize : "";

  const echoState: StorefrontState = {
    cafeName: cafeName || prevState.cafeName,
    style: style || prevState.style || INITIAL_STOREFRONT_STATE.style,
    facadeType:
      facadeType ||
      prevState.facadeType ||
      INITIAL_STOREFRONT_STATE.facadeType,
    emphasize:
      emphasize ||
      prevState.emphasize ||
      INITIAL_STOREFRONT_STATE.emphasize,
    result: null,
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
      error: "Chỉ quản trị viên mới có thể tạo mockup mặt tiền.",
    };
  }

  if (cafeName.length < 2 || cafeName.length > 30) {
    return {
      ...echoState,
      error: `Tên quán phải dài 2-30 ký tự (hiện ${cafeName.length}).`,
    };
  }

  if (!STYLE_VALUES.includes(style)) {
    return { ...echoState, error: "Phong cách không hợp lệ." };
  }
  if (!FACADE_VALUES.includes(facadeType)) {
    return { ...echoState, error: "Kiểu mặt tiền không hợp lệ." };
  }
  if (!EMPHASIZE_VALUES.includes(emphasize)) {
    return { ...echoState, error: "Yếu tố nhấn mạnh không hợp lệ." };
  }

  try {
    const result = await generateStorefrontMockup({
      cafeName,
      style,
      facadeType,
      emphasize,
    });
    return {
      cafeName,
      style,
      facadeType,
      emphasize,
      result,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không tạo được mockup mặt tiền. Vui lòng thử lại.";
    return { ...echoState, error: message };
  }
}
