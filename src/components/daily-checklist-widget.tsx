"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Coffee,
  Sparkles,
  Lock,
  ClipboardList,
  RotateCcw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ChecklistItem = {
  id: string;
  label: string;
  hint?: string;
  group: "open" | "midday" | "close";
  icon: React.ComponentType<{ className?: string }>;
};

const ITEMS: ChecklistItem[] = [
  // Mở cửa
  { id: "open-doors", label: "Bật đèn, mở cửa, kiểm tra hệ thống", group: "open", icon: Coffee },
  { id: "open-machine", label: "Khởi động máy pha + xay cà phê", group: "open", icon: Coffee },
  { id: "open-cash", label: "Mở két, đếm tiền đầu ca (chuẩn 500k)", group: "open", icon: Coffee },
  { id: "open-restock", label: "Bổ sung sữa, đường, ly giấy", group: "open", icon: Coffee },
  // Trong ca
  { id: "mid-clean", label: "Lau quầy + máy mỗi 2 tiếng", group: "midday", icon: Sparkles },
  { id: "mid-temp", label: "Kiểm tra nhiệt độ tủ đá / tủ lạnh", group: "midday", icon: Sparkles },
  { id: "mid-trash", label: "Đổ rác giữa ca, thay túi", group: "midday", icon: Sparkles },
  // Đóng cửa
  { id: "close-cash", label: "Đếm tiền cuối ca, đối chiếu doanh thu", group: "close", icon: Lock },
  { id: "close-clean", label: "Vệ sinh máy pha, lau bàn, quét sàn", group: "close", icon: Lock },
  { id: "close-lock", label: "Tắt thiết bị, khóa cửa, bật báo động", group: "close", icon: Lock },
];

const GROUP_META: Record<
  ChecklistItem["group"],
  { label: string; tone: string; emoji: string }
> = {
  open: {
    label: "Mở cửa",
    tone: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    emoji: "☀️",
  },
  midday: {
    label: "Trong ca",
    tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    emoji: "✨",
  },
  close: {
    label: "Đóng cửa",
    tone: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    emoji: "🔒",
  },
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function storageKey(): string {
  return `cafe-hr-checklist-${todayKey()}`;
}

export function DailyChecklistWidget() {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey());
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          setDone(new Set(parsed.filter((x): x is string => typeof x === "string")));
        }
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  function persist(next: Set<string>) {
    try {
      localStorage.setItem(storageKey(), JSON.stringify(Array.from(next)));
    } catch {
      // ignore quota
    }
  }

  function toggle(id: string) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persist(next);
      return next;
    });
  }

  function reset() {
    setDone(new Set());
    try {
      localStorage.removeItem(storageKey());
    } catch {
      // ignore
    }
  }

  const totalCount = ITEMS.length;
  const doneCount = done.size;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const groups: ChecklistItem["group"][] = ["open", "midday", "close"];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="size-5 text-primary" />
            Checklist hôm nay
          </CardTitle>
          <CardDescription>
            Quy trình mở cửa · trong ca · đóng cửa — lưu trên trình duyệt mỗi ngày
          </CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Hoàn thành</p>
            <p className="text-lg font-bold tabular-nums" suppressHydrationWarning>
              {hydrated ? `${doneCount}/${totalCount}` : "—"}
            </p>
          </div>
          {hydrated && doneCount > 0 && (
            <button
              type="button"
              onClick={reset}
              title="Reset checklist hôm nay"
              aria-label="Reset checklist"
              className="rounded-md border bg-card p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RotateCcw className="size-4" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div
          className="h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Tiến độ checklist"
        >
          <div
            className={cn(
              "h-full rounded-full transition-all",
              pct === 100 ? "bg-emerald-500" : "bg-primary",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {groups.map((g) => {
            const meta = GROUP_META[g];
            const items = ITEMS.filter((it) => it.group === g);
            const groupDone = items.filter((it) => done.has(it.id)).length;
            return (
              <div key={g} className="space-y-2">
                <div className="flex items-center justify-between gap-2 px-1">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      meta.tone,
                    )}
                  >
                    <span>{meta.emoji}</span>
                    {meta.label}
                  </span>
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {hydrated ? `${groupDone}/${items.length}` : ""}
                  </span>
                </div>
                <ul className="space-y-1">
                  {items.map((it) => {
                    const checked = done.has(it.id);
                    return (
                      <li key={it.id}>
                        <button
                          type="button"
                          onClick={() => toggle(it.id)}
                          aria-pressed={checked}
                          className={cn(
                            "group flex w-full items-start gap-2 rounded-md border bg-card px-2.5 py-2 text-left text-sm transition-all",
                            "hover:border-primary/30 hover:bg-accent",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            checked && "border-emerald-500/40 bg-emerald-500/5",
                          )}
                        >
                          {checked ? (
                            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                          )}
                          <span
                            className={cn(
                              "flex-1 leading-tight",
                              checked && "text-muted-foreground line-through decoration-emerald-500/60",
                            )}
                          >
                            {it.label}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        {hydrated && pct === 100 && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            🎉 Quy trình hôm nay đã xong — chúc một ngày bán chạy!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
