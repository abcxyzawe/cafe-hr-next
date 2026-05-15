"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { getSession } from "@/lib/auth";

const shiftSchema = z.object({
  employeeId: z.coerce.number().int().positive(),
  shiftDate: z.string().min(1),
  shiftType: z.enum(["morning", "afternoon", "evening"]).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

export type ShiftFormState = {
  ok: boolean;
  error?: string;
  warning?: string;
};

const SHIFT_DEFAULT_TIMES: Record<string, [string, string]> = {
  morning: ["07:00", "12:00"],
  afternoon: ["12:00", "17:00"],
  evening: ["17:00", "22:00"],
};

export async function createShift(
  _prev: ShiftFormState,
  formData: FormData,
): Promise<ShiftFormState> {
  const parsed = shiftSchema.safeParse({
    employeeId: formData.get("employeeId"),
    shiftDate: formData.get("shiftDate"),
    shiftType: formData.get("shiftType") || undefined,
    startTime: formData.get("startTime") || undefined,
    endTime: formData.get("endTime") || undefined,
  });
  if (!parsed.success) return { ok: false, error: "Dữ liệu không hợp lệ" };
  const { employeeId, shiftDate, shiftType, startTime, endTime } = parsed.data;
  const defaults = shiftType ? SHIFT_DEFAULT_TIMES[shiftType] : undefined;

  // Conflict detection: warn if employee has approved leave OR a duplicate shift
  let warning: string | undefined;
  const shiftDateObj = new Date(shiftDate);
  const dayStart = new Date(shiftDateObj);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const [conflictingLeave, conflictingShift] = await Promise.all([
    prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        status: "approved",
        startDate: { lte: shiftDateObj },
        endDate: { gte: shiftDateObj },
      },
      include: { employee: { select: { name: true } } },
    }),
    shiftType
      ? prisma.shift.findFirst({
          where: {
            employeeId,
            shiftDate: { gte: dayStart, lt: dayEnd },
            shiftType,
          },
          include: { employee: { select: { name: true } } },
        })
      : Promise.resolve(null),
  ]);

  if (conflictingShift) {
    warning = `${conflictingShift.employee.name} đã có ca ${conflictingShift.shiftType} ngày ${shiftDate} — sẽ tạo ca thứ hai trùng giờ`;
  } else if (conflictingLeave) {
    warning = `${conflictingLeave.employee.name} có đơn nghỉ ${conflictingLeave.type} đã duyệt trùng ngày ${shiftDate}`;
  }

  try {
    await prisma.shift.create({
      data: {
        employeeId,
        shiftDate: shiftDateObj,
        shiftType: shiftType ?? null,
        startTime: startTime || defaults?.[0] || null,
        endTime: endTime || defaults?.[1] || null,
      },
    });
    revalidatePath("/shifts");
    revalidatePath("/");
    return { ok: true, warning };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi không xác định" };
  }
}

const SHIFT_DEFAULT_TIMES_MAP: Record<string, [string, string]> = {
  morning: ["07:00", "12:00"],
  afternoon: ["12:00", "17:00"],
  evening: ["17:00", "22:00"],
};

/**
 * Move (or change shift type of) an existing shift to a new date + type.
 * Skip-no-op if same date+type. Detect conflict (same employee already has
 * a shift on target date with target type) and return error (don't create dup).
 */
