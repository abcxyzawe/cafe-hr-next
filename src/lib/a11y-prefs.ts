export const STORAGE_KEY = "cafe-hr-a11y";
export const A11Y_EVENT = "cafe-hr:a11y-changed";

export type A11yPrefs = {
  reduceMotion: boolean;
  highContrast: boolean;
  largeTouch: boolean;
};

export const DEFAULT_A11Y_PREFS: A11yPrefs = {
  reduceMotion: false,
  highContrast: false,
  largeTouch: false,
};

export function getA11yPrefs(): A11yPrefs {
  if (typeof window === "undefined") return DEFAULT_A11Y_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_A11Y_PREFS;
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") return DEFAULT_A11Y_PREFS;
    const obj = parsed as Record<string, unknown>;
    return {
      reduceMotion: typeof obj.reduceMotion === "boolean" ? obj.reduceMotion : false,
      highContrast: typeof obj.highContrast === "boolean" ? obj.highContrast : false,
      largeTouch: typeof obj.largeTouch === "boolean" ? obj.largeTouch : false,
    };
  } catch {
    return DEFAULT_A11Y_PREFS;
  }
}

export function setA11yPrefs(prefs: A11yPrefs): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  window.dispatchEvent(new Event(A11Y_EVENT));
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: STORAGE_KEY,
      newValue: JSON.stringify(prefs),
    }),
  );
  applyA11yClasses(prefs);
}

export function applyA11yClasses(prefs: A11yPrefs): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("a11y-reduce-motion", prefs.reduceMotion);
  root.classList.toggle("a11y-high-contrast", prefs.highContrast);
  root.classList.toggle("a11y-large-touch", prefs.largeTouch);
}
