export const STORAGE_KEY = "cafe-hr-email-sig";
export const SIG_EVENT = "cafe-hr:email-sig-changed";

export type SigTheme = "cafe" | "ocean" | "rose" | "forest" | "mono";

export type SigData = {
  name: string;
  role: string;
  phone: string;
  email: string;
  instagram: string;
  website: string;
  logoUrl: string;
  theme: SigTheme;
};

export const DEFAULT_SIG_DATA: SigData = {
  name: "Đỗ Quốc Anh",
  role: "Quản lý ca",
  phone: "0901 234 567",
  email: "doquocanh121@gmail.com",
  instagram: "@cafe.hr",
  website: "https://cafehr.vn",
  logoUrl: "",
  theme: "cafe",
};

export const THEME_LABEL: Record<SigTheme, string> = {
  cafe: "Cà phê (nâu ấm)",
  ocean: "Đại dương",
  rose: "Hồng pastel",
  forest: "Rừng xanh",
  mono: "Đơn sắc",
};

export const THEME_COLOR: Record<SigTheme, { primary: string; muted: string }> = {
  cafe: { primary: "#7B3F00", muted: "#8a7560" },
  ocean: { primary: "#0E7490", muted: "#64748b" },
  rose: { primary: "#BE185D", muted: "#94748a" },
  forest: { primary: "#166534", muted: "#6b7c6e" },
  mono: { primary: "#1f2937", muted: "#6b7280" },
};

const THEME_KEYS: ReadonlySet<SigTheme> = new Set<SigTheme>([
  "cafe",
  "ocean",
  "rose",
  "forest",
  "mono",
]);

function isSigTheme(v: unknown): v is SigTheme {
  return typeof v === "string" && THEME_KEYS.has(v as SigTheme);
}

function pickString(v: unknown, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function dispatchChange(value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_KEY,
        newValue: value,
        storageArea: window.localStorage,
      }),
    );
  } catch {
    // ignore
  }
  try {
    window.dispatchEvent(
      new CustomEvent(SIG_EVENT, { detail: { key: STORAGE_KEY } }),
    );
  } catch {
    // ignore
  }
}

export function getSigData(): SigData {
  const storage = safeStorage();
  if (!storage) return { ...DEFAULT_SIG_DATA };
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SIG_DATA };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return { ...DEFAULT_SIG_DATA };
    }
    const obj = parsed as Record<string, unknown>;
    return {
      name: pickString(obj.name, DEFAULT_SIG_DATA.name),
      role: pickString(obj.role, DEFAULT_SIG_DATA.role),
      phone: pickString(obj.phone, DEFAULT_SIG_DATA.phone),
      email: pickString(obj.email, DEFAULT_SIG_DATA.email),
      instagram: pickString(obj.instagram, DEFAULT_SIG_DATA.instagram),
      website: pickString(obj.website, DEFAULT_SIG_DATA.website),
      logoUrl: pickString(obj.logoUrl, DEFAULT_SIG_DATA.logoUrl),
      theme: isSigTheme(obj.theme) ? obj.theme : DEFAULT_SIG_DATA.theme,
    };
  } catch {
    return { ...DEFAULT_SIG_DATA };
  }
}

export function setSigData(data: SigData): void {
  const storage = safeStorage();
  if (!storage) return;
  const value = JSON.stringify(data);
  try {
    storage.setItem(STORAGE_KEY, value);
  } catch {
    return;
  }
  dispatchChange(value);
}
