import type { ValuePropositionCanvas } from "@/lib/xai";

export const SEGMENT_MIN = 5;
export const SEGMENT_MAX = 200;
export const PRODUCT_MIN = 10;
export const PRODUCT_MAX = 300;

export type ValuePropFormValues = {
  segment: string;
  product: string;
};

export type ValuePropState = {
  values: ValuePropFormValues;
  canvas: ValuePropositionCanvas | null;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_VALUE_PROP_STATE: ValuePropState = {
  values: {
    segment: "",
    product: "",
  },
  canvas: null,
  error: null,
  generatedAt: null,
};

export type ValuePropValidationOk = {
  ok: true;
  segment: string;
  product: string;
};

export type ValuePropValidationErr = {
  ok: false;
  error: string;
};

export function validateValuePropInputs(
  values: ValuePropFormValues,
): ValuePropValidationOk | ValuePropValidationErr {
  const segment = values.segment.trim().replace(/\s+/g, " ");
  const product = values.product.trim().replace(/\s+/g, " ");

  if (segment.length < SEGMENT_MIN || segment.length > SEGMENT_MAX) {
    return {
      ok: false,
      error: `Phân khúc khách hàng phải dài ${SEGMENT_MIN}-${SEGMENT_MAX} ký tự.`,
    };
  }
  if (product.length < PRODUCT_MIN || product.length > PRODUCT_MAX) {
    return {
      ok: false,
      error: `Mô tả sản phẩm/dịch vụ phải dài ${PRODUCT_MIN}-${PRODUCT_MAX} ký tự.`,
    };
  }
  return { ok: true, segment, product };
}
