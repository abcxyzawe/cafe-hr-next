"use client";

import { useEffect, useMemo, useState } from "react";
import { Coffee, Printer, Sparkles } from "lucide-react";
import {
  getMenu,
  MENU_EVENT,
  STORAGE_KEY,
  type MenuItem,
} from "@/lib/menu-state";
import { formatVND } from "@/lib/utils";

const ITEMS_PER_TENT = 7;
const TENT_COUNT_OPTIONS: ReadonlyArray<number> = [2, 3, 4, 6];

function pickFeatured(items: MenuItem[], limit: number): MenuItem[] {
  if (items.length === 0) return [];
  const highlighted = items.filter((it) => it.highlight);
  const rest = items.filter((it) => !it.highlight);
  const chosen: MenuItem[] = [];
  for (const it of highlighted) {
    if (chosen.length >= limit) break;
    chosen.push(it);
  }
  for (const it of rest) {
    if (chosen.length >= limit) break;
    chosen.push(it);
  }
  return chosen;
}

type PanelProps = {
  items: MenuItem[];
  flipped: boolean;
};

function TentPanel({ items, flipped }: PanelProps) {
  return (
    <div
      className={`flex h-full w-full flex-col items-stretch px-8 py-6 ${
        flipped ? "rotate-180" : ""
      }`}
    >
      <header className="flex items-center justify-center gap-2 border-b border-dashed border-amber-700/50 pb-2 text-center">
        <div className="flex size-8 items-center justify-center rounded-full bg-amber-700 text-white">
          <Coffee className="size-4" />
        </div>
        <div className="leading-tight">
          <p className="text-[8pt] font-medium uppercase tracking-[0.25em] text-amber-700">
            Cafe HR
          </p>
          <p className="text-[12pt] font-bold uppercase tracking-wider text-amber-900">
            Menu nổi bật
          </p>
        </div>
        <Sparkles className="size-4 text-amber-600" />
      </header>

      <ul className="mt-3 flex-1 space-y-2">
        {items.map((it) => (
          <li key={it.id} className="text-zinc-900">
            <div className="flex items-baseline gap-2">
              <span className="text-[11pt] font-semibold text-amber-900">
                {it.name}
              </span>
              <span
                className="min-w-0 flex-1 self-end border-b border-dotted border-amber-700/40"
                aria-hidden="true"
              />
              <span className="shrink-0 font-mono text-[10pt] font-bold text-amber-800">
                {formatVND(it.priceVnd)}
              </span>
            </div>
            {it.description ? (
              <p className="mt-0.5 line-clamp-2 text-[8.5pt] italic text-zinc-600">
                {it.description}
              </p>
            ) : null}
          </li>
        ))}
        {items.length === 0 ? (
          <li className="rounded border border-dashed border-amber-700/40 p-4 text-center text-[9pt] text-zinc-500">
            Chưa có món nào trong menu. Hãy thêm món tại /menu.
          </li>
        ) : null}
      </ul>

      <footer className="mt-2 border-t border-dashed border-amber-700/40 pt-1 text-center text-[7.5pt] text-zinc-500">
        Giá đã bao gồm VAT · Hỏi nhân viên để biết món theo mùa
      </footer>
    </div>
  );
}

type TentProps = {
  items: MenuItem[];
};

function Tent({ items }: TentProps) {
  return (
    <article className="tent break-inside-avoid border border-amber-700/50 bg-white">
      {/* Top panel: rotated so when folded it reads upright */}
      <div className="tent-panel">
        <TentPanel items={items} flipped />
      </div>
      {/* Fold line */}
      <div className="relative h-0 border-t-2 border-dashed border-amber-700/70">
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white px-2 text-[7pt] uppercase tracking-widest text-amber-700">
          gấp đôi theo đường này
        </span>
      </div>
      {/* Bottom panel */}
      <div className="tent-panel">
        <TentPanel items={items} flipped={false} />
      </div>
    </article>
  );
}

function SkeletonTent() {
  return (
    <div className="tent break-inside-avoid border border-amber-700/40 bg-white">
      <div className="tent-panel animate-pulse bg-amber-50/40" />
      <div className="h-0 border-t-2 border-dashed border-amber-700/60" />
      <div className="tent-panel animate-pulse bg-amber-50/40" />
    </div>
  );
}

export function TableTentBoard() {
  const [items, setItems] = useState<MenuItem[] | null>(null);
  const [tentCount, setTentCount] = useState<number>(2);

  useEffect(() => {
    function refresh() {
      setItems(getMenu());
    }
    refresh();
    function onStorage(e: StorageEvent) {
      if (e.key === null || e.key === STORAGE_KEY) refresh();
    }
    function onCustom() {
      refresh();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(MENU_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(MENU_EVENT, onCustom);
    };
  }, []);

  const featured = useMemo(() => {
    if (!items) return [];
    return pickFeatured(items, ITEMS_PER_TENT);
  }, [items]);

  const totalPages = Math.ceil(tentCount / 2);

  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }

  return (
    <div className="table-tent-root">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background px-4 py-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor="tent-count"
            className="text-xs font-medium text-muted-foreground"
          >
            Số tent
          </label>
          <select
            id="tent-count"
            value={tentCount}
            onChange={(e) => setTentCount(Number.parseInt(e.target.value, 10))}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            {TENT_COUNT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} tent ({Math.ceil(n / 2)} trang)
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">
            {featured.length} món/tent · {totalPages} trang A4
          </span>
        </div>
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-amber-700 px-4 text-sm font-medium text-white shadow-sm hover:bg-amber-800"
        >
          <Printer className="size-4" />
          In table tent
        </button>
      </div>

      <main className="mx-auto max-w-[210mm]">
        <section className="flex flex-col gap-3 print:gap-0">
          {items === null
            ? Array.from({ length: tentCount }, (_, idx) => (
                <SkeletonTent key={`sk-${idx}`} />
              ))
            : Array.from({ length: tentCount }, (_, idx) => {
                const isPageStart = idx > 0 && idx % 2 === 0;
                return (
                  <div
                    key={`tent-${idx}`}
                    className={isPageStart ? "tent-page-break" : ""}
                  >
                    <Tent items={featured} />
                  </div>
                );
              })}
        </section>
      </main>

      <style>{`
        .tent-panel {
          height: 138mm;
          overflow: hidden;
        }
        .tent {
          width: 100%;
        }
        @page { size: A4 portrait; margin: 1cm; }
        @media print {
          html, body { background: white !important; }
          .no-print { display: none !important; }
          .table-tent-root { background: white !important; }
          .tent { box-shadow: none !important; }
          .tent-page-break { break-before: page; page-break-before: always; }
        }
      `}</style>
    </div>
  );
}
