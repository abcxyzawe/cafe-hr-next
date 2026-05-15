"use server";

import { getSession } from "@/lib/auth";
import { generateValueProposition } from "@/lib/xai";
import {
  validateValuePropInputs,
  type ValuePropFormValues,
  type ValuePropState,
} from "./value-prop-types";

export async function generateValuePropAction(
  prevState: ValuePropState,
  formData: FormData,
): Promise<ValuePropState> {
  const rawSegment = formData.get("segment");
  const rawProduct = formData.get("product");

  const segmentInput = typeof rawSegment === "string" ? rawSegment : "";
  const productInput = typeof rawProduct === "string" ? rawProduct : "";

  const values: ValuePropFormValues = {
    segment: segmentInput,
    product: productInput,
  };

  const baseState: ValuePropState = {
    values,
    canvas: null,
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
      error: "Chỉ quản trị viên mới có thể tạo Value Proposition Canvas.",
    };
  }

  const parsed = validateValuePropInputs(values);
  if (!parsed.ok) {
    return { ...baseState, error: parsed.error };
  }

  try {
    const canvas = await generateValueProposition({
      segment: parsed.segment,
      product: parsed.product,
    });
    return {
      values,
      canvas,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không tạo được Value Proposition Canvas. Vui lòng thử lại.";
    return { ...baseState, error: message };
  }
}

