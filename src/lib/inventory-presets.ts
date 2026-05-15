export type InventoryItem = {
  id: string;
  name: string;
  unit: string;
  defaultQty: number;
  threshold: number;
  iconName: "coffee" | "milk" | "package" | "scroll" | "cup" | "sprout";
};

export const INVENTORY_ITEMS: InventoryItem[] = [
  {
    id: "cafe-beans",
    name: "Hạt cà phê arabica",
    unit: "kg",
    defaultQty: 10,
    threshold: 3,
    iconName: "coffee",
  },
  {
    id: "cafe-beans-robusta",
    name: "Hạt cà phê robusta",
    unit: "kg",
    defaultQty: 8,
    threshold: 2,
    iconName: "coffee",
  },
  {
    id: "milk-fresh",
    name: "Sữa tươi",
    unit: "lít",
    defaultQty: 20,
    threshold: 5,
    iconName: "milk",
  },
  {
    id: "milk-condensed",
    name: "Sữa đặc",
    unit: "lon",
    defaultQty: 12,
    threshold: 3,
    iconName: "milk",
  },
  {
    id: "sugar",
    name: "Đường trắng",
    unit: "kg",
    defaultQty: 5,
    threshold: 1,
    iconName: "package",
  },
  {
    id: "paper-cups",
    name: "Cốc giấy mang đi",
    unit: "thùng",
    defaultQty: 4,
    threshold: 1,
    iconName: "cup",
  },
  {
    id: "lids",
    name: "Nắp cốc",
    unit: "gói",
    defaultQty: 6,
    threshold: 2,
    iconName: "cup",
  },
  {
    id: "straws",
    name: "Ống hút",
    unit: "gói",
    defaultQty: 8,
    threshold: 2,
    iconName: "cup",
  },
  {
    id: "napkins",
    name: "Khăn giấy",
    unit: "thùng",
    defaultQty: 3,
    threshold: 1,
    iconName: "scroll",
  },
  {
    id: "tea-leaves",
    name: "Trà lá",
    unit: "kg",
    defaultQty: 2,
    threshold: 0.5,
    iconName: "sprout",
  },
];
