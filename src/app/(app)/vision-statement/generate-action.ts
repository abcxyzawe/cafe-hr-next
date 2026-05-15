"use server";

import { getSession } from "@/lib/auth";
import { generateVisionStatement } from "@/lib/xai";
import {
  INITIAL_VISION_STATEMENT_STATE,
  parseYearsInBusiness,
  type VisionStatementState,
} from "./vision-statement-types";

export async function generateVisionStatementAction(
  prevState: VisionStatementState,
  formData: FormData,
): Promise<VisionStatementState> {
  const rawYears = formData.get("yearsInBusiness");
  const rawTarget = formData.get("targetCustomer");
  const rawUsp = formData.get("usp");

  const targetCustomerRaw =
    typeof rawTarget === "string" ? rawTarget : "";
  const uspRaw = typeof rawUsp === "string" ? rawUsp : "";
  const targetCustomer = targetCustomerRaw.trim().replace(/\s+/g, " ");
  const usp = uspRaw.trim().replace(/\s+/g, " ");

  const parsedYears = parseYearsInBusiness(rawYears);
  const yearsInBusiness =
    parsedYears ??
    prevState.yearsInBusiness ??
    INITIAL_VISION_STATEMENT_STATE.yearsInBusiness;

  const echoState: VisionStatementState = {
    yearsInBusiness,
    targetCustomer: targetCustomerRaw,
    usp: uspRaw,
    result: null,
    error: null,
    generatedAt: null,
  };

  const sess = await getSession();
  if (!sess) {
    return {
      ...echoState,
      error: "Bạn cần đăng nhập để dùng tính năng này.",
    };
  }
  if (sess.role !== "admin") {
    return {
      ...echoState,
      error: "Chỉ quản trị viên mới có thể tạo tuyên ngôn thương hiệu.",
    };
  }

  if (parsedYears === null) {
    return {
      ...echoState,
      error: "Số năm hoạt động phải là số nguyên từ 1 đến 50.",
    };
  }
  if (targetCustomer.length < 5 || targetCustomer.length > 200) {
    return {
      ...echoState,
      error: "Mô tả khách hàng mục tiêu phải dài 5-200 ký tự.",
    };
  }
  if (usp.length < 5 || usp.length > 200) {
    return {
      ...echoState,
      error: "USP / điểm khác biệt phải dài 5-200 ký tự.",
    };
  }

  try {
    const result = await generateVisionStatement({
      yearsInBusiness: parsedYears,
      targetCustomer,
      usp,
    });
    return {
      yearsInBusiness: parsedYears,
      targetCustomer: targetCustomerRaw,
      usp: uspRaw,
      result,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không tạo được tuyên ngôn. Vui lòng thử lại.";
    return { ...echoState, error: message };
  }
}
