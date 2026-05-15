"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

const createSchema = z
  .object({
    employeeId: z.coerce.number().int().positive(),
    type: z.enum(["annual", "sick", "personal", "unpaid"]),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày bắt đầu không hợp lệ"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày kết thúc không hợp lệ"),
    reason: z.string().max(500).optional(),
  })
  .refine((v) => v.startDate <= v.endDate, {
    message: "Ngày kết thúc phải >= ngày bắt đầu",
    path: ["endDate"],
  });

export type LeaveFormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createLeaveRequest(
  _prev: LeaveFormState,
  formData: FormData,
): Promise<LeaveFormState> {
  const parsed = createSchema.safeParse({
    employeeId: formData.get("employeeId"),
    type: formData.get("type"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const emp = await prisma.employee.findUnique({
      where: { id: parsed.data.employeeId },
      select: { id: true, name: true },
    });
    if (!emp) return { ok: false, error: "Không tìm thấy nhân viên" };

    const req = await prisma.leaveRequest.create({
      data: {
        employeeId: parsed.data.employeeId,
        type: parsed.data.type,
        startDate: new Date(parsed.data.startDate),
        endDate: new Date(parsed.data.endDate),
        reason: parsed.data.reason ?? null,
      },
    });

    await logActivity({
      action: "leave.create",
      entityType: "leave",
      entityId: req.id,
      summary: `Tạo đơn nghỉ ${parsed.data.type} cho ${emp.name} (${parsed.data.startDate} – ${parsed.data.endDate})`,
    });

    revalidatePath("/leave");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi" };
  }
}

async function requireAdmin() {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") throw new Error("Chỉ admin được phép");
  return sess;
}

const ownSchema = z
  .object({
    type: z.enum(["annual", "sick", "personal", "unpaid"]),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày bắt đầu không hợp lệ"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày kết thúc không hợp lệ"),
    reason: z.string().max(500).optional(),
  })
  .refine((v) => v.startDate <= v.endDate, {
    message: "Ngày kết thúc phải >= ngày bắt đầu",
    path: ["endDate"],
  });

/**
 * Submit a leave request for the currently signed-in user — auto-links
 * to their Employee row by email. Used by the staff /me page.
 */
export async function createOwnLeaveRequest(input: {
  type: string;
  startDate: string;
  endDate: string;
  reason?: string;
}): Promise<LeaveFormState> {
  const sess = await getSession();
  if (!sess) return { ok: false, error: "Vui lòng đăng nhập" };

  const parsed = ownSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const emp = await prisma.employee.findFirst({
    where: { email: sess.email },
    select: { id: true, name: true },
  });
  if (!emp) {
    return {
      ok: false,
      error: "Tài khoản chưa liên kết với hồ sơ nhân viên — liên hệ admin",
    };
  }

  try {
    const req = await prisma.leaveRequest.create({
      data: {
        employeeId: emp.id,
        type: parsed.data.type,
        startDate: new Date(parsed.data.startDate),
        endDate: new Date(parsed.data.endDate),
        reason: parsed.data.reason?.trim() || null,
      },
    });
    await logActivity({
      action: "leave.create",
      entityType: "leave",
      entityId: req.id,
      summary: `${emp.name} gửi đơn nghỉ ${parsed.data.type} (${parsed.data.startDate} – ${parsed.data.endDate})`,
    });
    revalidatePath("/me");
    revalidatePath("/leave");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi" };
  }
}

export async function approveLeave(id: number) {
  const sess = await requireAdmin();
  const req = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { employee: { select: { name: true } } },
  });
  if (!req) throw new Error("Không tìm thấy đơn");
  if (req.status !== "pending") throw new Error("Đơn này đã được xử lý");

  await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: "approved",
      decidedAt: new Date(),
      decidedById: sess.uid,
    },
  });
  await logActivity({
    action: "leave.approve",
    entityType: "leave",
    entityId: id,
    summary: `Duyệt đơn nghỉ của ${req.employee.name}`,
  });
  revalidatePath("/leave");
  revalidatePath("/");
}

export async function rejectLeave(id: number) {
  const sess = await requireAdmin();
  const req = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { employee: { select: { name: true } } },
  });
  if (!req) throw new Error("Không tìm thấy đơn");
  if (req.status !== "pending") throw new Error("Đơn này đã được xử lý");

  await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: "rejected",
      decidedAt: new Date(),
      decidedById: sess.uid,
    },
  });
  await logActivity({
    action: "leave.reject",
    entityType: "leave",
    entityId: id,
    summary: `Từ chối đơn nghỉ của ${req.employee.name}`,
  });
  revalidatePath("/leave");
  revalidatePath("/");
}

const bulkIdsSchema = z
  .array(z.number().int().positive())
  .min(1, "Chưa chọn đơn nào")
  .max(50, "Tối đa 50 đơn mỗi lần");

export type BulkLeaveResult = { ok: true; processed: number };

async function bulkDecide(
  ids: number[],
  next: "approved" | "rejected",
): Promise<BulkLeaveResult> {
  const sess = await requireAdmin();
  const parsed = bulkIdsSchema.safeParse(ids);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Danh sách không hợp lệ");
  }
  const uniqueIds = Array.from(new Set(parsed.data));

  const processed = await prisma.$transaction(async (tx) => {
    const pending = await tx.leaveRequest.findMany({
      where: { id: { in: uniqueIds }, status: "pending" },
      select: { id: true },
    });
    if (pending.length === 0) return 0;
    const pendingIds = pending.map((p) => p.id);
    const result = await tx.leaveRequest.updateMany({
      where: { id: { in: pendingIds }, status: "pending" },
      data: {
        status: next,
        decidedAt: new Date(),
        decidedById: sess.uid,
      },
    });
    return result.count;
  });

  if (processed > 0) {
    const verb = next === "approved" ? "Duyệt" : "Từ chối";
    await logActivity({
      action: next === "approved" ? "leave.bulk_approve" : "leave.bulk_reject",
      entityType: "leave",
      summary: `${verb} ${processed} đơn nghỉ`,
      metadata: { ids: uniqueIds, count: processed },
    });
  }

  revalidatePath("/leave");
  revalidatePath("/");
  return { ok: true, processed };
}

export async function bulkApproveLeaves(ids: number[]): Promise<BulkLeaveResult> {
  return bulkDecide(ids, "approved");
}

export async function bulkRejectLeaves(ids: number[]): Promise<BulkLeaveResult> {
  return bulkDecide(ids, "rejected");
}

export async function deleteLeave(id: number) {
  await requireAdmin();
  const req = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { employee: { select: { name: true } } },
  });
  if (!req) return;
  await prisma.leaveRequest.delete({ where: { id } });
  await logActivity({
    action: "leave.delete",
    entityType: "leave",
    entityId: id,
    summary: `Xoá đơn nghỉ của ${req.employee.name}`,
  });
  revalidatePath("/leave");
  revalidatePath("/");
}
