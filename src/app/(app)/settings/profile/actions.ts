"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

export type ActionResult = { ok: boolean; error?: string };

const displayNameSchema = z
  .string()
  .trim()
  .min(2, "Tên hiển thị phải có ít nhất 2 ký tự")
  .max(80, "Tên hiển thị tối đa 80 ký tự");

export async function updateDisplayName(name: string): Promise<ActionResult> {
  try {
    const sess = await getSession();
    if (!sess) return { ok: false, error: "Chưa đăng nhập" };

    const parsed = displayNameSchema.safeParse(name);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Tên không hợp lệ",
      };
    }

    const current = await prisma.user.findUnique({
      where: { id: sess.uid },
      select: { name: true },
    });
    if (!current) return { ok: false, error: "Tài khoản không tồn tại" };

    const newName = parsed.data;
    if (current.name === newName) {
      return { ok: true };
    }

    await prisma.user.update({
      where: { id: sess.uid },
      data: { name: newName },
    });

    await logActivity({
      action: "user.update",
      entityType: "user",
      entityId: sess.uid,
      summary: `${current.name} đổi tên thành ${newName}`,
    });

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Lỗi không xác định",
    };
  }
}

const passwordSchema = z
  .object({
    currentPwd: z.string().min(1, "Nhập mật khẩu hiện tại"),
    newPwd: z.string().min(8, "Mật khẩu mới phải có ít nhất 8 ký tự"),
  });

export async function changePassword(
  currentPwd: string,
  newPwd: string,
): Promise<ActionResult> {
  try {
    const sess = await getSession();
    if (!sess) return { ok: false, error: "Chưa đăng nhập" };

    const parsed = passwordSchema.safeParse({ currentPwd, newPwd });
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: sess.uid },
      select: { id: true, name: true, passwordHash: true },
    });
    if (!user) return { ok: false, error: "Tài khoản không tồn tại" };

    const matches = await bcrypt.compare(parsed.data.currentPwd, user.passwordHash);
    if (!matches) {
      return { ok: false, error: "Mật khẩu hiện tại không đúng" };
    }

    const sameAsOld = await bcrypt.compare(parsed.data.newPwd, user.passwordHash);
    if (sameAsOld) {
      return { ok: false, error: "Mật khẩu mới không được trùng mật khẩu cũ" };
    }

    const newHash = await bcrypt.hash(parsed.data.newPwd, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    await logActivity({
      action: "user.password_change",
      entityType: "user",
      entityId: user.id,
      summary: `${user.name} đã đổi mật khẩu`,
    });

    revalidatePath("/settings/profile");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Lỗi không xác định",
    };
  }
}
