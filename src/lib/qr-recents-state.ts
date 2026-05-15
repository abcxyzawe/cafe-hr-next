export const STORAGE_KEY = "cafe-hr-qr-recents";
export const QR_RECENTS_EVENT = "cafe-hr:qr-recents-changed";
export const MAX_RECENTS = 5;

export type QrMode = "url" | "text" | "wifi";

export type QrRecent = {
  id: string;
  mode: QrMode;
  label: string;
  payload: string;
  createdAt: string;
};

function isQrMode(value: unknown): value is QrMode {
  return value === "url" || value === "text" || value === "wifi";
}

function isQrRecent(value: unknown): value is QrRecent {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    isQrMode(v.mode) &&
    typeof v.label === "string" &&
    typeof v.payload === "string" &&
    typeof v.createdAt === "string"
  );
}

function generateId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function notifyChange(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(QR_RECENTS_EVENT));
  } catch {
    // ignore
  }
}

export function getRecents(): QrRecent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid = parsed.filter(isQrRecent);
    return valid.slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

export function pushRecent(
  input: Omit<QrRecent, "id" | "createdAt">,
): void {
  if (typeof window === "undefined") return;
  try {
    const current = getRecents();
    const filtered = current.filter((r) => r.payload !== input.payload);
    const next: QrRecent[] = [
      {
        ...input,
        id: generateId(),
        createdAt: new Date().toISOString(),
      },
      ...filtered,
    ].slice(0, MAX_RECENTS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    notifyChange();
  } catch {
    // ignore quota / serialization errors
  }
}

export function clearRecents(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    notifyChange();
  } catch {
    // ignore
  }
}
