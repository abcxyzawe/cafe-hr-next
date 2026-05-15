"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Radio,
  LogIn,
  Plane,
  ListChecks,
  UserPlus,
  Activity,
  LayoutGrid,
} from "lucide-react";
import { Activity as ActivityIcon } from "lucide-react";
import { ActivityRow } from "./activity-feed";

type Activity = {
  id: number;
  action: string;
  summary: string;
  createdAt: Date;
  user: { id: number; name: string; email: string; role: string } | null;
};

type SerializedActivity = Omit<Activity, "createdAt"> & { createdAt: string };

type FilterKey = "all" | "attendance" | "leave" | "task" | "employee" | "other";

type TypedFilterKey = Exclude<FilterKey, "all">;

const FILTER_STORAGE_KEY = "cafe-hr-activity-filters";

const TYPED_FILTER_KEYS: readonly TypedFilterKey[] = [
  "attendance",
  "leave",
  "task",
  "employee",
  "other",
] as const;

const ALL_FILTER_KEYS: readonly FilterKey[] = [
  "all",
  ...TYPED_FILTER_KEYS,
] as const;

const FILTER_LABELS: Record<FilterKey, string> = {
  all: "Tất cả",
  attendance: "Chấm công",
  leave: "Nghỉ phép",
  task: "Việc",
  employee: "Nhân viên",
  other: "Khác",
};

const FILTER_ICONS: Record<FilterKey, React.ComponentType<{ className?: string }>> = {
  all: LayoutGrid,
  attendance: LogIn,
  leave: Plane,
  task: ListChecks,
  employee: UserPlus,
  other: Activity,
};

function mapActionToFilterKey(action: string): TypedFilterKey {
  if (action.startsWith("attendance.")) return "attendance";
  if (action.startsWith("leave.")) return "leave";
  if (action.startsWith("task.")) return "task";
  if (action.startsWith("employee.") || action.startsWith("kudos.")) {
    return "employee";
  }
  return "other";
}

function isFilterKey(value: unknown): value is FilterKey {
  return (
    typeof value === "string" &&
    (ALL_FILTER_KEYS as readonly string[]).includes(value)
  );
}

export function RealtimeActivityFeed({
  initial,
  maxItems = 12,
}: {
  initial: Activity[];
  maxItems?: number;
}) {
  const [items, setItems] = useState<Activity[]>(initial);
  const [connected, setConnected] = useState(false);
  const [newHighlight, setNewHighlight] = useState<Set<number>>(new Set());
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set());
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  // Load persisted filters on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FILTER_STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(isFilterKey);
          setActiveFilters(new Set(valid));
        }
      }
    } catch {
      // ignore corrupted storage
    }
    setFiltersLoaded(true);
  }, []);

  // Persist filter changes
  useEffect(() => {
    if (!filtersLoaded) return;
    try {
      localStorage.setItem(
        FILTER_STORAGE_KEY,
        JSON.stringify(Array.from(activeFilters)),
      );
    } catch {
      // ignore quota errors
    }
  }, [activeFilters, filtersLoaded]);

  useEffect(() => {
    let cancelled = false;
    const es = new EventSource("/api/activity/stream");
    esRef.current = es;

    es.addEventListener("ready", () => {
      if (!cancelled) setConnected(true);
    });

    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as SerializedActivity;
        const activity: Activity = {
          ...data,
          createdAt: new Date(data.createdAt),
        };
        setItems((prev) => {
          if (prev.some((p) => p.id === activity.id)) return prev;
          return [activity, ...prev].slice(0, maxItems);
        });
        setNewHighlight((prev) => {
          const next = new Set(prev);
          next.add(activity.id);
          return next;
        });
        setTimeout(() => {
          setNewHighlight((prev) => {
            const next = new Set(prev);
            next.delete(activity.id);
            return next;
          });
        }, 2500);
      } catch {
        // ignore malformed payloads
      }
    };

    es.onerror = () => {
      if (!cancelled) setConnected(false);
      // EventSource auto-reconnects
    };

    return () => {
      cancelled = true;
      es.close();
    };
  }, [maxItems]);

  const counts = useMemo<Record<FilterKey, number>>(() => {
    const acc: Record<FilterKey, number> = {
      all: items.length,
      attendance: 0,
      leave: 0,
      task: 0,
      employee: 0,
      other: 0,
    };
    for (const item of items) {
      acc[mapActionToFilterKey(item.action)] += 1;
    }
    return acc;
  }, [items]);

  const filteredItems = useMemo(() => {
    if (activeFilters.size === 0 || activeFilters.has("all")) return items;
    return items.filter((item) =>
      activeFilters.has(mapActionToFilterKey(item.action)),
    );
  }, [items, activeFilters]);

  const toggleFilter = useCallback((key: FilterKey) => {
    setActiveFilters((prev) => {
      if (key === "all") {
        // "Tất cả" deselects everything
        return new Set();
      }
      const next = new Set(prev);
      // Remove "all" sentinel if present
      next.delete("all");
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setActiveFilters(new Set());
  }, []);

  const isAllActive = activeFilters.size === 0 || activeFilters.has("all");

  return (
    <div>
      <style>{`
        @keyframes flash-in {
          0%   { background-color: hsl(var(--primary) / 0.18); transform: translateY(-4px); opacity: 0.6; }
          100% { background-color: transparent; transform: translateY(0); opacity: 1; }
        }
        .activity-new { animation: flash-in 1.8s ease-out; }
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
              <Radio className="size-3" /> Live · cập nhật mỗi 3s
            </span>
          ) : (
            "Đang kết nối..."
          )}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {ALL_FILTER_KEYS.map((key) => {
          const Icon = FILTER_ICONS[key];
          const isActive = key === "all" ? isAllActive : activeFilters.has(key);
          const count = counts[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleFilter(key)}
              aria-pressed={isActive}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              <Icon className="size-3" />
              <span>{FILTER_LABELS[key]}</span>
              <span
                className={
                  isActive
                    ? "text-primary-foreground/80"
                    : "text-muted-foreground/70"
                }
              >
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
          <ActivityIcon className="size-6 opacity-40" />
          <p>Chưa có hoạt động nào</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
          <ActivityIcon className="size-6 opacity-40" />
          <p>Không có hoạt động khớp với bộ lọc</p>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-md border border-input bg-background px-3 py-1 text-xs font-medium hover:bg-muted"
          >
            Bỏ lọc
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {filteredItems.map((item) => (
            <li
              key={item.id}
              className={
                newHighlight.has(item.id)
                  ? "activity-new -mx-2 rounded-md px-2 py-1"
                  : ""
              }
            >
              <ActivityRow item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
