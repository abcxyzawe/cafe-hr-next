"use client";

import { useEffect, useState } from "react";
import { Keyboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Shortcut = {
  keys: string[];
  label: string;
};

type Section = {
  title: string;
  items: Shortcut[];
};

const SECTIONS: Section[] = [
  {
    title: "Điều hướng",
    items: [
      { keys: ["Ctrl", "K"], label: "Mở thanh lệnh (tìm kiếm)" },
      { keys: ["Ctrl", "Shift", "A"], label: "Tạo nhanh (nhân viên / ca / chấm công)" },
      { keys: ["?"], label: "Hiển thị bảng phím tắt này" },
      { keys: ["Esc"], label: "Đóng dialog / popover đang mở" },
    ],
  },
  {
    title: "Trong thanh lệnh",
    items: [
      { keys: ["↑", "↓"], label: "Di chuyển giữa các kết quả" },
      { keys: ["Enter"], label: "Mở mục đang chọn" },
    ],
  },
  {
    title: "Trong bảng",
    items: [
      { keys: ["Click"], label: "Chọn / xem chi tiết" },
      { keys: ["Shift", "Click"], label: "Chọn nhiều dòng (employees)" },
    ],
  },
  {
    title: "Điều hướng nhanh (vim)",
    items: [
      { keys: ["g", "h"], label: "Trang chủ (/)" },
      { keys: ["g", "e"], label: "Nhân viên (/employees)" },
      { keys: ["g", "s"], label: "Ca làm (/shifts)" },
      { keys: ["g", "a"], label: "Chấm công (/attendance)" },
      { keys: ["g", "l"], label: "Nghỉ phép (/leave)" },
      { keys: ["g", "t"], label: "Công việc (/tasks)" },
      { keys: ["g", "p"], label: "Lương (/payroll)" },
      { keys: ["g", "r"], label: "Báo cáo (/reports)" },
      { keys: ["g", "m"], label: "Của tôi (/me)" },
      { keys: ["g", "u"], label: "Audit log (/audit) — chỉ admin" },
      { keys: ["g", "c"], label: "Cập nhật (/changelog)" },
      { keys: ["g", "d"], label: "Màn hình TV (/display) — mở tab mới" },
      { keys: ["g", ","], label: "Cài đặt (/settings)" },
    ],
  },
];

const isMac =
  typeof navigator !== "undefined" && /Mac|iPhone|iPod|iPad/i.test(navigator.platform);

function displayKey(k: string) {
  if (!isMac) return k;
  if (k === "Ctrl") return "⌘";
  if (k === "Shift") return "⇧";
  if (k === "Enter") return "↵";
  return k;
}

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ignore typing in inputs/textareas/contentEditable
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const editing =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable;
      if (editing) return;

      // Open on `?` (Shift + /)
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    function onOpenEvent() {
      setOpen(true);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("open-shortcuts", onOpenEvent as EventListener);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("open-shortcuts", onOpenEvent as EventListener);
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl" onClose={() => setOpen(false)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="size-5 text-primary" />
            Phím tắt
          </DialogTitle>
          <DialogDescription>
            Bấm <Kbd>?</Kbd> ở bất cứ đâu để mở lại bảng này.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {SECTIONS.map((s) => (
            <div key={s.title} className="space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {s.title}
              </h3>
              <ul className="space-y-1.5">
                {s.items.map((it) => (
                  <li
                    key={it.label}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50"
                  >
                    <span className="text-sm">{it.label}</span>
                    <span className="flex items-center gap-1">
                      {it.keys.map((k, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && (
                            <span className="text-xs text-muted-foreground">+</span>
                          )}
                          <Kbd>{displayKey(k)}</Kbd>
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[24px] items-center justify-center rounded border bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-foreground shadow-sm">
      {children}
    </kbd>
  );
}
