"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { ActivityRow } from "@/components/activity-feed";

type Activity = {
  id: number;
  action: string;
  summary: string;
  createdAt: Date;
  user: { id: number; name: string; email: string; role: string } | null;
};

type SerializedActivity = Omit<Activity, "createdAt"> & { createdAt: string };

const STORAGE_KEY = "cafe-hr-last-seen-activity-id";

export function NotificationBell({ initial }: { initial: Activity[] }) {
  const [items, setItems] = useState<Activity[]>(initial);
  const [open, setOpen] = useState(false);
  const [lastSeenId, setLastSeenId] = useState<number>(0);
  const ref = useRef<HTMLDivElement>(null);

  // Initialize last-seen from localStorage
  useEffect(() => {
    const stored = Number(localStorage.getItem(STORAGE_KEY) ?? "0");
    setLastSeenId(Number.isFinite(stored) ? stored : 0);
  }, []);

  // Subscribe to SSE for live updates
  useEffect(() => {
    const es = new EventSource("/api/activity/stream");
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as SerializedActivity;
        const activity: Activity = {
          ...data,
          createdAt: new Date(data.createdAt),
        };
        setItems((prev) => {
          if (prev.some((p) => p.id === activity.id)) return prev;
          return [activity, ...prev].slice(0, 10);
        });
      } catch {
        // ignore
      }
    };
    return () => es.close();
  }, []);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Mark as seen when opened
  useEffect(() => {
    if (open && items.length > 0) {
      const top = items[0].id;
      localStorage.setItem(STORAGE_KEY, String(top));
      setLastSeenId(top);
    }
  }, [open, items]);

  const unread = items.filter((i) => i.id > lastSeenId).length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex size-9 items-center justify-center rounded-md text-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
        aria-label="Thông báo"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white shadow">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border bg-popover shadow-xl">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <p className="text-sm font-semibold">Thông báo</p>
            {unread > 0 && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                {unread} mới
              </span>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-3">
            {items.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Chưa có hoạt động nào
              </p>
            ) : (
              <ul className="space-y-3">
                {items.slice(0, 8).map((item) => (
                  <li
                    key={item.id}
                    className={
                      item.id > lastSeenId
                        ? "-mx-1 rounded-md bg-primary/5 px-1 py-1"
                        : ""
                    }
                  >
                    <ActivityRow item={item} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
