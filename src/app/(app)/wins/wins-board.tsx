"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Heart, PartyPopper, Sparkles, Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  addWin,
  DEFAULT_EMOJIS,
  deleteWin,
  getWins,
  incrementLike,
  WINS_EVENT,
  type WinEntry,
} from "@/lib/wins-state";

const MAX_TEXT = 200;

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatGroupLabel(key: string): string {
  const today = new Date();
  const todayKey = ymd(today);
  const y = new Date(today);
  y.setDate(today.getDate() - 1);
  const yKey = ymd(y);
  if (key === todayKey) return "Hôm nay";
  if (key === yKey) return "Hôm qua";
  const [yr, mo, da] = key.split("-");
  return `${da}/${mo}/${yr}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0 = Sun
  const diff = (day === 0 ? -6 : 1) - day;
  x.setDate(x.getDate() + diff);
  return x;
}

type Group = { key: string; label: string; items: WinEntry[] };

export function WinsBoard({ defaultAuthorName }: { defaultAuthorName?: string }) {
  const [hydrated, setHydrated] = useState(false);
  const [wins, setWins] = useState<WinEntry[]>([]);
  const [emoji, setEmoji] = useState<string>(DEFAULT_EMOJIS[0]);
  const [text, setText] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [confettiOn, setConfettiOn] = useState(false);

  useEffect(() => {
    setWins(getWins());
    if (defaultAuthorName) setAuthorName(defaultAuthorName);
    setHydrated(true);
  }, [defaultAuthorName]);

  useEffect(() => {
    if (!hydrated) return;
    const reread = () => setWins(getWins());
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === "cafe-hr-wins") reread();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(WINS_EVENT, reread);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(WINS_EVENT, reread);
    };
  }, [hydrated]);

  const groups = useMemo<Group[]>(() => {
    const buckets = new Map<string, WinEntry[]>();
    for (const w of wins) {
      const key = ymd(new Date(w.createdAt));
      const arr = buckets.get(key);
      if (arr) arr.push(w);
      else buckets.set(key, [w]);
    }
    const keys = Array.from(buckets.keys()).sort((a, b) => (a < b ? 1 : -1));
    return keys.map((k) => {
      const items = (buckets.get(k) ?? []).slice().sort((a, b) =>
        a.createdAt < b.createdAt ? 1 : -1,
      );
      return { key: k, label: formatGroupLabel(k), items };
    });
  }, [wins]);

  const weekStats = useMemo(() => {
    const start = startOfWeekMonday(new Date());
    let total = 0;
    const counts = new Map<string, number>();
    for (const w of wins) {
      const created = new Date(w.createdAt);
      if (created >= start) {
        total += 1;
        counts.set(w.emoji, (counts.get(w.emoji) ?? 0) + 1);
      }
    }
    let topEmoji: string | null = null;
    let topCount = 0;
    for (const [e, c] of counts) {
      if (c > topCount) {
        topEmoji = e;
        topCount = c;
      }
    }
    return { total, topEmoji, topCount };
  }, [wins]);

  const triggerConfetti = useCallback(() => {
    setConfettiOn(true);
    window.setTimeout(() => setConfettiOn(false), 2200);
  }, []);

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = text.trim();
      if (!trimmed) return;
      addWin({
        emoji,
        text: trimmed,
        authorName: authorName.trim() || undefined,
      });
      setText("");
      triggerConfetti();
    },
    [emoji, text, authorName, triggerConfetti],
  );

  const handleLike = useCallback((id: string) => {
    incrementLike(id);
  }, []);

  const handleDelete = useCallback((id: string) => {
    if (typeof window !== "undefined") {
      const ok = window.confirm("Xoá niềm vui này?");
      if (!ok) return;
    }
    deleteWin(id);
  }, []);

  const remaining = MAX_TEXT - text.length;

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        {confettiOn && <Confetti />}
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <PartyPopper className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-2xl tracking-tight md:text-3xl">
                Niềm vui mỗi ngày
              </CardTitle>
              <CardDescription className="mt-1 text-sm">
                Ghi lại những khoảnh khắc nhỏ đáng nhớ ở quán — một lời khen từ
                khách, một cú combo đẹp, hay một ca trực vui vẻ.
              </CardDescription>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-background/70 px-3 py-1 text-xs font-medium shadow-sm">
              <Sparkles className="size-3.5 text-primary" />
              Tuần này:{" "}
              <strong className="font-semibold">
                {hydrated ? weekStats.total : 0}
              </strong>{" "}
              niềm vui
            </span>
            {hydrated && weekStats.topEmoji && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background/70 px-3 py-1 text-xs font-medium shadow-sm">
                <span className="text-base leading-none">
                  {weekStats.topEmoji}
                </span>
                Top emoji ({weekStats.topCount})
              </span>
            )}
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Đăng một niềm vui mới</CardTitle>
          <CardDescription className="text-xs">
            Chọn một biểu tượng, viết ngắn gọn (tối đa {MAX_TEXT} ký tự).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
                Biểu tượng
              </Label>
              <div className="grid grid-cols-8 gap-2">
                {DEFAULT_EMOJIS.map((e) => {
                  const active = e === emoji;
                  return (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setEmoji(e)}
                      aria-pressed={active}
                      aria-label={`Chọn biểu tượng ${e}`}
                      className={cn(
                        "flex aspect-square items-center justify-center rounded-xl border text-2xl transition-all",
                        active
                          ? "border-primary bg-primary/10 scale-110 shadow-sm"
                          : "border-border bg-background hover:bg-accent/40",
                      )}
                    >
                      {e}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label htmlFor="win-text" className="mb-1.5 block">
                Niềm vui là gì?
              </Label>
              <Input
                id="win-text"
                value={text}
                onChange={(ev) => setText(ev.target.value.slice(0, MAX_TEXT))}
                placeholder="Vd: Khách khen latte art của Mai siêu xinh!"
                maxLength={MAX_TEXT}
                required
              />
              <p
                className={cn(
                  "mt-1 text-right text-[11px]",
                  remaining < 20 ? "text-amber-600" : "text-muted-foreground",
                )}
              >
                Còn {remaining} ký tự
              </p>
            </div>
            <div>
              <Label htmlFor="win-author" className="mb-1.5 block">
                Tên (tuỳ chọn)
              </Label>
              <Input
                id="win-author"
                value={authorName}
                onChange={(ev) => setAuthorName(ev.target.value.slice(0, 60))}
                placeholder="Tên của bạn"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={!text.trim()}>
                <PartyPopper className="size-4" />
                Đăng
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {!hydrated ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Đang tải…
            </CardContent>
          </Card>
        ) : groups.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Chưa có niềm vui nào — hãy là người đầu tiên ghi lại nhé!
            </CardContent>
          </Card>
        ) : (
          groups.map((g) => (
            <section key={g.key} className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {g.label}
              </h2>
              <div className="space-y-2">
                {g.items.map((w) => (
                  <Card key={w.id} className="overflow-hidden">
                    <CardContent className="flex items-start gap-3 py-3">
                      <div
                        className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent/50 text-3xl"
                        aria-hidden
                      >
                        {w.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-snug">{w.text}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {w.authorName ? `${w.authorName} · ` : ""}
                          {formatTime(w.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLike(w.id)}
                          aria-label={`React tim, hiện ${w.likes}`}
                        >
                          <Heart
                            className={cn(
                              "size-4",
                              w.likes > 0 && "fill-red-500 text-red-500",
                            )}
                          />
                          <span className="tabular-nums">{w.likes}</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(w.id)}
                          aria-label="Xoá"
                        >
                          <Trash2 className="size-4" />
                          <span className="sr-only sm:not-sr-only">Xoá</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 28 }, (_, i) => i);
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {pieces.map((i) => {
        const left = (i / pieces.length) * 100;
        const delay = (i % 8) * 0.08;
        const duration = 1.8 + (i % 5) * 0.25;
        const colors = [
          "#ef4444",
          "#f59e0b",
          "#10b981",
          "#3b82f6",
          "#a855f7",
          "#ec4899",
        ];
        const color = colors[i % colors.length];
        return (
          <span
            key={i}
            className="absolute top-0 block h-2 w-2 rounded-sm"
            style={{
              left: `${left}%`,
              backgroundColor: color,
              animation: `wins-confetti-fall ${duration}s ease-in ${delay}s both`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes wins-confetti-fall {
          0% { transform: translateY(-20%) rotate(0deg); opacity: 1; }
          100% { transform: translateY(360%) rotate(540deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
