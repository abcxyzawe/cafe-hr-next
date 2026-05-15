"use client";

import { useEffect, useState } from "react";
import { LogIn, LogOut, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type TickerEvent = {
  id: number;
  action: string; // "kiosk.checkin" | "kiosk.checkout" | other
  summary: string;
  createdAt: string | Date;
};

const MAX = 6;
const KIOSK_ACTIONS = new Set(["kiosk.checkin", "kiosk.checkout"]);

function relativeTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 30) return "vừa xong";
  if (diff < 60) return `${diff}s trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function RecentCheckinsTicker({ initial }: { initial: TickerEvent[] }) {
  const [items, setItems] = useState<TickerEvent[]>(
    initial.filter((e) => KIOSK_ACTIONS.has(e.action)).slice(0, MAX),
  );
  const [flash, setFlash] = useState<Set<number>>(new Set());

  useEffect(() => {
    const es = new EventSource("/api/kiosk/stream");
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as TickerEvent;
        if (!KIOSK_ACTIONS.has(data.action)) return;
        setItems((prev) => {
          if (prev.some((p) => p.id === data.id)) return prev;
          return [data, ...prev].slice(0, MAX);
        });
        setFlash((prev) => {
          const next = new Set(prev);
          next.add(data.id);
          return next;
        });
        setTimeout(() => {
          setFlash((prev) => {
            const next = new Set(prev);
            next.delete(data.id);
            return next;
          });
        }, 3000);
      } catch {
        // ignore
      }
    };
    return () => es.close();
  }, []);

  // Periodically tick to refresh relative times
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="size-3.5" />
        Chưa có ai chấm công qua kiosk hôm nay
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes ticker-slide {
          0%   { transform: translateX(-12px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        .ticker-new { animation: ticker-slide 0.6s ease-out; }
      `}</style>
      <div className="flex items-center gap-2 overflow-hidden">
        <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
          Live
        </span>
        <div className="flex flex-1 items-center gap-2 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden">
          {items.map((item) => {
            const isIn = item.action === "kiosk.checkin";
            const Icon = isIn ? LogIn : LogOut;
            return (
              <div
                key={item.id}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                  isIn
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300"
                    : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300",
                  flash.has(item.id) && "ticker-new shadow",
                )}
              >
                <Icon className="size-3" />
                <span className="max-w-[180px] truncate font-medium">
                  {item.summary.replace(/ qua kiosk.*$/, "")}
                </span>
                <span className="text-[10px] opacity-70">
                  · {relativeTime(item.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
