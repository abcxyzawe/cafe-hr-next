"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Circle,
  Moon,
  Sparkles,
  Sunrise,
  Trash2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChecklistPreset } from "@/lib/checklist-presets";
import {
  CHECKLIST_CHANGE_EVENT,
  getChecked,
  resetChecklist,
  storageKeyFor,
  todayKey,
  toggleItem,
} from "@/lib/checklist-state";

type Tone = ChecklistPreset["tone"];

const TONE_STYLES: Record<
  Tone,
  {
    iconWrap: string;
    badge: string;
    barTrack: string;
    barFill: string;
    accentText: string;
  }
> = {
  amber: {
    iconWrap: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
    barTrack: "bg-amber-100/70 dark:bg-amber-500/10",
    barFill: "bg-amber-500",
    accentText: "text-amber-700 dark:text-amber-300",
  },
  indigo: {
    iconWrap:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
    badge:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-200",
    barTrack: "bg-indigo-100/70 dark:bg-indigo-500/10",
    barFill: "bg-indigo-500",
    accentText: "text-indigo-700 dark:text-indigo-300",
  },
  emerald: {
    iconWrap:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    badge:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200",
    barTrack: "bg-emerald-100/70 dark:bg-emerald-500/10",
    barFill: "bg-emerald-500",
    accentText: "text-emerald-700 dark:text-emerald-300",
  },
};

function ToneIcon({
  iconName,
  className,
}: {
  iconName: ChecklistPreset["iconName"];
  className?: string;
}) {
  if (iconName === "sunrise") return <Sunrise className={className} />;
  if (iconName === "moon") return <Moon className={className} />;
  return <Sparkles className={className} />;
}

export function ChecklistCard({ preset }: { preset: ChecklistPreset }) {
  const [date, setDate] = useState<string>(() => todayKey());
  const [checked, setCheckedState] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount and keep date fresh.
  useEffect(() => {
    const d = todayKey();
    setDate(d);
    setCheckedState(getChecked(preset.key, d));
    setHydrated(true);
  }, [preset.key]);

  // Re-read on storage / custom events (multi-tab + same-tab updates).
  useEffect(() => {
    if (!hydrated) return;
    const targetKey = storageKeyFor(preset.key, date);
    const reread = () => setCheckedState(getChecked(preset.key, date));
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === targetKey) reread();
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<{ key?: string }>).detail;
      if (!detail || !detail.key || detail.key === targetKey) reread();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(CHECKLIST_CHANGE_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CHECKLIST_CHANGE_EVENT, onCustom);
    };
  }, [preset.key, date, hydrated]);

  // Day rollover guard — re-check date once per minute.
  useEffect(() => {
    const id = window.setInterval(() => {
      const next = todayKey();
      setDate((prev) => (prev === next ? prev : next));
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const tone = TONE_STYLES[preset.tone];
  const total = preset.items.length;
  const doneCount = useMemo(() => {
    let c = 0;
    for (const it of preset.items) {
      if (checked.has(it.id)) c += 1;
    }
    return c;
  }, [preset.items, checked]);
  const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  // Auto-rotate: unchecked first (preserving preset order), then checked at bottom.
  const rotated = useMemo(() => {
    const unchecked = preset.items.filter((it) => !checked.has(it.id));
    const done = preset.items.filter((it) => checked.has(it.id));
    return [...unchecked, ...done];
  }, [preset.items, checked]);

  const handleToggle = useCallback(
    (itemId: string) => {
      toggleItem(preset.key, date, itemId);
    },
    [preset.key, date],
  );

  const handleReset = useCallback(() => {
    resetChecklist(preset.key, date);
  }, [preset.key, date]);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              tone.iconWrap,
            )}
          >
            <ToneIcon iconName={preset.iconName} className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base">{preset.title}</CardTitle>
            <CardDescription className="text-xs">
              {preset.description}
            </CardDescription>
          </div>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
              tone.badge,
            )}
          >
            {doneCount}/{total}
          </span>
        </div>
        <div className="mt-3 space-y-1">
          <div
            className={cn("h-2 w-full overflow-hidden rounded-full", tone.barTrack)}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={doneCount}
            aria-label={`Tiến độ ${preset.title}`}
          >
            <div
              className={cn("h-full transition-all duration-300", tone.barFill)}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {percent}% hoàn thành
          </p>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">
        <ul className="flex flex-col gap-1">
          {rotated.map((item) => {
            const isChecked = checked.has(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => handleToggle(item.id)}
                  aria-pressed={isChecked}
                  className={cn(
                    "group flex w-full items-start gap-2.5 rounded-md border border-transparent px-2 py-2 text-left text-sm transition-colors",
                    "hover:border-border hover:bg-accent/40",
                    isChecked && "opacity-70",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                      isChecked
                        ? cn("border-transparent text-white", tone.barFill)
                        : "border-muted-foreground/30 text-transparent group-hover:border-foreground/50",
                    )}
                  >
                    {isChecked ? (
                      <Check className="size-3.5" />
                    ) : (
                      <Circle className="size-3.5 opacity-0" />
                    )}
                  </span>
                  <span
                    className={cn(
                      "flex-1 leading-snug",
                      isChecked &&
                        "text-muted-foreground line-through decoration-muted-foreground/50",
                    )}
                  >
                    {item.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className={cn("text-xs font-medium", tone.accentText)}>
            {doneCount === total
              ? "Đã xong toàn bộ — tuyệt vời!"
              : `Còn ${total - doneCount} việc`}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={doneCount === 0}
          >
            <Trash2 className="size-4" />
            Đặt lại hôm nay
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
