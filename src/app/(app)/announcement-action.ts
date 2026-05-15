"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

const AnnouncementSeverityEnum = z.enum(["info", "success", "warning"]);

const AnnouncementInput = z.object({
  message: z.string().min(5).max(500),
  severity: AnnouncementSeverityEnum,
});

export type AnnouncementSeverity = z.infer<typeof AnnouncementSeverityEnum>;

export type AnnouncementResult = { ok: boolean; error?: string };

export async function broadcastAnnouncement(input: {
  message: string;
  severity: string;
}): Promise<AnnouncementResult> {
  const session = await getSession();
  if (!session) {
    return { ok: false, error: "Vui lòng đăng nhập" };
  }
  if (session.role !== "admin") {
    return { ok: false, error: "Chỉ quản trị viên mới có thể gửi thông báo" };
  }

  const parsed = AnnouncementInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Nội dung thông báo không hợp lệ (5–500 ký tự)",
    };
  }

  const { message, severity } = parsed.data;

  try {
    await logActivity({
      action: "announcement.broadcast",
      summary: `📢 ${session.name} thông báo: ${message.slice(0, 180)}`,
      metadata: {
        message,
        severity,
        senderId: session.uid,
        senderName: session.name,
      },
    });
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Lỗi không xác định",
    };
  }
}
