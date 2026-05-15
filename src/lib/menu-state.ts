export const STORAGE_KEY = "cafe-hr-menu";
export const MENU_EVENT = "cafe-hr:menu-changed";

export type MenuCategory = "coffee" | "cold" | "tea" | "pastry" | "other";

export type MenuItem = {
  id: string;
  name: string;
  category: MenuCategory;
  priceVnd: number;
  description: string;
  highlight: boolean;
  createdAt: string;
};

export const CATEGORY_LABEL: Record<MenuCategory, string> = {
  coffee: "Cà phê",
  cold: "Đồ uống đá",
  tea: "Trà",
  pastry: "Bánh",
  other: "Khác",
};

export const CATEGORY_ICON: Record<
  MenuCategory,
  "coffee" | "snowflake" | "leaf" | "cookie" | "package"
> = {
  coffee: "coffee",
  cold: "snowflake",
  tea: "leaf",
  pastry: "cookie",
  other: "package",
};

export const CATEGORY_ORDER: ReadonlyArray<MenuCategory> = [
  "coffee",
  "cold",
  "tea",
  "pastry",
  "other",
];

export const DEFAULT_ITEMS: MenuItem[] = [
  {
    id: "seed-coffee-1",
    name: "Cà phê đen đá",
    category: "coffee",
    priceVnd: 25000,
    description: "Cà phê phin truyền thống, đậm đà",
    highlight: false,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "seed-coffee-2",
    name: "Cà phê sữa đá",
    category: "coffee",
    priceVnd: 30000,
    description: "Cà phê phin pha cùng sữa đặc, ngọt béo",
    highlight: true,
    createdAt: "2024-01-01T00:00:01.000Z",
  },
  {
    id: "seed-coffee-3",
    name: "Bạc xỉu",
    category: "coffee",
    priceVnd: 32000,
    description: "Nhiều sữa, ít cà phê — vị ngọt dịu",
    highlight: false,
    createdAt: "2024-01-01T00:00:02.000Z",
  },
  {
    id: "seed-coffee-4",
    name: "Cappuccino",
    category: "coffee",
    priceVnd: 45000,
    description: "Espresso, sữa nóng và lớp foam mịn",
    highlight: false,
    createdAt: "2024-01-01T00:00:03.000Z",
  },
  {
    id: "seed-cold-1",
    name: "Cacao đá xay",
    category: "cold",
    priceVnd: 49000,
    description: "Cacao Bỉ xay với sữa và đá mát lạnh",
    highlight: false,
    createdAt: "2024-01-01T00:00:04.000Z",
  },
  {
    id: "seed-cold-2",
    name: "Soda chanh dây",
    category: "cold",
    priceVnd: 39000,
    description: "Soda với chanh dây tươi, thêm đá viên",
    highlight: true,
    createdAt: "2024-01-01T00:00:05.000Z",
  },
  {
    id: "seed-tea-1",
    name: "Trà đào cam sả",
    category: "tea",
    priceVnd: 45000,
    description: "Trà đen ủ với đào, cam, sả tươi",
    highlight: true,
    createdAt: "2024-01-01T00:00:06.000Z",
  },
  {
    id: "seed-tea-2",
    name: "Trà sen vàng",
    category: "tea",
    priceVnd: 42000,
    description: "Trà ô long pha cùng hạt sen và mật ong",
    highlight: false,
    createdAt: "2024-01-01T00:00:07.000Z",
  },
  {
    id: "seed-tea-3",
    name: "Trà gừng mật ong",
    category: "tea",
    priceVnd: 35000,
    description: "Gừng tươi giã, mật ong rừng — ấm bụng",
    highlight: false,
    createdAt: "2024-01-01T00:00:08.000Z",
  },
  {
    id: "seed-pastry-1",
    name: "Bánh tiramisu",
    category: "pastry",
    priceVnd: 55000,
    description: "Mascarpone, cà phê, bột cacao Hà Lan",
    highlight: false,
    createdAt: "2024-01-01T00:00:09.000Z",
  },
  {
    id: "seed-pastry-2",
    name: "Bánh croissant bơ",
    category: "pastry",
    priceVnd: 35000,
    description: "Bơ Pháp, vỏ giòn nhiều lớp",
    highlight: false,
    createdAt: "2024-01-01T00:00:10.000Z",
  },
  {
    id: "seed-other-1",
    name: "Nước suối Lavie",
    category: "other",
    priceVnd: 15000,
    description: "Chai 500ml",
    highlight: false,
    createdAt: "2024-01-01T00:00:11.000Z",
  },
];

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isMenuCategory(v: unknown): v is MenuCategory {
  return (
    v === "coffee" ||
    v === "cold" ||
    v === "tea" ||
    v === "pastry" ||
    v === "other"
  );
}

