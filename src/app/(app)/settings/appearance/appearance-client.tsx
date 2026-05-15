"use client";

import { Sun, Moon, Monitor, Sunrise, Check } from "lucide-react";
import { useTheme, type Theme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const OPTIONS: Array<{
  id: Theme;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "light", label: "Sáng", hint: "Chế độ sáng cố định", icon: Sun },
  { id: "dark", label: "Tối", hint: "Chế độ tối cố định", icon: Moon },
  {
    id: "system",
    label: "Theo hệ thống",
    hint: "Theo cài đặt OS / trình duyệt",
    icon: Monitor,
  },
  {
    id: "auto-time",
    label: "Tự động theo giờ",
    hint: "Sáng từ 6h–18h, tối còn lại",
    icon: Sunrise,
  },
];

export function AppearanceClient() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = theme === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTheme(opt.id)}
              aria-pressed={active}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-left transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "bg-card hover:bg-accent",
              )}
            >
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-md",
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="font-medium leading-tight">{opt.label}</p>
                  {active && <Check className="size-3.5 text-primary" />}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{opt.hint}</p>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Hiện đang hiển thị:{" "}
        <span className="font-semibold text-foreground">
          {resolvedTheme === "dark" ? "Tối" : "Sáng"}
        </span>
      </p>
    </div>
  );
}
