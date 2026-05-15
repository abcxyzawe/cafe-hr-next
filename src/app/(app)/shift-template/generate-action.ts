"use server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateShiftTemplate } from "@/lib/xai";
import {
  SHIFT_TEMPLATE_ROLES,
  SHIFT_TEMPLATE_SHIFT_OPTS,
  targetsFieldName,
  type ShiftTemplateRoleKey,
  type ShiftTemplateState,
  type ShiftTemplateTargets,
} from "./shift-template-types";
import type { ShiftTemplateShiftKey } from "@/lib/xai";

function clampCount(raw: FormDataEntryValue | null): number {
  if (raw === null) return 0;
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 10) return 10;
  return n;
}

function parseTargets(formData: FormData): ShiftTemplateTargets {
  const out: ShiftTemplateTargets = {
    morning: { barista: 0, server: 0, cashier: 0, manager: 0 },
    afternoon: { barista: 0, server: 0, cashier: 0, manager: 0 },
    evening: { barista: 0, server: 0, cashier: 0, manager: 0 },
  };
  for (const shift of SHIFT_TEMPLATE_SHIFT_OPTS) {
    for (const role of SHIFT_TEMPLATE_ROLES) {
      const field = targetsFieldName(shift.value, role.value);
      out[shift.value][role.value] = clampCount(formData.get(field));
    }
  }
  return out;
}

export async function generateShiftTemplateAction(
  prevState: ShiftTemplateState,
  formData: FormData,
): Promise<ShiftTemplateState> {
  const targets = parseTargets(formData);

  const baseState: ShiftTemplateState = {
    targets,
    template: null,
    error: null,
    generatedAt: null,
  };

  const sess = await getSession();
  if (!sess) {
    return {
      ...baseState,
      error: "Bạn cần đăng nhập để dùng tính năng này.",
    };
  }
  if (sess.role !== "admin") {
    return {
      ...baseState,
      error: "Chỉ quản trị viên mới có thể tạo lịch tuần.",
    };
  }

  const totalTarget = (
    Object.keys(targets) as ShiftTemplateShiftKey[]
  ).reduce<number>((acc, shift) => {
    const perRole = targets[shift];
    let s = 0;
    for (const role of SHIFT_TEMPLATE_ROLES) {
      s += perRole[role.value as ShiftTemplateRoleKey];
    }
    return acc + s;
  }, 0);
  if (totalTarget === 0) {
    return {
      ...baseState,
      error: "Hãy đặt ít nhất một mục tiêu nhân sự cho ca làm.",
    };
  }

  const employees = await prisma.employee.findMany({
    select: { id: true, name: true, role: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  if (employees.length === 0) {
    return {
      ...baseState,
      error: "Chưa có nhân viên nào trong hệ thống.",
    };
  }

  // Quick feasibility check: for each shift, ensure enough employees per role.
  const byRole = new Map<string, number>();
  for (const emp of employees) {
    byRole.set(emp.role, (byRole.get(emp.role) ?? 0) + 1);
  }
  for (const shift of SHIFT_TEMPLATE_SHIFT_OPTS) {
    for (const role of SHIFT_TEMPLATE_ROLES) {
      const want = targets[shift.value][role.value];
      const have = byRole.get(role.value) ?? 0;
      if (want > have) {
        return {
          ...baseState,
          error: `Ca ${shift.label} cần ${want} ${role.label} nhưng chỉ có ${have} nhân viên.`,
        };
      }
    }
  }

  try {
    const employeesForAi = employees.map((e) => ({
      id: e.id,
      name: e.name,
      role: String(e.role),
    }));
    const targetsForAi: Record<string, Record<string, number>> = {
      morning: { ...targets.morning },
      afternoon: { ...targets.afternoon },
      evening: { ...targets.evening },
    };
    const { template } = await generateShiftTemplate({
      employees: employeesForAi,
      targets: targetsForAi,
    });
    return {
      targets,
      template,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không tạo được lịch tuần. Vui lòng thử lại.";
    return { ...baseState, error: message };
  }
}

