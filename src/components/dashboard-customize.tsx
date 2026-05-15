"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal, Eye, EyeOff, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DashboardWidgetKey =
  | "quote"
  | "birthday"
  | "hero"
  | "quickActions"
  | "shiftRibbon"
  | "checklist"
  | "pendingLeaves"
  | "insights"
  | "anomalies"
  | "hourlyTraffic"
  | "leaderboard"
  | "qa"
  | "stats"
  | "today"
  | "birthdayList"
  | "recentEmployees"
  | "roles";

type WidgetMeta = {
  key: DashboardWidgetKey;
  label: string;
  description: string;
  group: "header" | "ops" | "insights" | "feeds";
};

const WIDGETS: WidgetMeta[] = [
  { key: "quote", label: "Câu nói hôm nay", description: "Quote động lực mỗi ngày", group: "header" },
  { key: "birthday", label: "Banner sinh nhật", description: "Hiện khi có sinh nhật hôm nay", group: "header" },
  { key: "hero", label: "Banner giới thiệu", description: "Section lớn ở đầu trang", group: "header" },
  { key: "quickActions", label: "Hành động nhanh", description: "6 ô tile shortcut", group: "ops" },
  { key: "shiftRibbon", label: "Ribbon ca hôm nay", description: "Sáng / Chiều / Tối", group: "ops" },
  { key: "checklist", label: "Checklist hôm nay", description: "Quy trình mở/đóng cửa", group: "ops" },
  { key: "pendingLeaves", label: "Đơn nghỉ chờ duyệt", description: "Admin only", group: "ops" },
  { key: "insights", label: "AI Insights", description: "Phân tích tự động", group: "insights" },
  { key: "anomalies", label: "Cần chú ý (anomaly)", description: "Late patterns, no-shows", group: "insights" },
  { key: "hourlyTraffic", label: "Lưu lượng theo giờ", description: "Bar chart 7 ngày", group: "insights" },
  { key: "leaderboard", label: "Bảng xếp hạng", description: "Top 5 nhân viên tháng này", group: "insights" },
  { key: "qa", label: "Hỏi trợ lý", description: "Chat Q&A", group: "insights" },
  { key: "stats", label: "Thống kê (4 ô)", description: "KPI cards với sparkline", group: "feeds" },
  { key: "today", label: "Tình hình hôm nay", description: "On shift / on leave / sinh nhật", group: "feeds" },
  { key: "birthdayList", label: "Sinh nhật sắp tới", description: "30 ngày tới", group: "feeds" },
  { key: "recentEmployees", label: "Nhân viên mới", description: "5 người gần nhất", group: "feeds" },
  { key: "roles", label: "Vai trò trong quán", description: "4 ảnh role minh hoạ", group: "feeds" },
];

const GROUP_LABEL: Record<WidgetMeta["group"], string> = {
  header: "Đầu trang",
  ops: "Vận hành",
  insights: "Phân tích",
  feeds: "Feed & danh sách",
};

const STORAGE_KEY = "cafe-hr-dashboard-hidden";

function loadHidden(): Set<DashboardWidgetKey> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    const valid = new Set(WIDGETS.map((w) => w.key as string));
    return new Set(
      parsed.filter(
        (x): x is DashboardWidgetKey => typeof x === "string" && valid.has(x),
      ),
    );
  } catch {
    return new Set();
  }
}

function saveHidden(set: Set<DashboardWidgetKey>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
  // Notify same-tab listeners
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: STORAGE_KEY,
      newValue: JSON.stringify(Array.from(set)),
    }),
  );
}

/**
 * Hook for consumers (any widget) to know if it should render.
 * Returns true when the widget IS visible (= not hidden).
 */
export function useWidgetVisible(key: DashboardWidgetKey): boolean {
  const [hidden, setHidden] = useState<Set<DashboardWidgetKey>>(new Set());

  useEffect(() => {
    setHidden(loadHidden());
    function onStorage(ev: StorageEvent) {
      if (ev.key !== null && ev.key !== STORAGE_KEY) return;
      setHidden(loadHidden());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return !hidden.has(key);
}

/** Wrapper that only renders children when widget is visible (post-hydration). */
export function VisibleWidget({
  k,
  children,
}: {
  k: DashboardWidgetKey;
  children: React.ReactNode;
}) {
  const visible = useWidgetVisible(k);
  if (!visible) return null;
  return <>{children}</>;
}

export function DashboardCustomizeButton() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState<Set<DashboardWidgetKey>>(new Set());

  useEffect(() => {
    setHidden(loadHidden());
  }, [open]);

  function toggle(k: DashboardWidgetKey) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      saveHidden(next);
      return next;
    });
  }

  function showAll() {
    const empty = new Set<DashboardWidgetKey>();
    setHidden(empty);
    saveHidden(empty);
  }

  const visibleCount = WIDGETS.length - hidden.size;
  const groups: WidgetMeta["group"][] = ["header", "ops", "insights", "feeds"];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Tuỳ chỉnh dashboard"
        aria-label="Tuỳ chỉnh dashboard"
        className="inline-flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <SlidersHorizontal className="size-3.5" />
        Tuỳ chỉnh
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dashboard-customize-title"
          className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[8vh]"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border bg-card shadow-2xl animate-in zoom-in-95 fade-in duration-200">
            <button
              onClick={() => setOpen(false)}
              aria-label="Đóng"
              className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" />
            </button>

            <div className="border-b bg-gradient-to-br from-primary/10 to-accent/30 px-5 py-4">
              <h2
                id="dashboard-customize-title"
                className="flex items-center gap-2 text-lg font-bold tracking-tight"
              >
                <SlidersHorizontal className="size-5 text-primary" />
                Tuỳ chỉnh dashboard
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Đang hiển thị {visibleCount}/{WIDGETS.length} widget · lưu trong trình duyệt này
              </p>
            </div>

            <div className="max-h-[60vh] overflow-y-auto px-5 py-3">
              {groups.map((g) => {
                const items = WIDGETS.filter((w) => w.group === g);
                return (
                  <div key={g} className="mb-4 last:mb-0">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {GROUP_LABEL[g]}
                    </p>
                    <ul className="space-y-1">
                      {items.map((w) => {
                        const isHidden = hidden.has(w.key);
                        return (
                          <li key={w.key}>
                            <button
                              type="button"
                              onClick={() => toggle(w.key)}
                              aria-pressed={!isHidden}
                              className={cn(
                                "flex w-full items-start gap-3 rounded-md border bg-card p-2.5 text-left text-sm transition-all",
                                "hover:border-primary/30 hover:bg-accent/50",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                isHidden && "opacity-60",
                              )}
                            >
                              {isHidden ? (
                                <EyeOff className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                              ) : (
                                <Eye className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                              )}
                              <div className="min-w-0 flex-1">
                                <p
                                  className={cn(
                                    "font-medium leading-tight",
                                    isHidden && "line-through text-muted-foreground",
                                  )}
                                >
                                  {w.label}
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {w.description}
                                </p>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-2 border-t bg-muted/30 px-5 py-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={showAll}
                disabled={hidden.size === 0}
              >
                <RotateCcw className="size-3.5" />
                Hiện tất cả
              </Button>
              <Button type="button" size="sm" onClick={() => setOpen(false)}>
                Xong
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
