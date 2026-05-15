"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Nhập mật khẩu hiện tại"),
    newPassword: z.string().min(6, "Mật khẩu mới phải ≥ 6 ký tự"),
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirm"],
  });

export type PasswordState = { ok: boolean; error?: string };

export async function changePassword(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const sess = await getSession();
  if (!sess) return { ok: false, error: "Chưa đăng nhập" };

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const user = await prisma.user.findUnique({ where: { id: sess.uid } });
  if (!user) return { ok: false, error: "User không tồn tại" };

  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!ok) return { ok: false, error: "Mật khẩu hiện tại không đúng" };

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  });
  await logActivity({
    action: "user.password",
    entityType: "user",
    entityId: user.id,
    summary: `${user.name} đã đổi mật khẩu`,
  });
  return { ok: true };
}

const createUserSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  name: z.string().min(1, "Họ tên không được trống"),
  password: z.string().min(6, "Mật khẩu phải ≥ 6 ký tự"),
  role: z.enum(["admin", "staff"]),
});

export type CreateUserState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

async function requireAdmin() {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    throw new Error("Chỉ admin mới có quyền thực hiện");
  }
  return sess;
}

export async function createUser(
  _prev: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Forbidden" };
  }
  const parsed = createUserSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  try {
    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
    });
    if (existing) return { ok: false, error: "Email đã tồn tại" };
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const created = await prisma.user.create({
      data: {
        email: parsed.data.email.toLowerCase(),
        name: parsed.data.name,
        passwordHash,
        role: parsed.data.role,
      },
    });
    await logActivity({
      action: "user.create",
      entityType: "user",
      entityId: created.id,
      summary: `Tạo tài khoản ${created.email} (${created.role})`,
    });
    revalidatePath("/settings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi không xác định" };
  }
}

export async function cleanupActivityLog(
  retentionDays: number,
): Promise<{ deleted: number }> {
  await requireAdmin();
  const days = Math.max(7, Math.min(3650, Math.floor(retentionDays)));
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const result = await prisma.activityLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  // Self-log the cleanup (this entry survives since it's newer than cutoff)
  await logActivity({
    action: "admin.cleanup",
    summary: `Xoá ${result.count} activity log cũ hơn ${days} ngày`,
    metadata: { deleted: result.count, retentionDays: days },
  });
  revalidatePath("/settings");
  return { deleted: result.count };
}

export async function deleteUser(id: number) {
  const sess = await requireAdmin();
  if (sess.uid === id) throw new Error("Không thể tự xoá chính mình");
  const u = await prisma.user.findUnique({ where: { id }, select: { email: true } });
  await prisma.user.delete({ where: { id } });
  await logActivity({
    action: "user.delete",
    entityType: "user",
    entityId: id,
    summary: `Xoá tài khoản ${u?.email ?? `#${id}`}`,
  });
  revalidatePath("/settings");
}
