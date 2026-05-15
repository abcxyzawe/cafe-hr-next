// Universal localStorage backup utility for Cafe HR.
// SSR-safe: every exported function returns a no-op / empty value when window is undefined.

export const PREFIX_RE = /^cafe-hr[:-]/;

export type BackupEntry = {
  key: string;
  size: number;
  jsonValid: boolean;
  arrayLength: number | null;
};

export type BackupExport = {
  exportedAt: string;
  version: string;
  data: Record<string, unknown>;
};

export type RestoreResult = {
  restored: number;
  skipped: number;
  errors: string[];
};

const VERSION = "1.0";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function tryParseJson(raw: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch {
    return { ok: false };
  }
}

function listMatchingKeys(): string[] {
  if (!isBrowser()) return [];
  const ls = window.localStorage;
  const keys: string[] = [];
  for (let i = 0; i < ls.length; i++) {
    const k = ls.key(i);
    if (k && PREFIX_RE.test(k)) keys.push(k);
  }
  keys.sort((a, b) => a.localeCompare(b));
  return keys;
}

export function listBackupEntries(): BackupEntry[] {
  if (!isBrowser()) return [];
  const ls = window.localStorage;
  return listMatchingKeys().map<BackupEntry>((key) => {
    const raw = ls.getItem(key) ?? "";
    const parsed = tryParseJson(raw);
    let arrayLength: number | null = null;
    let jsonValid = false;
    if (parsed.ok) {
      jsonValid = true;
      if (Array.isArray(parsed.value)) arrayLength = parsed.value.length;
    }
    return {
      key,
      // byte size of UTF-8 encoded value
      size: new Blob([raw]).size,
      jsonValid,
      arrayLength,
    };
  });
}

export function buildBackup(): BackupExport {
  const data: Record<string, unknown> = {};
  if (isBrowser()) {
    const ls = window.localStorage;
    for (const key of listMatchingKeys()) {
      const raw = ls.getItem(key);
      if (raw === null) continue;
      const parsed = tryParseJson(raw);
      data[key] = parsed.ok ? parsed.value : raw;
    }
  }
  return {
    exportedAt: new Date().toISOString(),
    version: VERSION,
    data,
  };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== "object") return false;
  if (Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v) as object | null;
  return proto === Object.prototype || proto === null;
}

export function restoreBackup(backup: unknown): RestoreResult {
  const result: RestoreResult = { restored: 0, skipped: 0, errors: [] };
  if (!isBrowser()) {
    result.errors.push("localStorage không khả dụng (server-side).");
    return result;
  }
  if (!isPlainObject(backup)) {
    result.errors.push("Dữ liệu không phải JSON object hợp lệ.");
    return result;
  }
  const dataRaw = backup.data;
  if (!isPlainObject(dataRaw)) {
    result.errors.push("Trường 'data' phải là object.");
    return result;
  }
  const ls = window.localStorage;
  for (const [key, value] of Object.entries(dataRaw)) {
    if (!PREFIX_RE.test(key)) {
      result.skipped += 1;
      continue;
    }
    try {
      const oldValue = ls.getItem(key);
      const newValue = typeof value === "string" ? value : JSON.stringify(value);
      ls.setItem(key, newValue);
      // Notify same-tab listeners. The native StorageEvent only fires across tabs,
      // so dispatch one manually for live components subscribed to "storage".
      try {
        const evt = new StorageEvent("storage", {
          key,
          oldValue,
          newValue,
          storageArea: ls,
          url: window.location.href,
        });
        window.dispatchEvent(evt);
      } catch {
        // Some browsers (older Safari) don't allow constructing StorageEvent — fall back to a CustomEvent.
        window.dispatchEvent(new CustomEvent("storage", { detail: { key } }));
      }
      result.restored += 1;
    } catch (err) {
      result.errors.push(`${key}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return result;
}

export function clearAllCafeHrKeys(): number {
  if (!isBrowser()) return 0;
  const ls = window.localStorage;
  const keys = listMatchingKeys();
  let cleared = 0;
  for (const key of keys) {
    const oldValue = ls.getItem(key);
    try {
      ls.removeItem(key);
      cleared += 1;
      try {
        const evt = new StorageEvent("storage", {
          key,
          oldValue,
          newValue: null,
          storageArea: ls,
          url: window.location.href,
        });
        window.dispatchEvent(evt);
      } catch {
        window.dispatchEvent(new CustomEvent("storage", { detail: { key } }));
      }
    } catch {
      // ignore individual key failures
    }
  }
  return cleared;
}