export async function moveShift(
  id: number,
  newDateIso: string,
  newType: "morning" | "afternoon" | "evening",
): Promise<{ ok: boolean; error?: string; warning?: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newDateIso)) {
    return { ok: false, error: "Ngày không hợp lệ" };
  }
  if (!["morning", "afternoon", "evening"].includes(newType)) {
    return { ok: false, error: "Loại ca không hợp lệ" };
  }

  const shift = await prisma.shift.findUnique({
    where: { id },
    include: { employee: { select: { name: true } } },
  });
  if (!shift) return { ok: false, error: "Không tìm thấy ca" };

  const currentDateIso = shift.shiftDate.toISOString().slice(0, 10);
  if (currentDateIso === newDateIso && shift.shiftType === newType) {
    return { ok: true };
  }

  const newDate = new Date(newDateIso);
  newDate.setHours(0, 0, 0, 0);
  const dayEnd = new Date(newDate);
  dayEnd.setDate(dayEnd.getDate() + 1);

  // Prevent duplicate: same employee already has shift on target date + type
  const dup = await prisma.shift.findFirst({
    where: {
      id: { not: id },
      employeeId: shift.employeeId,
      shiftDate: { gte: newDate, lt: dayEnd },
      shiftType: newType,
    },
  });
  if (dup) {
    return {
      ok: false,
      error: `${shift.employee.name} đã có ca ${newType} vào ngày này — không thể chuyển đến`,
    };
  }

  // Conflict check: approved leave on target date (warn, don't block)
  let warning: string | undefined;
  const leave = await prisma.leaveRequest.findFirst({
    where: {
      employeeId: shift.employeeId,
      status: "approved",
      startDate: { lte: newDate },
      endDate: { gte: newDate },
    },
  });
  if (leave) {
    warning = `${shift.employee.name} có đơn nghỉ ${leave.type} đã duyệt trùng ngày ${newDateIso}`;
  }

  const [start, end] = SHIFT_DEFAULT_TIMES_MAP[newType];
  await prisma.shift.update({
    where: { id },
    data: {
      shiftDate: newDate,
      shiftType: newType,
      startTime: start,
      endTime: end,
    },
  });

  await logActivity({
    action: "shift.move",
    entityType: "shift",
    entityId: id,
    summary: `Chuyển ca của ${shift.employee.name}: ${currentDateIso} ${shift.shiftType} → ${newDateIso} ${newType}`,
  });
  revalidatePath("/shifts");
  revalidatePath("/");
  return { ok: true, warning };
}

function parseCsv(text: string): string[][] {
  const cleaned = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let cur: string[] = [];
  let val = "";
  let inQuotes = false;
  for (let i = 0; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (inQuotes) {
      if (c === '"') {
        if (cleaned[i + 1] === '"') {
          val += '"';
          i++;
        } else inQuotes = false;
      } else val += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        cur.push(val);
        val = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && cleaned[i + 1] === "\n") i++;
        cur.push(val);
        rows.push(cur);
        cur = [];
        val = "";
      } else val += c;
    }
  }
  if (val.length > 0 || cur.length > 0) {
    cur.push(val);
    rows.push(cur);
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

export type ShiftImportResult = {
  ok: boolean;
  imported?: number;
  errors?: Array<{ row: number; reason: string }>;
};

export async function importShiftsCsv(
  _prev: ShiftImportResult,
  formData: FormData,
): Promise<ShiftImportResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, errors: [{ row: 0, reason: "Vui lòng chọn file .csv" }] };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { ok: false, errors: [{ row: 0, reason: "File quá lớn (max 2MB)" }] };
  }
  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return { ok: false, errors: [{ row: 0, reason: "File rỗng hoặc chỉ có header" }] };
  }
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = {
    employeeId: header.indexOf("employee_id"),
    date: header.indexOf("date"),
    type: header.indexOf("shift_type"),
  };
  if (idx.employeeId < 0 || idx.date < 0 || idx.type < 0) {
    return {
      ok: false,
      errors: [
        {
          row: 1,
          reason: "Header phải có cột 'employee_id', 'date', 'shift_type'",
        },
      ],
    };
  }

  const validTypes = new Set(["morning", "afternoon", "evening"]);
  const SHIFT_DEFAULT_TIMES_LOCAL: Record<string, [string, string]> = {
    morning: ["07:00", "12:00"],
    afternoon: ["12:00", "17:00"],
    evening: ["17:00", "22:00"],
  };

  const employees = await prisma.employee.findMany({
    select: { id: true },
  });
  const validEmpIds = new Set(employees.map((e) => e.id));

  const errors: Array<{ row: number; reason: string }> = [];
  const toCreate: Array<{
    employeeId: number;
    shiftDate: Date;
    shiftType: "morning" | "afternoon" | "evening";
    startTime: string;
    endTime: string;
  }> = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const empIdRaw = row[idx.employeeId]?.trim() ?? "";
    const dateRaw = row[idx.date]?.trim() ?? "";
    const typeRaw = row[idx.type]?.trim().toLowerCase() ?? "";

    const empId = Number(empIdRaw);
    if (!Number.isInteger(empId) || empId <= 0 || !validEmpIds.has(empId)) {
      errors.push({
        row: i + 1,
        reason: `employee_id '${empIdRaw}' không tồn tại`,
      });
      continue;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
      errors.push({
        row: i + 1,
        reason: `date '${dateRaw}' không phải YYYY-MM-DD`,
      });
      continue;
    }
    if (!validTypes.has(typeRaw)) {
      errors.push({
        row: i + 1,
        reason: `shift_type '${typeRaw}' phải là morning/afternoon/evening`,
      });
      continue;
    }
    const [start, end] = SHIFT_DEFAULT_TIMES_LOCAL[typeRaw];
    toCreate.push({
      employeeId: empId,
      shiftDate: new Date(dateRaw),
      shiftType: typeRaw as "morning" | "afternoon" | "evening",
      startTime: start,
      endTime: end,
    });
  }

  if (toCreate.length === 0) {
    return { ok: false, errors };
  }

  // Skip duplicates (same employee + date + type already exists)
  const dates = toCreate.map((s) => s.shiftDate);
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
  maxDate.setDate(maxDate.getDate() + 1);
  const existing = await prisma.shift.findMany({
    where: { shiftDate: { gte: minDate, lt: maxDate } },
    select: { employeeId: true, shiftDate: true, shiftType: true },
  });
  const existingSet = new Set(
    existing.map(
      (s) =>
        `${s.employeeId}__${s.shiftDate.toISOString().slice(0, 10)}__${s.shiftType ?? ""}`,
    ),
  );
  const finalCreate = toCreate.filter(
    (s) =>
      !existingSet.has(
        `${s.employeeId}__${s.shiftDate.toISOString().slice(0, 10)}__${s.shiftType}`,
      ),
  );
  const skippedDup = toCreate.length - finalCreate.length;
  if (skippedDup > 0) {
    errors.push({
      row: 0,
      reason: `${skippedDup} ca trùng đã có trong DB → bỏ qua`,
    });
  }

  if (finalCreate.length === 0) {
    return { ok: false, errors };
  }

  try {
    await prisma.shift.createMany({ data: finalCreate });
    await logActivity({
      action: "shift.import",
      entityType: "shift",
      summary: `Import CSV: ${finalCreate.length} ca${errors.length ? `, ${errors.length} dòng lỗi/trùng` : ""}`,
      metadata: { imported: finalCreate.length, errorCount: errors.length },
    });
    revalidatePath("/shifts");
    revalidatePath("/");
    return { ok: true, imported: finalCreate.length, errors };
  } catch (e) {
    return {
      ok: false,
      errors: [
        ...errors,
        {
          row: 0,
          reason: e instanceof Error ? e.message : "Lỗi không xác định",
        },
      ],
    };
  }
}

