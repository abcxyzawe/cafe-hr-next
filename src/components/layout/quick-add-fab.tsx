"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  X,
  UserPlus,
  CalendarPlus,
  ListChecks,
  Plane,
  Tablet,
  Heart,
  Download,
  User,
  Wallet,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

type QuickItem = {
  href: string;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  external?: boolean;
};

const ITEMS_ADMIN: QuickItem[] = [
  {
    href: "/employees",
    label: "Thêm nhân viên",
    hint: "Bổ sung đội ngũ",
    icon: UserPlus,
    accent:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  {
    href: "/shifts",
    label: "Lập ca làm",
    hint: "Sáng / chiều / tối",
    icon: CalendarPlus,
    accent: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  },
  {
    href: "/tasks",
    label: "Giao việc",
    hint: "Task mới",
    icon: ListChecks,
    accent:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  {
    href: "/leave",
    label: "Tạo đơn nghỉ",
    hint: "Cho nhân viên",
    icon: Plane,
    accent:
      "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  },
  {
    href: "/employees",
    label: "Tặng lời khen",
    hint: "Ghi nhận thành tích",
    icon: Heart,
    accent:
      "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  },
  {
    href: "/display",
    label: "Mở màn hình TV",
    hint: "Office display",
    icon: Megaphone,
    accent:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    external: true,
  },
  {
    href: "/kiosk",
    label: "Mở Kiosk",
    hint: "Chấm công tablet",
    icon: Tablet,
    accent: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200",
    external: true,
  },
  {
    href: "/api/backup",
    label: "Tải sao lưu",
    hint: "XLSX toàn bộ",
    icon: Download,
    accent:
      "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
    external: true,
  },
];

const ITEMS_STAFF: QuickItem[] = [
  {
    href: "/me",
    label: "Của tôi",
    hint: "Check-in / nghỉ phép",
    icon: User,
    accent:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  {
    href: "/me",
    label: "Xin nghỉ phép",
    hint: "Gửi đơn nhanh",
    icon: Plane,
    accent:
      "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  },
  {
    href: "/attendance",
    label: "Chấm công",
    hint: "Check-in / out",
    icon: CalendarPlus,
    accent:
      "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  },
  {
    href: "/tasks",
    label: "Việc của tôi",
    hint: "Xem & hoàn thành",
    icon: ListChecks,
    accent:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  {
    href: "/employees",
    label: "Danh bạ",
    hint: "Tìm đồng nghiệp",
    icon: Wallet,
    accent:
      "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200",
  },
];

export function QuickAddFab({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const items = isAdmin ? ITEMS_ADMIN : ITEMS_STAFF;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Escape closes; Cmd/Ctrl+Shift+A opens
      if (e.key === "Escape" && open) {
        setOpen(false);
        return;
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "a"
      ) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* FAB button — hidden when modal open to avoid clutter */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-20 right-4 z-30 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-all hover:scale-110 active:scale-95 lg:bottom-6 lg:right-8",
          open && "scale-0 opacity-0",
        )}
        title="Tạo nhanh (Ctrl+Shift+A)"
        aria-label="Tạo nhanh"
      >
        <Plus className="size-6" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-add-title"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <h2
                  id="quick-add-title"
                  className="text-sm font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Tạo nhanh
                </h2>
                <p className="text-xs text-muted-foreground">
                  Hoặc bấm{" "}
                  <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
                    Ctrl
                  </kbd>{" "}
                  +{" "}
                  <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
                    Shift
                  </kbd>{" "}
                  +{" "}
                  <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
                    A
                  </kbd>
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Đóng"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
              {items.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={`${item.href}-${idx}`}
                    href={item.href}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noopener" : undefined}
                    onClick={() => setOpen(false)}
                    className="group flex items-center gap-3 rounded-xl border bg-card p-3 transition-all hover:scale-[1.02] hover:border-primary/40 hover:bg-accent"
                  >
                    <div
                      className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${item.accent}`}
                    >
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium leading-tight">
                        {item.label}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.hint}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
