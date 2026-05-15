"use server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateShiftSuggestions,
  type ShiftOptimizerEmployeeInput,
} from "@/lib/xai";
import {
  validateShiftOptimizerInputs,
  type ShiftOptimizerActionResult,
  type ShiftOptimizerFormValues,
  type ShiftTraffic,
} from "./types";

function readTraffic(raw: FormDataEntryValue | null): ShiftTraffic {
  const v = typeof raw === "string" ? raw : "";
  if (v === "low" || v === "high" || v === "medium") return v;
  return "medium";
}

export async function generateShiftPlanAction(
  formData: FormData,
): Promise<ShiftOptimizerActionResult> {
  const rawWeekStart = formData.get("weekStart");
  const rawTraffic = formData.get("traffic");
  const rawNotes = formData.get("notes");

  const values: ShiftOptimizerFormValues = {
    weekStart: typeof rawWeekStart === "string" ? rawWeekStart : "",
    traffic: readTraffic(rawTraffic),
    notes: typeof rawNotes === "string" ? rawNotes : "",
  };

  const sess = await getSession();
  if (!sess) {
    return {
      ok: false,
      error: "Bạn cần đăng nhập để dùng tính năng này.",
    };
  }
  if (sess.role !== "admin") {
    return {
      ok: false,
      error: "Chỉ quản trị viên mới có thể tối ưu ca làm.",
    };
  }

  const parsed = validateShiftOptimizerInputs(values);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const rows = await prisma.employee.findMany({
    select: { id: true, name: true, role: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  if (rows.length === 0) {
    return {
      ok: false,
      error: "Chưa có nhân viên nào trong hệ thống để xếp ca.",
    };
  }

  const employees: ShiftOptimizerEmployeeInput[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    role: String(r.role),
  }));

  try {
    const data = await generateShiftSuggestions({
      employees,
      days: parsed.weekDays,
      expectedTraffic: parsed.traffic,
      notes: parsed.notes,
    });
    return { ok: true, data };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không tạo được gợi ý ca làm. Vui lòng thử lại.";
    return { ok: false, error: message };
  }
}