export async function updateShiftTime(
  id: number,
  startTime: string | null,
  endTime: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    return { ok: false, error: "Chỉ admin được phép" };
  }
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, error: "ID không hợp lệ" };
  }
  const hhmm = /^\d{2}:\d{2}$/;
  if (startTime !== null && !hhmm.test(startTime)) {
    return { ok: false, error: "Giờ bắt đầu không hợp lệ (HH:MM)" };
  }
  if (endTime !== null && !hhmm.test(endTime)) {
    return { ok: false, error: "Giờ kết thúc không hợp lệ (HH:MM)" };
  }
  if (startTime !== null && endTime !== null && !(startTime < endTime)) {
    return { ok: false, error: "Giờ bắt đầu phải trước giờ kết thúc" };
  }

  const shift = await prisma.shift.findUnique({ where: { id } });
  if (!shift) return { ok: false, error: "Không tìm thấy ca" };

  try {
    await prisma.shift.update({
      where: { id },
      data: { startTime, endTime },
    });
    await logActivity({
      action: "shift.update_time",
      entityType: "shift",
      entityId: id,
      summary: `Sửa giờ ca #${id}: ${shift.startTime ?? "—"}-${shift.endTime ?? "—"} → ${startTime ?? "—"}-${endTime ?? "—"}`,
    });
    revalidatePath("/shifts");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi không xác định" };
  }
}

export async function deleteShift(id: number) {
  await prisma.shift.delete({ where: { id } });
  await logActivity({
    action: "shift.delete",
    entityType: "shift",
    entityId: id,
    summary: `Xoá ca làm #${id}`,
  });
  revalidatePath("/shifts");
  revalidatePath("/");
}

