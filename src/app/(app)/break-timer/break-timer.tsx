"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Coffee,
  Pause,
  Play,
  RotateCcw,
  Save,
  Settings2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  DEFAULT_TIMER_PREFS,
  TIMER_EVENT,
  type TimerPrefs,
  getCompletedToday,
  getTimerPrefs,
  incrementCompleted,
  normalizeTimerPrefs,
  resetCompletedToday,
  setTimerPrefs,
} from "@/lib/timer-prefs";

type Mode = "idle" | "working" | "on-break";

const MIN_INPUT = 1;
const MAX_INPUT = 120;
const MIN_CYCLES_INPUT = 1;
const MAX_CYCLES_INPUT = 24;

// SVG ring geometry
const SIZE = 200;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  const v = Math.floor(value);
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

function playChime(ctx: AudioContext): void {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, now);
  // Quick attack/decay envelope to avoid clicks; ~200ms total.
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.22);
}

type WindowWithWebkitAudio = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

function createAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const w = window as WindowWithWebkitAudio;
  const Ctor: typeof AudioContext | undefined = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) return null;
  try {
    return new Ctor();
  } catch {
    return null;
  }
}

export function BreakTimer() {
  const [hydrated, setHydrated] = useState(false);
  const [prefs, setPrefsState] = useState<TimerPrefs>(DEFAULT_TIMER_PREFS);
  const [draft, setDraft] = useState<TimerPrefs>(DEFAULT_TIMER_PREFS);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [mode, setMode] = useState<Mode>("idle");
  const [running, setRunning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(
    DEFAULT_TIMER_PREFS.workMinutes * 60,
  );
  const [cycleNumber, setCycleNumber] = useState<number>(1);
  const [completedToday, setCompletedToday] = useState<number>(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const originalTitleRef = useRef<string>("");

  // Hydrate from storage on mount.
  useEffect(() => {
    const p = getTimerPrefs();
    setPrefsState(p);
    setDraft(p);
    setRemainingSeconds(p.workMinutes * 60);
    setCompletedToday(getCompletedToday());
    setHydrated(true);
  }, []);

  // Cross-tab + same-tab updates for stats.
  useEffect(() => {
    if (!hydrated) return;
    const reread = () => {
      setCompletedToday(getCompletedToday());
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === "cafe-hr-timer-stats") reread();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(TIMER_EVENT, reread);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(TIMER_EVENT, reread);
    };
  }, [hydrated]);

  // Capture & restore document title.
  useEffect(() => {
    if (typeof document === "undefined") return;
    originalTitleRef.current = document.title;
    return () => {
      document.title = originalTitleRef.current;
    };
  }, []);

  // Update tab title while running.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!running || mode === "idle") {
      document.title = originalTitleRef.current;
      return;
    }
    const label = mode === "working" ? "Tập trung" : "Nghỉ";
    document.title = `${formatTime(remainingSeconds)} - ${label}`;
  }, [remainingSeconds, mode, running]);

  const totalForMode = useMemo(() => {
    if (mode === "on-break") return prefs.breakMinutes * 60;
    // idle treats as work duration for the visual ring
    return prefs.workMinutes * 60;
  }, [mode, prefs.workMinutes, prefs.breakMinutes]);

  const advancePhase = useCallback(() => {
    // Called when remaining hits 0. Determines next mode + cycle.
    setMode((prevMode) => {
      const ctx = audioCtxRef.current;
      if (ctx) playChime(ctx);

      if (prevMode === "working") {
        // Finished a work block — count it and move to break.
        incrementCompleted();
        setRemainingSeconds(prefs.breakMinutes * 60);
        return "on-break";
      }
      if (prevMode === "on-break") {
        // Finished a break — either continue to next cycle or stop at goal.
        let shouldStop = false;
        setCycleNumber((n) => {
          const next = n + 1;
          if (next > prefs.cyclesGoal) {
            shouldStop = true;
            return n;
          }
          return next;
        });
        if (shouldStop) {
          setRunning(false);
          setRemainingSeconds(prefs.workMinutes * 60);
          return "idle";
        }
        setRemainingSeconds(prefs.workMinutes * 60);
        return "working";
      }
      return prevMode;
    });
  }, [prefs.breakMinutes, prefs.cyclesGoal, prefs.workMinutes]);

  // Tick interval.
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          // Defer phase advance to avoid setState-in-setState surprises.
          window.setTimeout(advancePhase, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, advancePhase]);

  const handleStart = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = createAudioContext();
    }
    const ctx = audioCtxRef.current;
    if (ctx && ctx.state === "suspended") {
      void ctx.resume();
    }
    setMode((prev) => {
      if (prev === "idle") {
        setRemainingSeconds(prefs.workMinutes * 60);
        setCycleNumber(1);
        return "working";
      }
      return prev;
    });
    setRunning(true);
  }, [prefs.workMinutes]);

  const handlePause = useCallback(() => {
    setRunning(false);
  }, []);

  const handleReset = useCallback(() => {
    setRunning(false);
    setMode("idle");
    setCycleNumber(1);
    setRemainingSeconds(prefs.workMinutes * 60);
  }, [prefs.workMinutes]);

  const handleSavePrefs = useCallback(() => {
    const normalized = normalizeTimerPrefs(draft);
    setTimerPrefs(normalized);
    setPrefsState(normalized);
    setDraft(normalized);
    // Apply immediately if we're idle.
    if (mode === "idle" && !running) {
      setRemainingSeconds(normalized.workMinutes * 60);
    }
  }, [draft, mode, running]);

  const handleResetTodayStats = useCallback(() => {
    resetCompletedToday();
    setCompletedToday(0);
  }, []);

  if (!hydrated) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-2 h-4 w-64" />
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 pb-8">
          <Skeleton className="size-[200px] rounded-full" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const progress =
    totalForMode > 0 ? Math.max(0, Math.min(1, 1 - remainingSeconds / totalForMode)) : 0;
  const dashOffset = CIRC * (1 - progress);

  const ringColorClass =
    mode === "on-break"
      ? "stroke-emerald-500"
      : mode === "working"
        ? "stroke-primary"
        : "stroke-muted-foreground/40";

  const modeLabel =
    mode === "working"
      ? "Đang tập trung làm việc"
      : mode === "on-break"
        ? "Đang nghỉ giải lao"
        : "Sẵn sàng bắt đầu";

  const ModeIcon = mode === "on-break" ? Coffee : Play;

  const goal = prefs.cyclesGoal;
  const statsPercent = goal === 0 ? 0 : Math.min(100, Math.round((completedToday / goal) * 100));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Bộ đếm Pomodoro</CardTitle>
        <CardDescription className="text-xs">
          Chu kỳ {Math.min(cycleNumber, prefs.cyclesGoal)} / {prefs.cyclesGoal}
          {" • "}
          {prefs.workMinutes} phút làm · {prefs.breakMinutes} phút nghỉ
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-6 pb-8">
        <div className="relative" style={{ width: SIZE, height: SIZE }}>
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="-rotate-90"
            aria-hidden="true"
          >
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE}
              className="stroke-muted/40"
            />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={dashOffset}
              className={cn("transition-[stroke-dashoffset] duration-500", ringColorClass)}
            />
          </svg>
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-1"
            role="timer"
            aria-live="polite"
            aria-atomic="true"
            aria-label={`${modeLabel}, còn lại ${formatTime(remainingSeconds)}`}
          >
            <span className="font-mono text-5xl font-semibold tabular-nums tracking-tight">
              {formatTime(remainingSeconds)}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ModeIcon className="size-3.5" />
              {modeLabel}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {running ? (
            <Button type="button" variant="secondary" onClick={handlePause}>
              <Pause className="size-4" />
              Tạm dừng
            </Button>
          ) : (
            <Button type="button" onClick={handleStart}>
              <Play className="size-4" />
              {mode === "idle" ? "Bắt đầu" : "Tiếp tục"}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={handleReset}>
            <RotateCcw className="size-4" />
            Đặt lại
          </Button>
        </div>

        <div className="w-full max-w-md space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">
              Hoàn thành hôm nay: {completedToday} / {prefs.cyclesGoal} chu kỳ
            </span>
            <button
              type="button"
              onClick={handleResetTodayStats}
              className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              disabled={completedToday === 0}
            >
              Xoá đếm
            </button>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={prefs.cyclesGoal}
            aria-valuenow={completedToday}
            aria-label="Tiến độ chu kỳ hôm nay"
          >
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${statsPercent}%` }}
            />
          </div>
        </div>

        <div className="w-full max-w-md">
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent/40"
            aria-expanded={settingsOpen}
            aria-controls="break-timer-settings"
          >
            <span className="inline-flex items-center gap-2">
              <Settings2 className="size-4" />
              Tuỳ chỉnh thời lượng
            </span>
            {settingsOpen ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </button>

          {settingsOpen && (
            <div
              id="break-timer-settings"
              className="mt-3 space-y-3 rounded-md border border-border bg-muted/30 p-4"
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="work-minutes" className="text-xs">
                    Làm việc (phút)
                  </Label>
                  <Input
                    id="work-minutes"
                    type="number"
                    inputMode="numeric"
                    min={MIN_INPUT}
                    max={MAX_INPUT}
                    value={draft.workMinutes}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        workMinutes: clampInt(
                          Number(e.target.value),
                          MIN_INPUT,
                          MAX_INPUT,
                        ),
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="break-minutes" className="text-xs">
                    Nghỉ (phút)
                  </Label>
                  <Input
                    id="break-minutes"
                    type="number"
                    inputMode="numeric"
                    min={MIN_INPUT}
                    max={MAX_INPUT}
                    value={draft.breakMinutes}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        breakMinutes: clampInt(
                          Number(e.target.value),
                          MIN_INPUT,
                          MAX_INPUT,
                        ),
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cycles-goal" className="text-xs">
                    Số chu kỳ
                  </Label>
                  <Input
                    id="cycles-goal"
                    type="number"
                    inputMode="numeric"
                    min={MIN_CYCLES_INPUT}
                    max={MAX_CYCLES_INPUT}
                    value={draft.cyclesGoal}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        cyclesGoal: clampInt(
                          Number(e.target.value),
                          MIN_CYCLES_INPUT,
                          MAX_CYCLES_INPUT,
                        ),
                      }))
                    }
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground">
                  Cài đặt mới áp dụng từ chu kỳ kế tiếp; bấm Đặt lại để áp dụng
                  ngay.
                </p>
                <Button type="button" size="sm" onClick={handleSavePrefs}>
                  <Save className="size-4" />
                  Lưu
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
