"use server";

import { getSession } from "@/lib/auth";
import { generateImage } from "@/lib/xai";

export type GeneratePlaygroundImageResult =
  | { ok: true; url: string; mimeType?: string }
  | { ok: false; error: string };

const MIN_LEN = 5;
const MAX_LEN = 500;
const SAFETY_PREFIX = "Cafe-themed, family-friendly: ";

export async function generatePlaygroundImageAction(
  prompt: string,
): Promise<GeneratePlaygroundImageResult> {
  const sess = await getSession();
  if (!sess) {
    return { ok: false, error: "Bạn cần đăng nhập để dùng tính năng này." };
  }
  if (sess.role !== "admin") {
    return { ok: false, error: "Chỉ quản trị viên mới có thể tạo ảnh." };
  }

  if (typeof prompt !== "string") {
    return { ok: false, error: "Mô tả không hợp lệ." };
  }
  const trimmed = prompt.trim();
  if (trimmed.length < MIN_LEN) {
    return {
      ok: false,
      error: `Mô tả phải có ít nhất ${MIN_LEN} ký tự.`,
    };
  }
  if (trimmed.length > MAX_LEN) {
    return {
      ok: false,
      error: `Mô tả không được vượt quá ${MAX_LEN} ký tự.`,
    };
  }

  const wrapped = `${SAFETY_PREFIX}${trimmed}`;

  try {
    const result = await generateImage(wrapped);
    return {
      ok: true,
      url: result.url,
      ...(result.mimeType ? { mimeType: result.mimeType } : {}),
    };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Không tạo được ảnh. Vui lòng thử lại.";
    return { ok: false, error: message };
  }
}
