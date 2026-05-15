"use client";

import { useEffect, useState, useRef } from "react";
import { LogIn, LogOut, Plane, ListChecks, CalendarPlus, Heart, Sparkles } from "lucide-react";

type SerializedActivity = {
  id: number;
  action: string;
  summary: string;
  createdAt: string;
  user: { id: number; name: string; email: string; role: string } | null;
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "attendance.checkin": LogIn,
  "attendance.checkout": LogOut,
  "leave.create": Plane,
  "leave.approve": Plane,
  "task.complete": ListChecks,
  "shift.create": CalendarPlus,
  "kudos.give": Heart,
};

const TONE_MAP: Record<string, string> = {
  "attendance.checkin": "text-emerald-300 bg-emerald-500/15",
  "attendance.checkout": "text-sky-300 bg-sky-500/15",
  "leave.create": "text-amber-300 bg-amber-500/15",
  "leave.approve": "text-emerald-300 bg-emerald-500/15",
  "task.complete": "text-violet-300 bg-violet-500/15",
  "shift.create": "text-sky-300 bg-sky-500/15",
  "kudos.give": "text-rose-300 bg-rose-500/15",
};

type FlashEntry = SerializedActivity & { receivedAt: number };

export function ActivityTicker({ initial = [] }: { initial?: SerializedActivity[] }) {
  const [items, setItems] = useState<FlashEntry[]>(
    initial.slice(0, 8).map((a) => ({ ...a, receivedAt: Date.now() })),
  );
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/activity/stream");
    esRef.current = es;
    let cancelled = false;

    es.addEventListener("ready", () => {
      if (!cancelled) setConnected(true);
    });

    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as SerializedActivity;
        setItems((prev) => {
          if (prev.some((p) => p.id === data.id)) return prev;
          return [{ ...data, receivedAt: Date.now() }, ...prev].slice(0, 8);
        });
      } catch {
        // ignore
      }
    };

    es.onerror = () => {
      if (!cancelled) setConnected(false);
    };

    return () => {
      cancelled = true;
      es.close();
    };
  }, []);

  function fmtTime(iso: string): string {
    try {
      const d = new Date(iso);
      const h = String(d.getHours()).padStart(2, "0");
      const m = String(d.getMinutes()).padStart(2, "0");
      return `${h}:${m}`;
    } catch {
      return "";
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm uppercase tracking-widest text-white/60">
          <Sparkles className="size-4 text-amber-300" />
          Hoạt động trực tiếp
        </div>
        <span className="flex items-center gap-1.5 text-xs text-white/50">
          <span className="relative flex size-2">
            {connected && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex size-2 rounded-full ${
                connected ? "bg-emerald-500" : "bg-white/30"
              }`}
            />
          </span>
          {connected ? "live" : "đang kết nối..."}
        </span>
      </div>

      <ul className="flex-1 space-y-2 overflow-hidden">
        {items.length === 0 ? (
          <li className="rounded-xl bg-white/5 p-4 text-center text-sm text-white/50">
            Chưa có hoạt động nào hôm nay
          </li>
        ) : (
          items.map((it, idx) => {
            const Icon = ICON_MAP[it.action] ?? Sparkles;
            const tone =
              TONE_MAP[it.action] ?? "text-white/70 bg-white/10";
            const fresh = Date.now() - it.receivedAt < 4000;
            return (
              <li
                key={it.id}
                style={{
                  animation: idx === 0 && fresh
                    ? "ticker-in 700ms ease-out both"
                    : undefined,
                }}
                className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2 backdrop-blur-sm ring-1 ring-white/10"
              >
                <span className={`flex size-9 items-center justify-center rounded-lg ${tone}`}>
                  <Icon className="size-4" />
                </span>
                <p className="flex-1 truncate text-sm text-white/90">
                  {it.summary}
                </p>
                <span className="text-xs tabular-nums text-white/50">
                  {fmtTime(it.createdAt)}
                </span>
              </li>
            );
          })
        )}
      </ul>

      <style>{`
        @keyframes ticker-in {
          0%   { transform: translateX(-12px); opacity: 0; background-color: rgba(16, 185, 129, 0.25); }
          100% { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
