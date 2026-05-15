"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

const kudosSchema = z.object({
  employeeId: z.number().int().positive(),
  emoji: z.string().min(1).max(10),
  message: z.string().min(1, "Nội dung không được trống").max(200, "Tối đa 200 ký tự"),
});

export async function giveKudos(
  employeeId: number,
  emoji: string,
  message: string,
): Promise<{ ok: true }> {
  const sess = await getSession();
  if (!sess) throw new Error("Chưa đăng nhập");
  if (sess.role !== "admin") throw new Error("Chỉ admin mới có thể tặng lời khen");

  const parsed = kudosSchema.safeParse({ employeeId, emoji, message });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
  }

  const employee = await prisma.employee.findUnique({
    where: { id: parsed.data.employeeId },
    select: { id: true, name: true },
  });
  if (!employee) throw new Error("Không tìm thấy nhân viên");

  const safeMessage = parsed.data.message.slice(0, 100);
  await logActivity({
    action: "kudos.give",
    entityType: "employee",
    entityId: employee.id,
    summary: `${parsed.data.emoji} ${sess.name} tặng lời khen cho ${employee.name}: ${safeMessage}`,
    metadata: {
      emoji: parsed.data.emoji,
      message: parsed.data.message,
      recipientId: employee.id,
      recipientName: employee.name,
    },
  });

  revalidatePath(`/employees/${employee.id}`);
  return { ok: true };
}
