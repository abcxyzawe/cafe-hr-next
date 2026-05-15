"use client";

import { useEffect, useState } from "react";
import { Megaphone, X, Info, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ANNOUNCEMENT_EVENT,
  type AnnouncementEventDetail,
} from "@/components/realtime-toaster";

const STORAGE_KEY = "cafe-hr-dismissed-announcement-id";

const SEVERITY_STYLES: Record<
  AnnouncementEventDetail["severity"],
  { wrap: string; icon: React.ComponentType<{ className?: string }> }
> = {
  info: {
    wrap: "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100",
    icon: Info,
  },
  success: {
    wrap: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100",
    icon: CheckCircle2,
  },
  warning: {
    wrap: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100",
    icon: AlertTriangle,
  },
};

export function AnnouncementBanner() {
  const [latest, setLatest] = useState<AnnouncementEventDetail | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    function onAnnouncement(ev: Event) {
      const ce = ev as CustomEvent<AnnouncementEventDetail>;
      const detail = ce.detail;
      if (!detail || typeof detail.id !== "number") return;
      const dismissed = Number(window.localStorage.getItem(STORAGE_KEY) ?? "0");
      if (detail.id <= dismissed) return;
      setLatest(detail);
    }
    window.addEventListener(ANNOUNCEMENT_EVENT, onAnnouncement);
    return () => window.removeEventListener(ANNOUNCEMENT_EVENT, onAnnouncement);
  }, []);

  if (!latest) return null;

  const style = SEVERITY_STYLES[latest.severity];
  const Icon = style.icon;

  function dismiss() {
    if (!latest) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(latest.id));
    } catch {
      // ignore quota errors
    }
    setLatest(null);
  }

  return (
    <div
      className={cn(
        "relative mb-4 flex items-start gap-3 rounded-lg border-2 px-4 py-3 shadow-sm",
        style.wrap,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-white/60 dark:bg-black/20">
        <Megaphone className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider opacity-80">
          <Icon className="size-3.5" />
          <span>Thông báo từ {latest.senderName}</span>
        </div>
        <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap break-words">
          {latest.message}
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Đóng thông báo"
        title="Đóng"
        className="rounded-md p-1 opacity-70 transition-opacity hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/10"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
