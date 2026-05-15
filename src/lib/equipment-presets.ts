export type EquipmentItem = {
  id: string;
  name: string;
  category: "machine" | "appliance" | "furniture" | "tool";
  intervalDays: number;
  iconName:
    | "coffee"
    | "milk"
    | "thermometer"
    | "snowflake"
    | "wrench"
    | "scale"
    | "cup"
    | "flame";
  description: string;
};

export const EQUIPMENT_ITEMS: EquipmentItem[] = [
  {
    id: "espresso-machine",
    name: "Máy pha espresso",
    category: "machine",
    intervalDays: 30,
    iconName: "coffee",
    description: "Vệ sinh sâu, descale",
  },
  {
    id: "grinder",
    name: "Máy xay cà phê",
    category: "machine",
    intervalDays: 14,
    iconName: "scale",
    description: "Vệ sinh lưỡi xay, calibrate",
  },
  {
    id: "fridge",
    name: "Tủ lạnh quầy bar",
    category: "appliance",
    intervalDays: 60,
    iconName: "snowflake",
    description: "Lau bên trong, kiểm gas",
  },
  {
    id: "milk-frother",
    name: "Máy đánh sữa",
    category: "machine",
    intervalDays: 7,
    iconName: "milk",
    description: "Tháo vòi, vệ sinh",
  },
  {
    id: "ice-machine",
    name: "Máy làm đá",
    category: "appliance",
    intervalDays: 30,
    iconName: "snowflake",
    description: "Vệ sinh khoang đá",
  },
  {
    id: "blender",
    name: "Máy xay sinh tố",
    category: "machine",
    intervalDays: 21,
    iconName: "cup",
    description: "Vệ sinh dao, kiểm tra dây điện",
  },
  {
    id: "pos-terminal",
    name: "Máy POS",
    category: "appliance",
    intervalDays: 90,
    iconName: "scale",
    description: "Cập nhật firmware, lau màn hình",
  },
  {
    id: "dishwasher",
    name: "Máy rửa bát",
    category: "appliance",
    intervalDays: 30,
    iconName: "wrench",
    description: "Khử cặn, lau gioăng",
  },
];
