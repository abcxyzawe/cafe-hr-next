"use server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateCoachingTip } from "@/lib/xai";
import {
  COACHING_FOCUS_VALUES,
  INITIAL_COACHING_TIP_STATE,
  type CoachingTipState,
} from "./coaching-tip-types";

const ROLE_LABEL_VN: Record<string, string> = {
  barista: "Pha chế (barista)",
  server: "Phục vụ bàn",
  cashier: "Thu ngân",
  manager: "Quản lý",
};

export async function generateCoachingTipAction(
  prevState: CoachingTipState,
  formData: FormData,
): Promise<CoachingTipState> {
  const rawEmployeeId = formData.get("employeeId");
  const rawFocus = formData.get("focus");

  const employeeIdStr =
    typeof rawEmployeeId === "string" ? rawEmployeeId.trim() : "";
  const focus = typeof rawFocus === "string" ? rawFocus : "";

  const echoBase: CoachingTipState = {
    employeeId: prevState.employeeId,
    employeeName: prevState.employeeName,
    employeeRole: prevState.employeeRole,
    focus: focus || prevState.focus || INITIAL_COACHING_TIP_STATE.focus,
    tip: null,
    error: null,
    generatedAt: null,
  };

  const sess = await getSession();
  if (!sess) {
    return {
      ...echoBase,
      error: "Bạn cần đăng nhập để dùng tính năng này.",
    };
  }
  if (sess.role !== "admin") {
    return {
      ...echoBase,
      error: "Chỉ quản trị viên mới có thể tạo lời khuyên coaching.",
    };
  }

  const employeeIdNum = Number.parseInt(employeeIdStr, 10);
  if (
    !Number.isInteger(employeeIdNum) ||
    employeeIdNum <= 0 ||
    String(employeeIdNum) !== employeeIdStr
  ) {
    return { ...echoBase, error: "Vui lòng chọn nhân viên hợp lệ." };
  }

  if (
    !COACHING_FOCUS_VALUES.includes(
      focus as (typeof COACHING_FOCUS_VALUES)[number],
    )
  ) {
    return { ...echoBase, error: "Lĩnh vực coaching không hợp lệ." };
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeIdNum },
    select: { id: true, name: true, role: true },
  });
  if (!employee) {
    return { ...echoBase, error: "Không tìm thấy nhân viên đã chọn." };
  }

  const roleLabel = ROLE_LABEL_VN[employee.role] ?? employee.role;

  const echoSelected: CoachingTipState = {
    ...echoBase,
    employeeId: employee.id,
    employeeName: employee.name,
    employeeRole: roleLabel,
  };

  try {
    const result = await generateCoachingTip({
      employeeName: employee.name,
      role: roleLabel,
      focus,
    });
    return {
      ...echoSelected,
      tip: result.content,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không tạo được lời khuyên. Vui lòng thử lại.";
    return { ...echoSelected, error: message };
  }
}
