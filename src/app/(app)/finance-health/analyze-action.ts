"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { previousPeriod } from "@/lib/payroll-comparison";
import { analyzeFinanceHealth } from "@/lib/xai";
import {
  INITIAL_FINANCE_HEALTH_STATE,
  parseNonNegativeAmount,
  type FinanceHealthState,
} from "./finance-health-types";

function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function sumPayrollForPeriod(period: string): Promise<number> {
  try {
    const agg = await prisma.payroll.aggregate({
      where: { period },
      _sum: { totalPay: true },
    });
    const sum = agg._sum.totalPay;
    if (sum === null || sum === undefined) return 0;
    const n = Number(sum);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
  } catch {
    return 0;
  }
}

export async function analyzeFinanceAction(
  prevState: FinanceHealthState,
  formData: FormData,
): Promise<FinanceHealthState> {
  const revenueWeek = parseNonNegativeAmount(formData.get("revenueWeek"));
  const revenueMonth = parseNonNegativeAmount(formData.get("revenueMonth"));
  const expensesWeek = parseNonNegativeAmount(formData.get("expensesWeek"));
  const expensesMonth = parseNonNegativeAmount(formData.get("expensesMonth"));

  const echoBase: FinanceHealthState = {
    ...INITIAL_FINANCE_HEALTH_STATE,
    revenueWeek,
    revenueMonth,
    expensesWeek,
    expensesMonth,
    payrollMonth: prevState.payrollMonth,
    payrollPrevMonth: prevState.payrollPrevMonth,
    employeeCount: prevState.employeeCount,
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
      error: "Chỉ quản trị viên mới có thể phân tích tài chính.",
    };
  }

  const period = currentPeriod();
  const prevPeriodStr = previousPeriod(period);

  let payrollMonth = 0;
  let payrollPrevMonth = 0;
  let employeeCount = 0;
  try {
    const [pCur, pPrev, empCount] = await Promise.all([
      sumPayrollForPeriod(period),
      sumPayrollForPeriod(prevPeriodStr),
      prisma.employee.count(),
    ]);
    payrollMonth = pCur;
    payrollPrevMonth = pPrev;
    employeeCount = empCount;
  } catch (e) {
    return {
      ...echoBase,
      error:
        e instanceof Error
          ? `Không lấy được số liệu lương: ${e.message}`
          : "Không lấy được số liệu lương từ máy chủ.",
    };
  }

  const echoState: FinanceHealthState = {
    ...echoBase,
    payrollMonth,
    payrollPrevMonth,
    employeeCount,
  };

  if (revenueMonth === 0 && expensesMonth === 0 && payrollMonth === 0) {
    return {
      ...echoState,
      error:
        "Chưa có dữ liệu doanh thu, chi phí hay lương trong tháng để phân tích.",
    };
  }

  try {
    const result = await analyzeFinanceHealth({
      revenueWeek,
      revenueMonth,
      expensesWeek,
      expensesMonth,
      payrollMonth,
      payrollPrevMonth,
      employeeCount,
    });
    return {
      ...echoState,
      result,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không phân tích được. Vui lòng thử lại.";
    return { ...echoState, error: message };
  }
}