export async function bulkDeleteShifts(
  ids: number[],
): Promise<{ ok: boolean; deleted: number; error?: string }> {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    return { ok: false, deleted: 0, error: "Chỉ admin được phép" };
  }
  const validIds = Array.from(
    new Set(ids.filter((n) => Number.isInteger(n) && n > 0)),
  );
  if (validIds.length === 0) {
    return { ok: false, deleted: 0, error: "Không có ca nào được chọn" };
  }
  if (validIds.length > 100) {
    return { ok: false, deleted: 0, error: "Tối đa 100 ca mỗi lần" };
  }
  try {
    const result = await prisma.shift.deleteMany({
      where: { id: { in: validIds } },
    });
    if (result.count > 0) {
      await logActivity({
        action: "shift.bulk_delete",
        entityType: "shift",
        summary: `Xoá ${result.count} ca làm`,
        metadata: { ids: validIds, count: result.count },
      });
    }
    revalidatePath("/shifts");
    revalidatePath("/");
    return { ok: true, deleted: result.count };
  } catch (e) {
    return {
      ok: false,
      deleted: 0,
      error: e instanceof Error ? e.message : "Lỗi không xác định",
    };
  }
}

/**
 * Copy all shifts from one week to the next week.
 * weekStartIso must be Monday's date (YYYY-MM-DD).
 */
export async function duplicateWeekShifts(weekStartIso: string): Promise<{
  ok: boolean;
  copied: number;
  error?: string;
}> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStartIso)) {
    return { ok: false, copied: 0, error: "Ngày không hợp lệ" };
  }
  const start = new Date(weekStartIso);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  const nextStart = new Date(end);
  const nextEnd = new Date(nextStart);
  nextEnd.setDate(nextStart.getDate() + 7);

  try {
    const sourceShifts = await prisma.shift.findMany({
      where: { shiftDate: { gte: start, lt: end } },
    });
    if (sourceShifts.length === 0) {
      return { ok: false, copied: 0, error: "Tuần này không có ca nào để copy" };
    }

    // Avoid duplicating if next week already has the same shift (employee+date+type)
    const nextExisting = await prisma.shift.findMany({
      where: { shiftDate: { gte: nextStart, lt: nextEnd } },
      select: { employeeId: true, shiftDate: true, shiftType: true },
    });
    const existingSet = new Set(
      nextExisting.map(
        (s) =>
          `${s.employeeId}__${s.shiftDate.toISOString().slice(0, 10)}__${s.shiftType ?? ""}`,
      ),
    );

    const toCreate = sourceShifts
      .map((s) => {
        const nextDate = new Date(s.shiftDate);
        nextDate.setDate(nextDate.getDate() + 7);
        return {
          employeeId: s.employeeId,
          shiftDate: nextDate,
          shiftType: s.shiftType,
          startTime: s.startTime,
          endTime: s.endTime,
        };
      })
      .filter(
        (s) =>
          !existingSet.has(
            `${s.employeeId}__${s.shiftDate.toISOString().slice(0, 10)}__${s.shiftType ?? ""}`,
          ),
      );

    if (toCreate.length === 0) {
      return { ok: false, copied: 0, error: "Tuần sau đã có đầy đủ các ca" };
    }

    await prisma.shift.createMany({ data: toCreate });
    await logActivity({
      action: "shift.bulk_duplicate",
      entityType: "shift",
      summary: `Copy ${toCreate.length} ca từ tuần ${weekStartIso} sang tuần sau`,
      metadata: { weekStart: weekStartIso, copied: toCreate.length },
    });
    revalidatePath("/shifts");
    revalidatePath("/");
    return { ok: true, copied: toCreate.length };
  } catch (e) {
    return {
      ok: false,
      copied: 0,
      error: e instanceof Error ? e.message : "Lỗi không xác định",
    };
  }
}

export type SwapWeekShiftsResult = {
  ok: boolean;
  swapped: number;
  skippedDuplicates?: Array<{ date: string; type: string }>;
  error?: string;
};

/**
 * Swap all shifts between two employees within a single week.
 * weekStartIso must be Monday's date (YYYY-MM-DD).
 * Admin only. If a swap would create a duplicate (same employee + date + type),
 * that one shift is skipped and reported.
 */
