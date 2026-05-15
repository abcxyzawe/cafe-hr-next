"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { List, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

export type TasksView = "list" | "kanban";

const STORAGE_KEY = "cafe-hr-tasks-view";

function isView(v: string | null): v is TasksView {
  return v === "list" || v === "kanban";
}

export function ViewToggle({ current }: { current: TasksView }) {
  const router = useRouter();
  const params = useSearchParams();

  // On mount: if URL doesn't specify a view but localStorage has a saved
  // preference (and it differs from current), navigate to apply it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlView = params.get("view");
    if (urlView) return; // URL is authoritative when present
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      stored = null;
    }
    if (!isView(stored)) return;
    if (stored === current) return;
    const sp = new URLSearchParams(params.toString());
    if (stored === "list") sp.delete("view");
    else sp.set("view", stored);
    const qs = sp.toString();
    router.replace(qs ? `/tasks?${qs}` : "/tasks", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function buildHref(target: TasksView): string {
    const sp = new URLSearchParams(params.toString());
    if (target === "list") sp.delete("view");
    else sp.set("view", target);
    const qs = sp.toString();
    return qs ? `/tasks?${qs}` : "/tasks";
  }

  function persist(target: TasksView) {
    try {
      window.localStorage.setItem(STORAGE_KEY, target);
    } catch {
      // ignore quota / privacy errors
    }
  }

  const items: Array<{
    value: TasksView;
    label: string;
    Icon: typeof List;
  }> = [
    { value: "list", label: "Danh sách", Icon: List },
    { value: "kanban", label: "Kanban", Icon: LayoutGrid },
  ];

  return (
    <div
      role="group"
      aria-label="Chế độ xem"
      className="flex gap-1 rounded-md border bg-card p-0.5 text-xs"
    >
      {items.map(({ value, label, Icon }) => {
        const active = current === value;
        return (
          <Link
            key={value}
            href={buildHref(value)}
            onClick={() => persist(value)}
            aria-pressed={active}
            aria-label={label}
            title={label}
            className={cn(
              "inline-flex items-center gap-1 rounded px-2.5 py-1 font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        );
      })}
    </div>
  );
}
