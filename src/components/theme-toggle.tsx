"use client";

import { Moon, Sun, Monitor, Sunrise } from "lucide-react";
import { useTheme, type Theme } from "./theme-provider";
import { Button } from "@/components/ui/button";

const ORDER: Theme[] = ["light", "dark", "system", "auto-time"];

const META: Record<
  Theme,
  { icon: React.ComponentType<{ className?: string }>; label: string }
> = {
  light: { icon: Sun, label: "Sáng" },
  dark: { icon: Moon, label: "Tối" },
  system: { icon: Monitor, label: "Theo hệ thống" },
  "auto-time": { icon: Sunrise, label: "Tự động theo giờ (6h–18h sáng)" },
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const idx = ORDER.indexOf(theme);
  const next = ORDER[(idx + 1) % ORDER.length];
  const { icon: Icon, label } = META[theme];
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(next)}
      title={`Chế độ: ${label} (click để đổi)`}
      aria-label={`Đổi chế độ — hiện tại ${label}`}
    >
      <Icon className="size-4" />
    </Button>
  );
}
