"use server";

import { z } from "zod";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

const FeedbackCategory = z.enum(["bug", "feature", "praise", "other"]);

const FeedbackInput = z.object({
  category: FeedbackCategory,
  message: z.string().min(5).max(2000),
  pageUrl: z.string().max(500).optional(),
});

export type FeedbackResult = { ok: boolean; error?: string };

export async function submitFeedback(input: {
  category: string;
  message: string;
  pageUrl?: string;
}): Promise<FeedbackResult> {
  const sess = await getSession();
  if (!sess) return { ok: false, error: "Vui lòng đăng nhập" };

  const parsed = FeedbackInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Nội dung phản hồi không hợp lệ (5–2000 ký tự)" };
  }

  const { category, message, pageUrl } = parsed.data;
  const categoryLabel: Record<typeof category, string> = {
    bug: "Báo lỗi",
    feature: "Đề xuất tính năng",
    praise: "Lời khen",
    other: "Khác",
  };

  try {
    await logActivity({
      action: "user.feedback",
      entityType: "user",
      entityId: sess.uid,
      summary: `${sess.name} gửi phản hồi (${categoryLabel[category]}): ${message.slice(0, 120)}${message.length > 120 ? "…" : ""}`,
      metadata: {
        category,
        message,
        pageUrl: pageUrl ?? null,
        userAgent: null,
      },
    });
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Lỗi không xác định",
    };
  }
}
