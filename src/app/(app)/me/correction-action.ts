"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

const TYPE_VALUES = [
  "missed_checkin",
  "missed_checkout",
  "wrong_time",
  "other",
] as const;

const TYPE_LABEL: Record<(typeof TYPE_VALUES)[number], string> = {
  missed_checkin: "Quên check-in",
  missed_checkout: "Quên check-out",
  wrong_time: "Sai giờ",
  other: "Lý do khác",
};

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ"),
  type: z.enum(TYPE_VALUES),
  note: z.string().min(5, "Vui lòng mô tả chi tiết (ít nhất 5 ký tự)").max(500),
  desiredCheckIn: z.string().optional(),
  desiredCheckOut: z.string().optional(),
});

export type CorrectionResult = { ok: boolean; error?: string };

export async function submitAttendanceCorrection(input: {
  date: string;
  type: string;
  note: string;
  desiredCheckIn?: string;
  desiredCheckOut?: string;
}): Promise<CorrectionResult> {
  const sess = await getSession();
  if (!sess) return { ok: false, error: "Vui lòng đăng nhập" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
    };
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

  // No backdating: only allow corrections for past 14 days
  const dateObj = new Date(parsed.data.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - 14);
  if (dateObj < cutoff || dateObj > today) {
    return {
      ok: false,
      error: "Chỉ có thể yêu cầu sửa cho 14 ngày gần nhất, không quá hôm nay",
    };
  }

  try {
    await logActivity({
      action: "attendance.correction_request",
      entityType: "employee",
      entityId: emp.id,
      summary: `📝 ${emp.name} yêu cầu sửa chấm công ${parsed.data.date} (${TYPE_LABEL[parsed.data.type]}): ${parsed.data.note.slice(0, 80)}${parsed.data.note.length > 80 ? "…" : ""}`,
      metadata: {
        employeeId: emp.id,
        employeeName: emp.name,
        date: parsed.data.date,
        type: parsed.data.type,
        note: parsed.data.note,
        desiredCheckIn: parsed.data.desiredCheckIn ?? null,
        desiredCheckOut: parsed.data.desiredCheckOut ?? null,
        status: "pending",
      },
    });
    revalidatePath("/me");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi" };
  }
}
