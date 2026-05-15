"use server";

import { getSession } from "@/lib/auth";
import { generateAdBanner } from "@/lib/xai";
import {
  INITIAL_AD_BANNER_STATE,
  OFFER_MAX,
  PLATFORM_VALUES,
  STYLE_VALUES,
  THEME_MAX,
  THEME_MIN,
  type AdBannerState,
} from "./ad-banner-types";

export async function generateAdBannerAction(
  prevState: AdBannerState,
  formData: FormData,
): Promise<AdBannerState> {
  const rawTheme = formData.get("theme");
  const rawOffer = formData.get("offer");
  const rawStyle = formData.get("style");
  const rawPlatform = formData.get("platform");

  const theme =
    typeof rawTheme === "string" ? rawTheme.trim().replace(/\s+/g, " ") : "";
  const offer =
    typeof rawOffer === "string" ? rawOffer.trim().replace(/\s+/g, " ") : "";
  const style = typeof rawStyle === "string" ? rawStyle : "";
  const platform = typeof rawPlatform === "string" ? rawPlatform : "";

  const echoState: AdBannerState = {
    theme: theme || prevState.theme,
    offer: offer || prevState.offer,
    style: style || prevState.style || INITIAL_AD_BANNER_STATE.style,
    platform:
      platform || prevState.platform || INITIAL_AD_BANNER_STATE.platform,
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
      error: "Chỉ quản trị viên mới có thể tạo ad banner.",
    };
  }

  if (theme.length < THEME_MIN) {
    return {
      ...echoState,
      error: `Chủ đề ad banner cần ít nhất ${THEME_MIN} ký tự.`,
    };
  }
  if (theme.length > THEME_MAX) {
    return {
      ...echoState,
      error: `Chủ đề ad banner dài ${theme.length} ký tự (tối đa ${THEME_MAX}).`,
    };
  }
  if (offer.length > OFFER_MAX) {
    return {
      ...echoState,
      error: `Offer/CTA dài ${offer.length} ký tự (tối đa ${OFFER_MAX}).`,
    };
  }
  if (!STYLE_VALUES.includes(style as (typeof STYLE_VALUES)[number])) {
    return { ...echoState, error: "Phong cách không hợp lệ." };
  }
  if (
    !PLATFORM_VALUES.includes(platform as (typeof PLATFORM_VALUES)[number])
  ) {
    return { ...echoState, error: "Nền tảng quảng cáo không hợp lệ." };
  }

  try {
    const { url } = await generateAdBanner({ theme, style, platform });
    return {
      theme,
      offer,
      style,
      platform,
      imageUrl: url,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không tạo được ad banner. Vui lòng thử lại.";
    return { ...echoState, error: message };
  }
}
