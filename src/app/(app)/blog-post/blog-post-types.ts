import type { BlogPostData } from "@/lib/xai";

export type BlogPostAudience =
  | "general"
  | "coffee-enthusiast"
  | "cafe-owner"
  | "barista-trainee";

export type BlogPostLength = "short" | "medium" | "long";

export const BLOG_POST_AUDIENCES: ReadonlyArray<{
  value: BlogPostAudience;
  label: string;
  hint: string;
}> = [
  {
    value: "general",
    label: "Khách đại chúng",
    hint: "Người yêu cà phê nói chung",
  },
  {
    value: "coffee-enthusiast",
    label: "Người đam mê cà phê",
    hint: "Coffee enthusiast, muốn hiểu sâu",
  },
  {
    value: "cafe-owner",
    label: "Chủ quán cà phê",
    hint: "Đang vận hành kinh doanh",
  },
  {
    value: "barista-trainee",
    label: "Học viên barista",
    hint: "Mới vào nghề pha chế",
  },
];

export const BLOG_POST_LENGTHS: ReadonlyArray<{
  value: BlogPostLength;
  label: string;
  hint: string;
}> = [
  { value: "short", label: "Ngắn", hint: "Khoảng 300 từ" },
  { value: "medium", label: "Vừa", hint: "Khoảng 500 từ" },
  { value: "long", label: "Dài", hint: "Khoảng 800 từ" },
];

export type BlogPostFormState = {
  topic: string;
  audience: BlogPostAudience;
  length: BlogPostLength;
  includeCta: boolean;
  data: BlogPostData | null;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_BLOG_POST_STATE: BlogPostFormState = {
  topic: "",
  audience: "general",
  length: "medium",
  includeCta: true,
  data: null,
  error: null,
  generatedAt: null,
};

export function isBlogPostAudience(v: unknown): v is BlogPostAudience {
  return (
    typeof v === "string" &&
    BLOG_POST_AUDIENCES.some((a) => a.value === v)
  );
}

export function isBlogPostLength(v: unknown): v is BlogPostLength {
  return (
    typeof v === "string" &&
    BLOG_POST_LENGTHS.some((l) => l.value === v)
  );
}