export async function swapWeekShifts(
  empAId: number,
  empBId: number,
  weekStartIso: string,
): Promise<SwapWeekShiftsResult> {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    return { ok: false, swapped: 0, error: "Chỉ admin được phép" };
  }

  if (
    !Number.isInteger(empAId) ||
    empAId <= 0 ||
    !Number.isInteger(empBId) ||
    empBId <= 0
  ) {
    return { ok: false, swapped: 0, error: "ID nhân viên không hợp lệ" };
  }
  if (empAId === empBId) {
    return { ok: false, swapped: 0, error: "Phải chọn 2 nhân viên khác nhau" };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStartIso)) {
    return { ok: false, swapped: 0, error: "Ngày tuần không hợp lệ" };
  }

  const weekStart = new Date(weekStartIso);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  try {
    const [empA, empB] = await Promise.all([
      prisma.employee.findUnique({
        where: { id: empAId },
        select: { id: true, name: true },
      }),
      prisma.employee.findUnique({
        where: { id: empBId },
        select: { id: true, name: true },
      }),
    ]);
    if (!empA || !empB) {
      return { ok: false, swapped: 0, error: "Không tìm thấy nhân viên" };
    }

    const result = await prisma.$transaction(async (tx) => {
      const [aShifts, bShifts] = await Promise.all([
        tx.shift.findMany({
          where: {
            employeeId: empAId,
            shiftDate: { gte: weekStart, lt: weekEnd },
          },
          select: {
            id: true,
            shiftDate: true,
            shiftType: true,
          },
        }),
        tx.shift.findMany({
          where: {
            employeeId: empBId,
            shiftDate: { gte: weekStart, lt: weekEnd },
          },
          select: {
            id: true,
            shiftDate: true,
            shiftType: true,
          },
        }),
      ]);

      // Build keyed maps to detect post-swap duplicates.
      // Key = `${dateIso}__${type}`
      const keyOf = (d: Date, t: string | null) =>
        `${d.toISOString().slice(0, 10)}__${t ?? ""}`;
      const aKeys = new Set(aShifts.map((s) => keyOf(s.shiftDate, s.shiftType)));
      const bKeys = new Set(bShifts.map((s) => keyOf(s.shiftDate, s.shiftType)));

      const skipped: Array<{ date: string; type: string }> = [];
      const aToMove: number[] = [];
      const bToMove: number[] = [];

      // A's shifts going to B: skip if B already has same (date, type)
      for (const s of aShifts) {
        const k = keyOf(s.shiftDate, s.shiftType);
        if (bKeys.has(k)) {
          skipped.push({
            date: s.shiftDate.toISOString().slice(0, 10),
            type: s.shiftType ?? "",
          });
        } else {
          aToMove.push(s.id);
        }
      }
      // B's shifts going to A: skip if A already has same (date, type)
      for (const s of bShifts) {
        const k = keyOf(s.shiftDate, s.shiftType);
        if (aKeys.has(k)) {
          skipped.push({
            date: s.shiftDate.toISOString().slice(0, 10),
            type: s.shiftType ?? "",
          });
        } else {
          bToMove.push(s.id);
        }
      }

      // Two-step swap to avoid touching shifts that already match the other side.
      // Use a sentinel negative id by marking A's via a temp employeeId is not
      // possible (FK), so we update A→B first (those rows belong to A, not in
      // B's set) and B→A second (those rows still belong to B, not yet touched).
      let movedCount = 0;
      if (aToMove.length > 0) {
        const r = await tx.shift.updateMany({
          where: { id: { in: aToMove } },
          data: { employeeId: empBId },
        });
        movedCount += r.count;
      }
      if (bToMove.length > 0) {
        const r = await tx.shift.updateMany({
          where: { id: { in: bToMove } },
          data: { employeeId: empAId },
        });
        movedCount += r.count;
      }

      return { swapped: movedCount, skipped };
    });

    await logActivity({
      action: "shift.bulk_swap",
      entityType: "shift",
      summary: `Đổi ${result.swapped} ca giữa ${empA.name} ↔ ${empB.name} tuần ${weekStartIso}`,
      metadata: {
        weekStart: weekStartIso,
        empAId,
        empBId,
        swapped: result.swapped,
        skipped: result.skipped.length,
      },
    });

    revalidatePath("/shifts");
    revalidatePath("/");
    return {
      ok: true,
      swapped: result.swapped,
      skippedDuplicates: result.skipped.length > 0 ? result.skipped : undefined,
    };
  } catch (e) {
    return {
      ok: false,
      swapped: 0,
      error: e instanceof Error ? e.message : "Lỗi không xác định",
    };
  }
}
