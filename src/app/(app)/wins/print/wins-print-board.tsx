"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Cake,
  ChevronLeft,
  Heart,
  Printer,
  Sparkles,
} from "lucide-react";
import { getWins, WINS_EVENT, type WinEntry } from "@/lib/wins-state";

type Props = {
  weekOffset: number;
  minOffset: number;
  maxOffset: number;
};

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0 = Sun
  const diff = (day === 0 ? -6 : 1) - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDay(d: Date): string {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
}

function formatDayYear(d: Date): string {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function formatRelative(iso: string, now: Date): string {
  const then = new Date(iso).getTime();
  const diffMs = now.getTime() - then;
  if (Number.isNaN(diffMs)) return "";
  const sec = Math.max(0, Math.floor(diffMs / 1000));
  if (sec < 60) return "vừa xong";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} ngày trước`;
  return formatDayYear(new Date(iso));
}

function weekRangeLabel(start: Date, end: Date): string {
  // start..end inclusive (Mon..Sun)
  return `${formatDay(start)} – ${formatDayYear(end)}`;
}

export function WinsPrintBoard({ weekOffset, minOffset, maxOffset }: Props) {
  const [hydrated, setHydrated] = useState(false);
  const [wins, setWins] = useState<WinEntry[]>([]);

  useEffect(() => {
    setWins(getWins());
    setHydrated(true);
    const onChange = (): void => setWins(getWins());
    window.addEventListener(WINS_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(WINS_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const { weekStart, weekEnd } = useMemo(() => {
    const base = startOfWeekMonday(new Date());
    const ws = addDays(base, weekOffset * 7);
    const we = addDays(ws, 6);
    we.setHours(23, 59, 59, 999);
    return { weekStart: ws, weekEnd: we };
  }, [weekOffset]);

  const filtered = useMemo(() => {
    const startMs = weekStart.getTime();
    const endMs = weekEnd.getTime();
    return wins
      .filter((w) => {
        const t = new Date(w.createdAt).getTime();
        return !Number.isNaN(t) && t >= startMs && t <= endMs;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [wins, weekStart, weekEnd]);

  const now = useMemo(() => new Date(), [filtered]);
  const rangeLabel = weekRangeLabel(weekStart, weekEnd);

  const prevOffset = Math.max(minOffset, weekOffset - 1);
  const nextOffset = Math.min(maxOffset, weekOffset + 1);
  const canGoPrev = prevOffset !== weekOffset;
  const canGoNext = nextOffset !== weekOffset;

  return (
    <div className="wins-print-root min-h-screen bg-zinc-100 print:min-h-0 print:bg-white">
      {/* Toolbar */}
      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-background/95 px-6 py-3 backdrop-blur print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/wins"
            prefetch={false}
            className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent"
          >
            <ChevronLeft className="size-4" />
            Quay lại
          </Link>
          <p className="text-sm text-muted-foreground">
            Bảng niềm vui · A4 dọc · Ctrl/Cmd+P để in
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canGoPrev ? (
            <Link
              href={`/wins/print?weekOffset=${prevOffset}`}
              prefetch={false}
              className="inline-flex h-9 items-center gap-1 rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent"
            >
              <ArrowLeft className="size-4" />
              Tuần trước
            </Link>
          ) : (
            <span
              aria-disabled
              className="inline-flex h-9 cursor-not-allowed items-center gap-1 rounded-md border bg-background px-3 text-sm font-medium text-muted-foreground opacity-50"
            >
              <ArrowLeft className="size-4" />
              Tuần trước
            </span>
          )}
          {canGoNext ? (
            <Link
              href={`/wins/print?weekOffset=${nextOffset}`}
              prefetch={false}
              className="inline-flex h-9 items-center gap-1 rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent"
            >
              Tuần sau
              <ArrowRight className="size-4" />
            </Link>
          ) : (
            <span
              aria-disabled
              className="inline-flex h-9 cursor-not-allowed items-center gap-1 rounded-md border bg-background px-3 text-sm font-medium text-muted-foreground opacity-50"
            >
              Tuần sau
              <ArrowRight className="size-4" />
            </span>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <Printer className="size-4" />
            In poster
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-[210mm] px-4 py-6 text-zinc-900 print:max-w-none print:px-0 print:py-0">
        <article className="page-sheet rounded-lg bg-white p-6 shadow-sm print:rounded-none print:p-0 print:shadow-none">
          <header className="mb-5 flex items-center justify-between gap-4 border-b-2 border-amber-500/70 pb-3">
            <div className="flex items-center gap-3">
              <Image
                src="/brand/logo-96.png"
                alt="Cafe HR"
                width={56}
                height={56}
                className="rounded-lg"
                priority
              />
              <div>
                <p className="text-[10pt] font-semibold uppercase tracking-[0.25em] text-amber-700">
                  Cafe HR
                </p>
                <h1 className="font-serif text-2xl font-extrabold leading-tight tracking-tight text-zinc-900">
                  NIỀM VUI TUẦN NÀY · {rangeLabel}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2 text-amber-700">
              <Sparkles className="size-5" />
              <span className="text-sm font-medium">
                {hydrated ? `${filtered.length} niềm vui` : "Đang tải…"}
              </span>
            </div>
          </header>

          {!hydrated ? (
            <SkeletonGrid />
          ) : filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <section className="columns-1 gap-4 [column-fill:balance] sm:columns-2 lg:columns-3">
              {filtered.map((w) => (
                <WinCard key={w.id} win={w} now={now} />
              ))}
            </section>
          )}

          <footer className="mt-6 flex items-center justify-between border-t border-zinc-200 pt-2 text-[8pt] text-zinc-500">
            <span className="italic">In bởi Cafe HR · {formatDayYear(now)}</span>
            <span>Cảm ơn cả đội — cùng tỏa sáng nhé!</span>
          </footer>
        </article>
      </main>

      <style>{`
        @page { size: A4 portrait; margin: 1.2cm; }
        @media print {
          html, body { background: white !important; }
          .no-print { display: none !important; }
          .wins-print-root { background: white !important; }
          .page-sheet { box-shadow: none !important; }
          .win-card { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}

function WinCard({ win, now }: { win: WinEntry; now: Date }): React.ReactElement {
  return (
    <div className="win-card mb-4 break-inside-avoid rounded-lg border border-zinc-200 bg-amber-50/40 p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="text-4xl leading-none" aria-hidden>
          {win.emoji}
        </span>
        {win.likes > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[9pt] font-semibold text-rose-700">
            <Heart className="size-3 fill-rose-500 text-rose-500" />
            {win.likes}
          </span>
        ) : null}
      </div>
      <p className="whitespace-pre-wrap text-[11pt] leading-relaxed text-zinc-900">
        {win.text}
      </p>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-amber-200/70 pt-2 text-[8.5pt] text-zinc-600">
        <span className="truncate font-medium">
          {win.authorName ? win.authorName : "Ẩn danh"}
        </span>
        <span className="shrink-0 italic">{formatRelative(win.createdAt, now)}</span>
      </div>
    </div>
  );
}

function SkeletonGrid(): React.ReactElement {
  const items = [0, 1, 2, 3, 4, 5];
  return (
    <section className="columns-1 gap-4 [column-fill:balance] sm:columns-2 lg:columns-3">
      {items.map((i) => (
        <div
          key={i}
          className="mb-4 break-inside-avoid rounded-lg border border-zinc-200 bg-white p-4"
        >
          <div className="mb-3 size-10 animate-pulse rounded bg-zinc-200" />
          <div className="mb-2 h-3 w-full animate-pulse rounded bg-zinc-200" />
          <div className="mb-2 h-3 w-5/6 animate-pulse rounded bg-zinc-200" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-200" />
        </div>
      ))}
    </section>
  );
}

function EmptyState(): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center">
      <Cake className="size-12 text-amber-500" aria-hidden />
      <h2 className="text-lg font-semibold text-zinc-800">
        Chưa có niềm vui nào tuần này
      </h2>
      <p className="max-w-sm text-sm text-zinc-500">
        Hãy quay lại trang Wins để chia sẻ khoảnh khắc đáng nhớ — chúng sẽ xuất
        hiện trên bảng poster này.
      </p>
    </div>
  );
}
