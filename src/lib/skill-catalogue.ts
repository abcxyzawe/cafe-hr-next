export type Skill = {
  id: string;
  name: string;
  iconName:
    | "coffee"
    | "users"
    | "scale"
    | "sparkles"
    | "scroll"
    | "bar-chart-3"
    | "thermometer"
    | "message-square-heart";
  category: "core" | "service" | "ops";
};

export const SKILLS: readonly Skill[] = [
  {
    id: "espresso-pulling",
    name: "Pha espresso đúng chuẩn",
    iconName: "coffee",
    category: "core",
  },
  {
    id: "milk-steaming",
    name: "Đánh sữa & latte art",
    iconName: "sparkles",
    category: "core",
  },
  {
    id: "customer-service",
    name: "Phục vụ khách hàng",
    iconName: "message-square-heart",
    category: "service",
  },
  {
    id: "cash-handling",
    name: "Xử lý tiền mặt",
    iconName: "scale",
    category: "ops",
  },
  {
    id: "menu-knowledge",
    name: "Hiểu menu & gợi ý",
    iconName: "scroll",
    category: "service",
  },
  {
    id: "cleaning",
    name: "Vệ sinh quầy bar",
    iconName: "sparkles",
    category: "ops",
  },
  {
    id: "team-coord",
    name: "Phối hợp đồng đội",
    iconName: "users",
    category: "service",
  },
  {
    id: "inventory",
    name: "Kiểm tồn kho",
    iconName: "bar-chart-3",
    category: "ops",
  },
] as const;

export const CATEGORY_LABEL: Record<Skill["category"], string> = {
  core: "Cốt lõi",
  service: "Phục vụ",
  ops: "Vận hành",
};
