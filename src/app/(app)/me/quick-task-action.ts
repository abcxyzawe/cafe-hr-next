"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

const schema = z.object({
  title: z.string().trim().min(1, "Tiêu đề không được trống").max(120),
  dueDate: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null)),
  priority: z.enum(["low", "normal", "high", "urgent"]),
});

export type QuickTaskInput = {
  title: string;
  dueDate?: string | null;
  priority: "low" | "normal" | "high" | "urgent";
};

export type QuickTaskResult = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createTaskForSelf(
  input: QuickTaskInput,
): Promise<QuickTaskResult> {
  const sess = await getSession();
  if (!sess) return { ok: false, error: "Chưa đăng nhập" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const employee = await prisma.employee.findFirst({
      where: { email: sess.email },
      select: { id: true, name: true },
    });
    if (!employee) {
      return {
        ok: false,
        error: "Tài khoản của bạn chưa được liên kết với hồ sơ nhân viên",
      };
    }

    const task = await prisma.task.create({
      data: {
        title: parsed.data.title,
        assigneeId: employee.id,
        priority: parsed.data.priority,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        createdById: sess.uid,
        createdByName: sess.name,
      },
    });

    await logActivity({
      action: "task.create",
      entityType: "task",
      entityId: task.id,
      summary: `${employee.name} tự giao việc: ${task.title}`,
      metadata: { source: "self-assigned" },
    });

    revalidatePath("/me");
    revalidatePath("/tasks");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi" };
  }
}
