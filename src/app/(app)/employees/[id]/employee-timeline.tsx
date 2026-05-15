"use client";

import { useEffect, useRef, useState } from "react";
import { Radio, History } from "lucide-react";
import { ActivityRow } from "@/components/activity-feed";

type ActivityItem = {
  id: number;
  action: string;
  summary: string;
  createdAt: Date;
  user: { id: number; name: string; email: string; role: string } | null;
};

type SerializedActivity = Omit<ActivityItem, "createdAt"> & {
  createdAt: string;
};

export function EmployeeTimeline({
  employeeId,
  initial,
  maxItems = 30,
}: {
  employeeId: number;
  initial: ActivityItem[];
  maxItems?: number;
}) {
  const [items, setItems] = useState<ActivityItem[]>(initial);
  const [connected, setConnected] = useState(false);
  const [highlight, setHighlight] = useState<Set<number>>(new Set());
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/activity/stream");
    esRef.current = es;

    es.addEventListener("ready", () => setConnected(true));

    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as SerializedActivity & {
          entityType?: string;
          entityId?: number | null;
        };
        // Only react to events tied to THIS employee
        if (data.entityType !== "employee" || data.entityId !== employeeId) {
          return;
        }
        const activity: ActivityItem = {
          ...data,
          createdAt: new Date(data.createdAt),
        };
        setItems((prev) => {
          if (prev.some((p) => p.id === activity.id)) return prev;
          return [activity, ...prev].slice(0, maxItems);
        });
        setHighlight((prev) => {
          const next = new Set(prev);
          next.add(activity.id);
          return next;
        });
        setTimeout(() => {
          setHighlight((prev) => {
            const next = new Set(prev);
            next.delete(activity.id);
            return next;
          });
        }, 2500);
      } catch {
        // ignore malformed
      }
    };

    es.onerror = () => setConnected(false);

    return () => es.close();
  }, [employeeId, maxItems]);

  return (
    <div>
      <style>{`
        @keyframes timeline-flash {
          0%   { background-color: hsl(var(--primary) / 0.18); transform: translateX(-4px); }
          100% { background-color: transparent; transform: translateX(0); }
        }
        .timeline-new { animation: timeline-flash 1.8s ease-out; }
      `}</style>

      <div className="mb-3 flex items-center gap-2 text-xs">
        <span className="relative inline-flex size-2 items-center justify-center">
          <span
            className={`absolute inline-flex size-2 rounded-full ${
              connected ? "bg-emerald-500" : "bg-muted-foreground/40"
            }`}
          />
          {connected && (
            <span className="absolute inline-flex size-2 animate-ping rounded-full bg-emerald-400 opacity-75" />
          )}
        </span>
        <span className="text-muted-foreground">
          {connected ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
              <Radio className="size-3" /> Cập nhật trực tiếp
            </span>
          ) : (
            "Đang kết nối..."
          )}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
          <History className="size-6 opacity-40" />
          <p>Chưa có hoạt động nào cho nhân viên này</p>
        </div>
      ) : (
        <ol className="relative space-y-3 border-l-2 border-border pl-4">
          {items.map((item) => (
            <li
              key={item.id}
              className={
                highlight.has(item.id)
                  ? "timeline-new -mx-1 rounded-md px-1 py-1"
                  : ""
              }
            >
              <span className="absolute -left-[7px] mt-3 size-3 rounded-full border-2 border-background bg-primary" />
              <ActivityRow item={item} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
