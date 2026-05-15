export const STYLE_OPTIONS = [
  { value: "photo", label: "Photo — ảnh thực tế" },
  { value: "watercolor", label: "Watercolor — màu nước" },
  { value: "flat-vector", label: "Flat vector — phẳng" },
  { value: "3d-render", label: "3D render — khối nổi" },
] as const;

export const STYLE_VALUES = STYLE_OPTIONS.map((o) => o.value);

export type StyleValue = (typeof STYLE_OPTIONS)[number]["value"];

export const ITEM_NAME_MIN = 2;
export const ITEM_NAME_MAX = 60;
export const DESCRIPTION_MIN = 5;
export const DESCRIPTION_MAX = 200;

export type MenuIllustrateState = {
  itemName: string;
  description: string;
  style: string;
  imageUrl: string | null;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_MENU_ILLUSTRATE_STATE: MenuIllustrateState = {
  itemName: "",
  description: "",
  style: "photo",
  imageUrl: null,
  error: null,
  generatedAt: null,
};
