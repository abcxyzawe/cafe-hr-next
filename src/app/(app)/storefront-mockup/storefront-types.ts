export const STYLE_OPTIONS = [
  { value: "modern-glass", label: "Modern Glass — kính hiện đại" },
  { value: "cozy-rustic", label: "Cozy Rustic — gỗ ấm cúng" },
  { value: "industrial-loft", label: "Industrial Loft — công nghiệp" },
  { value: "vintage-french", label: "Vintage French — Pháp cổ điển" },
  { value: "minimalist-zen", label: "Minimalist Zen — tối giản" },
  { value: "tropical-bamboo", label: "Tropical Bamboo — tre nhiệt đới" },
] as const;

export const STYLE_VALUES: ReadonlyArray<string> = STYLE_OPTIONS.map(
  (o) => o.value,
);

export const FACADE_OPTIONS = [
  { value: "corner-shop", label: "Corner shop — quán góc 2 mặt tiền" },
  { value: "street-front", label: "Street front — nhà phố 1 mặt tiền" },
  { value: "inside-mall", label: "Inside mall — trong trung tâm" },
  { value: "standalone-villa", label: "Standalone villa — nhà vườn riêng" },
] as const;

export const FACADE_VALUES: ReadonlyArray<string> = FACADE_OPTIONS.map(
  (o) => o.value,
);

export const EMPHASIZE_OPTIONS = [
  { value: "signage", label: "Bảng hiệu nổi bật" },
  { value: "windows", label: "Cửa sổ trưng bày" },
  { value: "outdoor-seating", label: "Khu ngồi ngoài trời" },
  { value: "greenery", label: "Cây xanh, mảng xanh" },
] as const;

export const EMPHASIZE_VALUES: ReadonlyArray<string> = EMPHASIZE_OPTIONS.map(
  (o) => o.value,
);

export type StorefrontResult = {
  url: string;
};

export type StorefrontState = {
  cafeName: string;
  style: string;
  facadeType: string;
  emphasize: string;
  result: StorefrontResult | null;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_STOREFRONT_STATE: StorefrontState = {
  cafeName: "",
  style: "modern-glass",
  facadeType: "street-front",
  emphasize: "signage",
  result: null,
  error: null,
  generatedAt: null,
};
