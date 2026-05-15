"use server";

import { getSession } from "@/lib/auth";
import { generateBlogPost } from "@/lib/xai";
import {
  INITIAL_BLOG_POST_STATE,
  isBlogPostAudience,
  isBlogPostLength,
  type BlogPostFormState,
} from "./blog-post-types";

function readString(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

export async function generateBlogPostAction(
  prevState: BlogPostFormState,
  formData: FormData,
): Promise<BlogPostFormState> {
  const topic = readString(formData, "topic").trim();
  const rawAudience = formData.get("audience");
  const rawLength = formData.get("length");
  const rawIncludeCta = formData.get("includeCta");
  const includeCta = rawIncludeCta === "on" || rawIncludeCta === "true";

  const audience = isBlogPostAudience(rawAudience)
    ? rawAudience
    : prevState.audience ?? INITIAL_BLOG_POST_STATE.audience;
  const length = isBlogPostLength(rawLength)
    ? rawLength
    : prevState.length ?? INITIAL_BLOG_POST_STATE.length;

  const echo: BlogPostFormState = {
    topic,
    audience,
    length,
    includeCta,
    data: null,
    error: null,
    generatedAt: null,
  };

  const sess = await getSession();
  if (!sess) {
    return { ...echo, error: "Bạn cần đăng nhập để dùng tính năng này." };
  }
  if (sess.role !== "admin") {
    return {
      ...echo,
      error: "Chỉ quản trị viên mới có thể tạo bài blog.",
    };
  }

  if (topic.length < 5 || topic.length > 200) {
    return { ...echo, error: "Chủ đề phải có độ dài 5-200 ký tự." };
  }
  if (!isBlogPostAudience(rawAudience)) {
    return { ...echo, error: "Đối tượng độc giả không hợp lệ." };
  }
  if (!isBlogPostLength(rawLength)) {
    return { ...echo, error: "Độ dài bài viết không hợp lệ." };
  }

  try {
    const data = await generateBlogPost({
      topic,
      audience,
      length,
      includeCta,
    });
    return {
      topic,
      audience,
      length,
      includeCta,
      data,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không tạo được bài blog. Vui lòng thử lại.";
    return { ...echo, error: message };
  }
}
