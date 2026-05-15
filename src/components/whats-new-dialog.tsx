"use client";

import { useEffect, useState } from "react";
import { Sparkles, Palette, Keyboard, PanelLeftClose, Cake, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const RELEASE_VERSION = "v1.1";
const STORAGE_KEY = "cafe-hr-whats-new-seen";

const FEATURES = [
  {
    icon: Palette,
    title: "Bảng màu tuỳ chỉnh",
    description:
      "6 chủ đề: Cà phê, Xanh biển, Hồng đào, Lavender, Xanh lá, Đỏ rượu — đổi từ menu góc phải.",
    tone: "from-amber-500 to-orange-500",
  },
  {
    icon: Keyboard,
    title: "Phím tắt",
    description: "Bấm ? ở bất kỳ trang nào để xem danh sách phím tắt đầy đủ.",
    tone: "from-blue-500 to-cyan-500",
  },
  {
    icon: PanelLeftClose,
    title: "Sidebar thu gọn được",
    description: "Click nút ở chân sidebar để tiết kiệm không gian, lưu lại lựa chọn của bạn.",
    tone: "from-violet-500 to-purple-500",
  },
  {
    icon: Cake,
    title: "Sinh nhật được nhớ",
    description: "Banner chúc mừng tự động hiện khi có nhân viên sinh nhật hôm nay.",
    tone: "from-rose-500 to-pink-500",
  },
];

export function WhatsNewDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (seen !== RELEASE_VERSION) {
      // Defer to give the page a moment to settle
      const t = setTimeout(() => setOpen(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, RELEASE_VERSION);
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in"
        onClick={dismiss}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-2xl animate-in zoom-in-95 fade-in duration-200">
        <button
          onClick={dismiss}
          aria-label="Đóng"
          className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" />
        </button>

        <div className="bg-gradient-to-br from-primary/15 via-accent/30 to-background p-6 pb-4">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm">
            <Sparkles className="size-3" />
            {RELEASE_VERSION}
          </div>
          <h2 id="whats-new-title" className="text-xl font-bold tracking-tight">
            Có gì mới?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Vài cải tiến vừa được thêm vào để bạn dùng thoải mái hơn.
          </p>
        </div>

        <ul className="space-y-3 px-6 py-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <li key={f.title} className="flex gap-3">
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${f.tone} text-white shadow-sm`}
                >
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight">{f.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                    {f.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-end gap-2 border-t bg-muted/30 px-6 py-3">
          <Button onClick={dismiss} size="sm">
            Đã hiểu
          </Button>
        </div>
      </div>
    </div>
  );
}
