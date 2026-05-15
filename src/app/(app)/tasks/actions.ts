"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { encodeDescriptionWithTags, normalizeTags } from "@/lib/task-tags";

const createSchema = z.object({
  title: z.string().min(1, "Tiêu đề không được trống").max(200),
  description: z.string().max(2000).optional(),
  assigneeId: z.coerce.number().int().positive(),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  dueDate: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null)),
  tags: z.string().max(400).optional(),
});

export type TaskFormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

async function requireAdmin() {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") throw new Error("Chỉ admin được phép");
  return sess;
}

export async function createTask(
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  let sess;
  try {
    sess = await requireAdmin();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Forbidden" };
  }

  const parsed = createSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    assigneeId: formData.get("assigneeId"),
    priority: formData.get("priority"),
    dueDate: formData.get("dueDate") || null,
    tags: formData.get("tags") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const emp = await prisma.employee.findUnique({
      where: { id: parsed.data.assigneeId },
      select: { id: true, name: true },
    });
    if (!emp) return { ok: false, error: "Không tìm thấy nhân viên" };

    const tags = normalizeTags(parsed.data.tags);
    const description = encodeDescriptionWithTags(parsed.data.description, tags);

    const task = await prisma.task.create({
      data: {
        title: parsed.data.title,
        description,
        assigneeId: parsed.data.assigneeId,
        priority: parsed.data.priority,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        createdById: sess.uid,
        createdByName: sess.name,
      },
    });

    const tagSuffix = tags.length > 0 ? ` [${tags.join(", ")}]` : "";
    await logActivity({
      action: "task.create",
      entityType: "task",
      entityId: task.id,
      summary: `Giao việc "${task.title}" cho ${emp.name}${tagSuffix}`,
    });
    revalidatePath("/tasks");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi" };
  }
}

export async function toggleTask(id: number) {
  const sess = await getSession();
  if (!sess) throw new Error("Chưa đăng nhập");

  const task = await prisma.task.findUnique({
    where: { id },
    include: { assignee: { select: { name: true, email: true } } },
  });
  if (!task) throw new Error("Không tìm thấy task");

  // Staff may only toggle tasks assigned to their own employee profile.
  if (sess.role !== "admin") {
    const isOwnTask =
      !!task.assignee.email &&
      task.assignee.email.toLowerCase() === sess.email.toLowerCase();
    if (!isOwnTask) throw new Error("Bạn không có quyền cho task này");
  }

  if (task.completedAt) {
    // Reopen
    await prisma.task.update({
      where: { id },
      data: { completedAt: null, completedByName: null },
    });
    await logActivity({
      action: "task.uncomplete",
      entityType: "task",
      entityId: id,
      summary: `Mở lại task "${task.title}"`,
    });
  } else {
    await prisma.task.update({
      where: { id },
      data: { completedAt: new Date(), completedByName: sess.name },
    });
    await logActivity({
      action: "task.complete",
      entityType: "task",
      entityId: id,
      summary: `Hoàn thành "${task.title}" (${task.assignee.name})`,
    });
  }
  revalidatePath("/tasks");
  revalidatePath("/me");
  revalidatePath("/");
  return { ok: true as const };
}

export async function updateTaskTitle(
  id: number,
  newTitle: string,
): Promise<{ ok: boolean; error?: string }> {
  const sess = await getSession();
  if (!sess) return { ok: false, error: "Chưa đăng nhập" };

  const trimmed = newTitle.trim();
  if (trimmed.length < 1 || trimmed.length > 120) {
    return { ok: false, error: "Tiêu đề phải từ 1 đến 120 ký tự" };
  }

  try {
    const task = await prisma.task.findUnique({
      where: { id },
      include: { assignee: { select: { email: true } } },
    });
    if (!task) return { ok: false, error: "Không tìm thấy task" };

    if (sess.role !== "admin") {
      const isOwnTask =
        !!task.assignee.email &&
        task.assignee.email.toLowerCase() === sess.email.toLowerCase();
      if (!isOwnTask) {
        return { ok: false, error: "Bạn không có quyền sửa task này" };
      }
    }

    if (trimmed === task.title) {
      return { ok: true };
    }

    const oldTitle = task.title;
    await prisma.task.update({
      where: { id },
      data: { title: trimmed },
    });
    await logActivity({
      action: "task.update",
      entityType: "task",
      entityId: id,
      summary: `Sửa tiêu đề việc #${id}: ${oldTitle} → ${trimmed}`,
    });
    revalidatePath("/tasks");
    revalidatePath("/me");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi" };
  }
}

const bulkRecurringSchema = z
  .array(
    z.object({
      title: z.string().min(1).max(120),
      priority: z.enum(["low", "normal", "high", "urgent"]),
      assigneeId: z
        .number()
        .int()
        .positive()
        .nullable()
        .optional(),
    }),
  )
  .min(1)
  .max(20);

export async function bulkCreateTasksFromTemplates(
  payload: Array<{
    title: string;
    priority: "low" | "normal" | "high" | "urgent";
    assigneeId?: number | null;
  }>,
): Promise<{ ok: boolean; created: number; error?: string }> {
  let sess;
  try {
    sess = await requireAdmin();
  } catch (e) {
    return {
      ok: false,
      created: 0,
      error: e instanceof Error ? e.message : "Forbidden",
    };
  }

  const parsed = bulkRecurringSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, created: 0, error: "Dữ liệu không hợp lệ" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86400000);

  try {
    // Resolve assignees: only entries with a valid existing employee are usable.
    const requestedIds = Array.from(
      new Set(
        parsed.data
          .map((p) => p.assigneeId)
          .filter((v): v is number => typeof v === "number"),
      ),
    );
    const employees =
      requestedIds.length > 0
        ? await prisma.employee.findMany({
            where: { id: { in: requestedIds } },
            select: { id: true },
          })
        : [];
    const validIds = new Set(employees.map((e) => e.id));

    let created = 0;
    for (const entry of parsed.data) {
      if (typeof entry.assigneeId !== "number") continue;
      if (!validIds.has(entry.assigneeId)) continue;

      const dup = await prisma.task.findFirst({
        where: {
          title: entry.title,
          assigneeId: entry.assigneeId,
          dueDate: today,
          OR: [
            { completedAt: null },
            { completedAt: { gte: today, lt: tomorrow } },
          ],
        },
        select: { id: true },
      });
      if (dup) continue;

      await prisma.task.create({
        data: {
          title: entry.title,
          assigneeId: entry.assigneeId,
          priority: entry.priority,
          dueDate: today,
          createdById: sess.uid,
          createdByName: sess.name,
        },
      });
      created += 1;
    }

    if (created > 0) {
      await logActivity({
        action: "task.bulk_create_recurring",
        entityType: "task",
        summary: `Tạo ${created} việc định kỳ`,
      });
      revalidatePath("/tasks");
      revalidatePath("/me");
    }
    return { ok: true, created };
  } catch (e) {
    return {
      ok: false,
      created: 0,
      error: e instanceof Error ? e.message : "Lỗi",
    };
  }
}

export async function deleteTask(id: number) {
  await requireAdmin();
  const task = await prisma.task.findUnique({
    where: { id },
    select: { title: true },
  });
  await prisma.task.delete({ where: { id } });
  await logActivity({
    action: "task.delete",
    entityType: "task",
    entityId: id,
    summary: `Xoá task "${task?.title ?? id}"`,
  });
  revalidatePath("/tasks");
  revalidatePath("/");
}
