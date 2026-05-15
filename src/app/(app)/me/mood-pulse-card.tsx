"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HeartPulse } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  MOOD_CHANGE_EVENT,
  MOOD_EMOJI,
  MOOD_LABEL,
  MOOD_STORAGE_KEY,
  MOOD_TINT,
  MOOD_VALUES,
  type MoodEntry,
  type MoodValue,
  getLastNDaysMoods,
  getTodayMood,
  setTodayMood,
  todayLocalIso,
} from "@/lib/mood-pulse";

const VN_WEEKDAYS_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

type StripCell = {
  iso: string;
  weekdayLabel: string;
  isToday: boolean;
  entry: MoodEntry | null;
};

function buildLast7Days(entries: MoodEntry[]): StripCell[] {
  const todayIso = todayLocalIso();
  const today = new Date();
  const cells: StripCell[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const entry = entries.find((e) => e.date === iso) ?? null;
    cells.push({
      iso,
      weekdayLabel: VN_WEEKDAYS_SHORT[d.getDay()] ?? "",
      isToday: iso === todayIso,
      entry,
    });
  }
  return cells;
}

export function MoodPulseCard() {
  const [hydrated, setHydrated] = useState(false);
  const [today, setToday] = useState<MoodEntry | null>(null);
  const [recent, setRecent] = useState<MoodEntry[]>([]);
  const [flash, setFlash] = useState(false);
  const flashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshFromStorage = useCallback(() => {
    setToday(getTodayMood());
    setRecent(getLastNDaysMoods(7));
  }, []);

  // Hydrate from localStorage after mount.
  useEffect(() => {
    refreshFromStorage();
    setHydrated(true);
  }, [refreshFromStorage]);

  // Cross-tab + same-tab sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === MOOD_STORAGE_KEY) refreshFromStorage();
    };
    const onCustom = () => refreshFromStorage();
    window.addEventListener("storage", onStorage);
    window.addEventListener(MOOD_CHANGE_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(MOOD_CHANGE_EVENT, onCustom);
    };
  }, [refreshFromStorage]);

  // Cleanup flash timer on unmount.
  useEffect(() => {
    return () => {
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
    };
  }, []);

  const handlePick = useCallback((mood: MoodValue) => {
    setTodayMood(mood);
    setFlash(true);
    if (flashTimeout.current) clearTimeout(flashTimeout.current);
    flashTimeout.current = setTimeout(() => setFlash(false), 2000);
  }, []);

  const cells = useMemo(() => buildLast7Days(recent), [recent]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <HeartPulse className="size-4 text-rose-500" /> Tâm trạng hôm nay
          </CardTitle>
          <CardDescription>
            Chỉ lưu trên thiết bị này, không chia sẻ.
          </CardDescription>
        </div>
        <span
          aria-live="polite"
          className={cn(
            "text-xs font-medium text-emerald-600 transition-opacity duration-300 dark:text-emerald-400",
            flash ? "opacity-100" : "opacity-0",
          )}
        >
          Đã ghi nhận!
        </span>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start sm:gap-3">
          {MOOD_VALUES.map((m) => {
            const isSelected = hydrated && today?.mood === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => handlePick(m)}
                aria-pressed={isSelected}
                aria-label={MOOD_LABEL[m]}
                title={MOOD_LABEL[m]}
                className={cn(
                  "flex size-12 items-center justify-center rounded-full border text-3xl leading-none transition-all hover:scale-110 hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:size-14",
                  isSelected
                    ? cn("ring-2 ring-primary ring-offset-2 ring-offset-background", MOOD_TINT[m])
                    : "bg-card hover:bg-muted/50",
                )}
              >
                <span aria-hidden>{MOOD_EMOJI[m]}</span>
              </button>
            );
          })}
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            7 ngày gần nhất
          </p>
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((cell) => {
              const mood = cell.entry?.mood;
              return (
                <div
                  key={cell.iso}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border p-2 text-center",
                    cell.isToday ? "border-primary bg-primary/5" : "bg-card/40",
                  )}
                  title={
                    mood
                      ? `${cell.iso} · ${MOOD_LABEL[mood]}`
                      : `${cell.iso} · Chưa ghi nhận`
                  }
                >
                  <span
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-wide",
                      cell.isToday ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {cell.weekdayLabel}
                  </span>
                  {mood ? (
                    <span
                      className={cn(
                        "flex size-7 items-center justify-center rounded-full text-lg leading-none",
                        MOOD_TINT[mood],
                      )}
                      aria-label={MOOD_LABEL[mood]}
                    >
                      <span aria-hidden>{MOOD_EMOJI[mood]}</span>
                    </span>
                  ) : (
                    <span
                      className="flex size-7 items-center justify-center rounded-full bg-muted/40 text-sm text-muted-foreground/50"
                      aria-label="Chưa ghi nhận"
                    >
                      <span aria-hidden>—</span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
