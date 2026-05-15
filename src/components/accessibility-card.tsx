"use client";

import { useEffect, useState } from "react";
import { Accessibility, MousePointerClick, ZapOff, Contrast } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  A11Y_EVENT,
  type A11yPrefs,
  applyA11yClasses,
  DEFAULT_A11Y_PREFS,
  getA11yPrefs,
  setA11yPrefs,
} from "@/lib/a11y-prefs";

type ToggleSpec = {
  key: keyof A11yPrefs;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const TOGGLES: ToggleSpec[] = [
  {
    key: "reduceMotion",
    label: "Giảm chuyển động",
    description: "Tắt hiệu ứng fade/slide; phù hợp khi dễ chóng mặt.",
    icon: ZapOff,
  },
  {
    key: "highContrast",
    label: "Tương phản cao",
    description: "Tăng độ tương phản chữ và viền cho dễ đọc.",
    icon: Contrast,
  },
  {
    key: "largeTouch",
    label: "Vùng chạm lớn",
    description: "Phóng to nút và liên kết — phù hợp cảm ứng.",
    icon: MousePointerClick,
  },
];

export function AccessibilityCard() {
  const [prefs, setPrefs] = useState<A11yPrefs>(DEFAULT_A11Y_PREFS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const initial = getA11yPrefs();
    setPrefs(initial);
    applyA11yClasses(initial);
    setHydrated(true);

    function refresh() {
      const next = getA11yPrefs();
      setPrefs(next);
      applyA11yClasses(next);
    }
    window.addEventListener("storage", refresh);
    window.addEventListener(A11Y_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(A11Y_EVENT, refresh);
    };
  }, []);

  function toggle(key: keyof A11yPrefs) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setA11yPrefs(next);
  }

  const enabledCount = Object.values(prefs).filter(Boolean).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Accessibility className="size-5 text-primary" />
          Hỗ trợ tiếp cận
        </CardTitle>
        <CardDescription>
          Tinh chỉnh trải nghiệm — lưu trên thiết bị này. Đang bật {enabledCount} /{" "}
          {TOGGLES.length} tuỳ chọn.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {TOGGLES.map((t) => {
          const Icon = t.icon;
          const active = prefs[t.key];
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => toggle(t.key)}
              disabled={!hydrated}
              aria-pressed={active}
              className={cn(
                "flex w-full items-start gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent",
                active && "border-primary/40 bg-primary/5",
              )}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-md",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="size-4" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-medium">{t.label}</span>
                <span className="block text-xs text-muted-foreground">
                  {t.description}
                </span>
              </span>
              <span
                role="switch"
                aria-checked={active}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                  active ? "bg-primary" : "bg-input",
                )}
              >
                <span
                  className={cn(
                    "inline-block size-4 rounded-full bg-background transition-transform",
                    active ? "translate-x-4" : "translate-x-0.5",
                  )}
                />
              </span>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
