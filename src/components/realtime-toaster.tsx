"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { LogIn, LogOut, UserPlus, Plane, ListChecks, CalendarPlus, Heart, Megaphone } from "lucide-react";
import { playChime } from "@/lib/play-chime";
import { STORAGE_KEY as SOUND_STORAGE_KEY, loadSoundEnabled } from "@/lib/sound-prefs";
import {
  STORAGE_KEY as QUIET_HOURS_KEY,
  SNOOZE_KEY as QUIET_SNOOZE_KEY,
  isCurrentlyQuiet,
} from "@/lib/quiet-hours";
import {
  STORAGE_KEY as STARRED_STORAGE_KEY,
  loadStars,
  makeKey,
  type StarKey,
} from "@/lib/starred-entities";

type SerializedActivity = {
  id: number;
  action: string;
  summary: string;
  entityType: string | null;
  entityId: number | null;
  createdAt: string;
  user: { id: number; name: string; email: string; role: string } | null;
  metadata?: unknown;
};

type AnnouncementMetadata = {
  message: string;
  severity: "info" | "success" | "warning";
  senderId: number;
  senderName: string;
};

export const ANNOUNCEMENT_EVENT = "cafe-hr:announcement";

export type AnnouncementEventDetail = {
  id: number;
  message: string;
  severity: "info" | "success" | "warning";
  senderName: string;
  createdAt: string;
};

function parseAnnouncementMetadata(value: unknown): AnnouncementMetadata | null {
  if (!value || typeof value !== "object") return null;
  const m = value as Record<string, unknown>;
  if (typeof m.message !== "string") return null;
  if (m.severity !== "info" && m.severity !== "success" && m.severity !== "warning") return null;
  if (typeof m.senderId !== "number") return null;
  if (typeof m.senderName !== "string") return null;
  return {
    message: m.message,
    severity: m.severity,
    senderId: m.senderId,
    senderName: m.senderName,
  };
}

export type ToastVariant = "success" | "info" | "warning" | "default";

export type ToastConfig = {
  variant: ToastVariant;
  icon: React.ComponentType<{ className?: string }>;
  prefix: string;
};

// Map activity action → toast styling. Unknown actions are silently ignored.
export const TOAST_MAP = {
  "attendance.checkin": { variant: "success", icon: LogIn, prefix: "Check-in" },
  "attendance.checkout": { variant: "info", icon: LogOut, prefix: "Check-out" },
  "employee.create": { variant: "success", icon: UserPlus, prefix: "Nhân viên mới" },
  "leave.create": { variant: "warning", icon: Plane, prefix: "Đơn nghỉ mới" },
  "leave.approve": { variant: "success", icon: Plane, prefix: "Đơn nghỉ duyệt" },
  "leave.reject": { variant: "info", icon: Plane, prefix: "Đơn nghỉ từ chối" },
  "task.create": { variant: "info", icon: ListChecks, prefix: "Công việc mới" },
  "task.complete": { variant: "success", icon: ListChecks, prefix: "Hoàn thành" },
  "shift.create": { variant: "info", icon: CalendarPlus, prefix: "Ca mới" },
  "kudos.give": { variant: "success", icon: Heart, prefix: "Lời khen mới" },
  "announcement.broadcast": { variant: "success", icon: Megaphone, prefix: "📢 Thông báo" },
} as const satisfies Record<string, ToastConfig>;

export type ToastEventKey = keyof typeof TOAST_MAP;

export const TOAST_EVENT_KEYS = Object.keys(TOAST_MAP) as ToastEventKey[];

/**
 * Events considered "high priority" — when enabled, these trigger an
 * audible chime alongside the visual toast.
 */
export const HIGH_PRIORITY_EVENTS: ReadonlySet<ToastEventKey> = new Set<ToastEventKey>([
  "announcement.broadcast",
  "kudos.give",
]);

export type ToastPrefs = Record<ToastEventKey, boolean>;

export const PREFS_STORAGE_KEY = "cafe-hr-toast-prefs";
const LEGACY_MUTE_KEY = "cafe-hr-toasts-enabled";

export function defaultToastPrefs(value = true): ToastPrefs {
  return TOAST_EVENT_KEYS.reduce<ToastPrefs>((acc, k) => {
    acc[k] = value;
    return acc;
  }, {} as ToastPrefs);
}

/**
 * Read the current preferences map from localStorage.
 * Performs a one-time migration from the legacy single-flag key.
 * Always returns a complete map (missing keys default to true).
 */
export function loadToastPrefs(): ToastPrefs {
  if (typeof window === "undefined") return defaultToastPrefs(true);

  // One-time migration: legacy "0" meant "muted"
  const legacy = localStorage.getItem(LEGACY_MUTE_KEY);
  if (legacy !== null && localStorage.getItem(PREFS_STORAGE_KEY) === null) {
    const migrated = defaultToastPrefs(legacy !== "0");
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(migrated));
    } catch {
      // ignore quota errors — fall back to in-memory defaults
    }
    localStorage.removeItem(LEGACY_MUTE_KEY);
    return migrated;
  }

  const raw = localStorage.getItem(PREFS_STORAGE_KEY);
  if (!raw) return defaultToastPrefs(true);

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return defaultToastPrefs(true);
    const map = parsed as Record<string, unknown>;
    const out = defaultToastPrefs(true);
    for (const k of TOAST_EVENT_KEYS) {
      if (typeof map[k] === "boolean") out[k] = map[k] as boolean;
    }
    return out;
  } catch {
    return defaultToastPrefs(true);
  }
}

