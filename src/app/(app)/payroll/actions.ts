"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { formatVND } from "@/lib/utils";

export type BulkMarkPaidResult = {
  ok: boolean;
  marked: number;
  totalAmount: number;
  error?: string;
};

export async function bulkMarkPayrollPaid(ids: number[]): Promise<BulkMarkPaidResult> {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    return { ok: false, marked: 0, totalAmount: 0, error: "Chỉ admin được phép" };
  }

  const validIds = Array.from(
    new Set(ids.filter((n) => Number.isInteger(n) && n > 0)),
  );
  if (validIds.length === 0) {
    return { ok: false, marked: 0, totalAmount: 0, error: "Không có kỳ lương nào được chọn" };
  }
  if (validIds.length > 200) {
    return { ok: false, marked: 0, totalAmount: 0, error: "Tối đa 200 kỳ lương mỗi lần" };
  }

  try {
    const rows = await prisma.payroll.findMany({
      where: { id: { in: validIds } },
      select: {
        id: true,
        period: true,
        totalPay: true,
        employee: { select: { id: true, name: true } },
      },
    });

    if (rows.length === 0) {
      return { ok: false, marked: 0, totalAmount: 0, error: "Không tìm thấy bản ghi nào" };
    }

    const totalAmount = rows.reduce((sum, r) => sum + Number(r.totalPay), 0);
    const periods = Array.from(new Set(rows.map((r) => r.period))).sort();
    const periodLabel = periods.length === 1 ? periods[0] : `${periods.length} kỳ`;

    // Schema does not have paidAt or status fields on Payroll — use ActivityLog
    // as the system of record for "marked as paid".
    await logActivity({
      action: "payroll.bulk_mark_paid",
      entityType: "payroll",
      summary: `Admin đánh dấu ${rows.length} kỳ lương đã trả (${periodLabel}, tổng ${formatVND(totalAmount)})`,
      metadata: {
        payrollIds: rows.map((r) => r.id),
        employeeIds: rows.map((r) => r.employee.id),
        periods,
        totalAmount,
        markedAt: new Date().toISOString(),
      },
    });

    revalidatePath("/payroll");
    revalidatePath("/");

    return { ok: true, marked: rows.length, totalAmount };
  } catch (e) {
    return {
      ok: false,
      marked: 0,
      totalAmount: 0,
      error: e instanceof Error ? e.message : "Lỗi không xác định",
    };
  }
}

/**
 * Returns the set of payroll IDs that have been marked as paid via ActivityLog
 * (since the schema has no paidAt/status field).
 */
export async function getPaidPayrollIds(payrollIds: number[]): Promise<Set<number>> {
  if (payrollIds.length === 0) return new Set();
  const logs = await prisma.activityLog.findMany({
    where: { action: "payroll.bulk_mark_paid" },
    select: { metadata: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const paid = new Set<number>();
  const candidate = new Set(payrollIds);
  for (const log of logs) {
    const meta = log.metadata as { payrollIds?: unknown } | null;
    const list = meta?.payrollIds;
    if (Array.isArray(list)) {
      for (const v of list) {
        if (typeof v === "number" && candidate.has(v)) paid.add(v);
      }
    }
  }
  return paid;
}