function parseItem(raw: unknown): MenuItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || r.id.length === 0) return null;
  if (typeof r.name !== "string") return null;
  if (!isMenuCategory(r.category)) return null;
  if (typeof r.priceVnd !== "number" || !Number.isFinite(r.priceVnd)) return null;
  const description = typeof r.description === "string" ? r.description : "";
  const highlight = r.highlight === true;
  const createdAt =
    typeof r.createdAt === "string" ? r.createdAt : new Date(0).toISOString();
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    priceVnd: Math.max(0, Math.round(r.priceVnd)),
    description,
    highlight,
    createdAt,
  };
}

function readRaw(): MenuItem[] | null {
  const storage = safeStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const items: MenuItem[] = [];
    for (const v of parsed) {
      const it = parseItem(v);
      if (it) items.push(it);
    }
    return items;
  } catch {
    return null;
  }
}

function writeRaw(items: MenuItem[]): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    return;
  }
  dispatchChange();
}

function dispatchChange(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_KEY,
        storageArea: window.localStorage,
      }),
    );
  } catch {
    // ignore
  }
  try {
    window.dispatchEvent(new CustomEvent(MENU_EVENT));
  } catch {
    // ignore
  }
}

function newId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getMenu(): MenuItem[] {
  const existing = readRaw();
  if (existing && existing.length > 0) return existing;
  // seed defaults if empty (only when storage available)
  const storage = safeStorage();
  if (storage) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ITEMS));
    } catch {
      // ignore
    }
  }
  return DEFAULT_ITEMS.map((it) => ({ ...it }));
}

export function addItem(
  input: Omit<MenuItem, "id" | "createdAt">,
): MenuItem {
  const item: MenuItem = {
    ...input,
    id: newId(),
    createdAt: new Date().toISOString(),
    priceVnd: Math.max(0, Math.round(input.priceVnd)),
    description: input.description ?? "",
    highlight: input.highlight === true,
  };
  const list = readRaw() ?? DEFAULT_ITEMS.map((it) => ({ ...it }));
  list.push(item);
  writeRaw(list);
  return item;
}

export function updateItem(id: string, patch: Partial<MenuItem>): void {
  const list = readRaw() ?? DEFAULT_ITEMS.map((it) => ({ ...it }));
  const idx = list.findIndex((it) => it.id === id);
  if (idx < 0) return;
  const current = list[idx];
  const next: MenuItem = {
    ...current,
    ...patch,
    id: current.id,
    createdAt: current.createdAt,
  };
  if (typeof patch.priceVnd === "number") {
    next.priceVnd = Math.max(0, Math.round(patch.priceVnd));
  }
  if (patch.category !== undefined && !isMenuCategory(patch.category)) {
    next.category = current.category;
  }
  list[idx] = next;
  writeRaw(list);
}

export function removeItem(id: string): void {
  const list = readRaw() ?? DEFAULT_ITEMS.map((it) => ({ ...it }));
  const filtered = list.filter((it) => it.id !== id);
  writeRaw(filtered);
}

export function resetToDefaults(): void {
  writeRaw(DEFAULT_ITEMS.map((it) => ({ ...it })));
}
