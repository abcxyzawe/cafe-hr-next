/**
 * Toast chime preference: a single boolean flag, persisted in localStorage.
 * Defaults to OFF so newly logged-in users aren't startled by sound.
 */

export const STORAGE_KEY = "cafe-hr-toast-sound";

export function loadSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return false;
    return raw === "1" || raw === "true";
  } catch {
    return false;
  }
}

export function setSoundEnabled(v: boolean): void {
  if (typeof window === "undefined") return;
  const next = v ? "1" : "0";
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
    // Same-tab listeners don't get a native `storage` event, so dispatch one
    // so any listening component (e.g. RealtimeToaster) updates live.
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_KEY,
        newValue: next,
      }),
    );
  } catch {
    // ignore quota/serialization errors
  }
}
