import "server-only";

/**
 * Simple in-memory presence tracker. One Map of userId → { name, email,
 * role, lastSeen }. Pruned on every read; consider Redis for multi-instance.
 *
 * Sessions expire after 90s of no heartbeat.
 */

export type PresenceEntry = {
  uid: number;
  name: string;
  email: string;
  role: "admin" | "staff";
  lastSeen: number;
};

const PRESENCE_TTL_MS = 90_000;

declare global {
  // eslint-disable-next-line no-var
  var __cafeHrPresence: Map<number, PresenceEntry> | undefined;
}

// Survive Next.js hot reload
const store: Map<number, PresenceEntry> =
  globalThis.__cafeHrPresence ?? new Map();
globalThis.__cafeHrPresence = store;

export function recordHeartbeat(entry: Omit<PresenceEntry, "lastSeen">): void {
  store.set(entry.uid, { ...entry, lastSeen: Date.now() });
}

export function removePresence(uid: number): void {
  store.delete(uid);
}

export function activePresences(): PresenceEntry[] {
  const now = Date.now();
  const result: PresenceEntry[] = [];
  for (const [uid, entry] of store) {
    if (now - entry.lastSeen > PRESENCE_TTL_MS) {
      store.delete(uid);
    } else {
      result.push(entry);
    }
  }
  // Sort by lastSeen desc — most recently active first
  return result.sort((a, b) => b.lastSeen - a.lastSeen);
}
