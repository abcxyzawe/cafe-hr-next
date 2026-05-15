"use server";

import { getSession } from "@/lib/auth";
import { generateAnnouncement } from "@/lib/xai";

export type ComposeAnnouncementState = {
  ok: boolean;
  draft?: string;
  error?: string;
};

const TONES = ["friendly", "formal", "urgent"] as const;
type Tone = (typeof TONES)[number];

function isTone(value: string): value is Tone {
  return (TONES as readonly string[]).includes(value);
}

export async function composeAnnouncementAction(
  _prevState: ComposeAnnouncementState,
  formData: FormData,
): Promise<ComposeAnnouncementState> {
  const session = await getSession();
  if (!session) {
    return { ok: false, error: "Vui lòng đăng nhập" };
  }
  if (session.role !== "admin") {
    return { ok: false, error: "Chỉ quản trị viên mới có thể soạn thông báo" };
  }

  const topicRaw = formData.get("topic");
  const toneRaw = formData.get("tone");

  const topic = typeof topicRaw === "string" ? topicRaw.trim() : "";
  const toneStr = typeof toneRaw === "string" ? toneRaw.trim() : "";

  if (topic.length < 3) {
    return { ok: false, error: "Chủ đề phải có ít nhất 3 ký tự" };
  }
  if (topic.length > 300) {
    return { ok: false, error: "Chủ đề tối đa 300 ký tự" };
  }
  if (!isTone(toneStr)) {
    return { ok: false, error: "Tông giọng không hợp lệ" };
  }

  try {
    const { content } = await generateAnnouncement({ topic, tone: toneStr });
    return { ok: true, draft: content };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không soạn được nháp",
    };
  }
}
