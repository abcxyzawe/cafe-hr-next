"use server";

import { getSession } from "@/lib/auth";
import { generateSeoMeta } from "@/lib/xai";
import {
  INITIAL_SEO_META_STATE,
  parseUspsRaw,
  type SeoMetaState,
} from "./seo-meta-types";

export async function generateSeoMetaAction(
  prevState: SeoMetaState,
  formData: FormData,
): Promise<SeoMetaState> {
  const rawCafeName = formData.get("cafeName");
  const rawUsps = formData.get("usps");
  const cafeName =
    typeof rawCafeName === "string" ? rawCafeName.trim() : "";
  const uspsRaw = typeof rawUsps === "string" ? rawUsps : "";

  const baseState: SeoMetaState = {
    ...INITIAL_SEO_META_STATE,
    cafeName,
    uspsRaw,
  };

  const sess = await getSession();
  if (!sess) {
    return { ...baseState, error: "Bạn cần đăng nhập để dùng tính năng này." };
  }
  if (sess.role !== "admin") {
    return {
      ...baseState,
      error: "Chỉ quản trị viên mới có thể tạo SEO meta.",
    };
  }

  if (cafeName.length < 2 || cafeName.length > 60) {
    return {
      ...baseState,
      error: "Tên quán phải từ 2 đến 60 ký tự.",
    };
  }

  const usps = parseUspsRaw(uspsRaw);
  for (const u of usps) {
    if (u.length < 2 || u.length > 100) {
      return {
        ...baseState,
        error: "Mỗi USP phải từ 2 đến 100 ký tự.",
      };
    }
  }

  try {
    const result = await generateSeoMeta({ cafeName, usps });
    return {
      cafeName,
      uspsRaw,
      result,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không tạo được SEO meta. Vui lòng thử lại.";
    return { ...baseState, error: message };
  }
}
