"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export type MissingAvatarEmployee = {
  id: number;
  name: string;
  role: string;
};

export async function listMissingAvatarEmployeesAction(): Promise<{
  ok: boolean;
  employees?: MissingAvatarEmployee[];
  error?: string;
}> {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    return { ok: false, error: "Chỉ admin được phép" };
  }
  try {
    const employees = await prisma.employee.findMany({
      where: { avatarUrl: null },
      select: { id: true, name: true, role: true },
      orderBy: { id: "asc" },
    });
    return { ok: true, employees };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Lỗi không xác định",
    };
  }
}