export function saveToastPrefs(prefs: ToastPrefs): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
    // Same-tab listeners don't get a native `storage` event, so fire one
    // with the same key so the RealtimeToaster picks up the change live.
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: PREFS_STORAGE_KEY,
        newValue: JSON.stringify(prefs),
      }),
    );
  } catch {
    // ignore
  }
}

/**
 * Subscribe to /api/activity/stream and surface key events as toasts.
 * Skips events authored by the current user to avoid self-noise.
 * Per-event-type mute is read from localStorage (`cafe-hr-toast-prefs`)
 * and updated live via the `storage` event.
 */
export function RealtimeToaster({ currentUserId }: { currentUserId: number }) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let prefs: ToastPrefs = loadToastPrefs();
    let soundEnabled: boolean = loadSoundEnabled();
    let starred: Set<StarKey> = loadStars();

    function onStorage(ev: StorageEvent) {
      if (ev.key === null) {
        prefs = loadToastPrefs();
        soundEnabled = loadSoundEnabled();
        starred = loadStars();
        return;
      }
      if (ev.key === PREFS_STORAGE_KEY) {
        prefs = loadToastPrefs();
      } else if (ev.key === SOUND_STORAGE_KEY) {
        soundEnabled = loadSoundEnabled();
      } else if (ev.key === STARRED_STORAGE_KEY) {
        starred = loadStars();
      } else if (ev.key === QUIET_HOURS_KEY || ev.key === QUIET_SNOOZE_KEY) {
        // Quiet-hours / snooze state is read fresh per event via
        // isCurrentlyQuiet(); listening here is just to keep parity and
        // make the dependency explicit for future-proofing.
      }
    }
    window.addEventListener("storage", onStorage);

    function maybeChime(action: ToastEventKey): void {
      if (!soundEnabled) return;
      if (!HIGH_PRIORITY_EVENTS.has(action)) return;
      if (prefs[action] === false) return;
      playChime();
    }

    const es = new EventSource("/api/activity/stream");
    let cancelled = false;

    es.onmessage = (ev) => {
      if (cancelled) return;
      let data: SerializedActivity;
      try {
        data = JSON.parse(ev.data) as SerializedActivity;
      } catch {
        return;
      }
      const action = data.action as ToastEventKey;
      const cfg = TOAST_MAP[action];
      if (!cfg) return;
      // Announcements are broadcast to everyone — admins should see their own
      // go through. All other event types skip self to avoid noise.
      const isAnnouncement = action === "announcement.broadcast";
      if (!isAnnouncement && data.user?.id === currentUserId) return;
      if (prefs[action] === false) return;
      // Quiet hours / one-hour snooze: silence everything (incl. announcements).
      if (isCurrentlyQuiet()) return;

      // If this event touches a starred entity tuple, mark it. The prefix
      // labels below get a leading "⭐ " so the admin spots followed entities
      // at a glance.
      const isStarredEntity =
        data.entityType !== null &&
        data.entityId !== null &&
        starred.has(makeKey(data.entityType, data.entityId));

      if (isAnnouncement) {
        const meta = parseAnnouncementMetadata(data.metadata);
        const severity: "info" | "success" | "warning" = meta?.severity ?? "success";
        const senderName = meta?.senderName ?? data.user?.name ?? "Quản trị viên";
        const body = meta?.message ?? data.summary;
        // Notify the dashboard banner (if mounted) so it can surface the latest
        // announcement without opening a second EventSource.
        try {
          window.dispatchEvent(
            new CustomEvent(ANNOUNCEMENT_EVENT, {
              detail: {
                id: data.id,
                message: body,
                severity,
                senderName,
                createdAt: data.createdAt,
              } satisfies AnnouncementEventDetail,
            }),
          );
        } catch {
          // ignore — dispatching a CustomEvent should never throw, but be safe
        }
        const title = (
          <div className="flex items-center gap-2">
            <Megaphone className="size-4 shrink-0" />
            <span className="text-sm font-semibold">
              {isStarredEntity ? "⭐ " : ""}📢 Thông báo từ {senderName}
            </span>
          </div>
        );
        const opts = {
          duration: 8000,
          description: body,
          className: "cafe-hr-announcement-toast border-2 shadow-lg",
          action: {
            label: "Đã hiểu",
            onClick: () => {
              /* dismissed by sonner */
            },
          },
        };
        if (severity === "success") toast.success(title, opts);
        else if (severity === "warning") toast.warning(title, opts);
        else toast.info(title, opts);
        maybeChime(action);
        return;
      }

      const Icon = cfg.icon;
      const prefixLabel = isStarredEntity ? `⭐ ${cfg.prefix}` : cfg.prefix;
      const message = (
        <div className="flex items-start gap-2">
          <Icon className="mt-0.5 size-4 shrink-0 opacity-80" />
          <div className="min-w-0">
            <p className="text-xs font-semibold opacity-80">{prefixLabel}</p>
            <p className="text-sm leading-snug">{data.summary}</p>
          </div>
        </div>
      );

      const opts = { duration: 4000 };
      if (cfg.variant === "success") toast.success(message, opts);
      else if (cfg.variant === "warning") toast.warning(message, opts);
      else if (cfg.variant === "info") toast.info(message, opts);
      else toast(message, opts);
      maybeChime(action);
    };

    es.onerror = () => {
      // EventSource auto-reconnects — no toast spam on transient drops
    };

    return () => {
      cancelled = true;
      es.close();
      window.removeEventListener("storage", onStorage);
    };
  }, [currentUserId]);

  return null;
}
