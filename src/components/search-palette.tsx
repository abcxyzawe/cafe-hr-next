"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  SITEMAP_CATEGORY_META,
  SITEMAP_ENTRIES,
  type SitemapCategory,
  type SitemapEntry,
} from "@/lib/sitemap-catalogue";
import { cn } from "@/lib/utils";

interface SearchPaletteProps {
  isAdmin: boolean;
}

const MAX_RESULTS = 50;
const CATEGORY_ORDER: ReadonlyArray<SitemapCategory> = [
  "main",
  "ops",
  "people",
  "analytics",
  "system",
];

type GroupedResults = {
  category: SitemapCategory;
  entries: SitemapEntry[];
}[];

function filterEntries(
  query: string,
  isAdmin: boolean,
): { flat: SitemapEntry[]; grouped: GroupedResults } {
  const visible = SITEMAP_ENTRIES.filter((e) => isAdmin || !e.adminOnly);
  const q = query.trim().toLowerCase();
  const matched = q.length === 0
    ? visible.slice()
    : visible.filter((e) => {
        return (
          e.label.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.href.toLowerCase().includes(q)
        );
      });

  const capped = matched.slice(0, MAX_RESULTS);

  const groupedMap = new Map<SitemapCategory, SitemapEntry[]>();
  for (const entry of capped) {
    const arr = groupedMap.get(entry.category) ?? [];
    arr.push(entry);
    groupedMap.set(entry.category, arr);
  }

  // Build flat list following category order so arrow-key index aligns with display order
  const flat: SitemapEntry[] = [];
  const grouped: GroupedResults = [];
  for (const cat of CATEGORY_ORDER) {
    const entries = groupedMap.get(cat);
    if (entries && entries.length > 0) {
      grouped.push({ category: cat, entries });
      flat.push(...entries);
    }
  }
  return { flat, grouped };
}

export function SearchPalette({ isAdmin }: SearchPaletteProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);

  const { flat, grouped } = React.useMemo(
    () => filterEntries(query, isAdmin),
    [query, isAdmin],
  );

  // Reset selected index when filtered results change
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [query, open]);

  // Keep selection in range
  React.useEffect(() => {
    if (selectedIndex >= flat.length) {
      setSelectedIndex(flat.length === 0 ? 0 : flat.length - 1);
    }
  }, [flat.length, selectedIndex]);

  // Auto-focus input + lock scroll when opened
  React.useEffect(() => {
    if (open) {
      // Focus on next tick so the element is in the DOM
      const id = window.setTimeout(() => inputRef.current?.focus(), 0);
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        window.clearTimeout(id);
        document.body.style.overflow = prevOverflow;
      };
    }
    return;
  }, [open]);

  // Scroll selected item into view
  React.useEffect(() => {
    if (!open) return;
    const container = listRef.current;
    if (!container) return;
    const el = container.querySelector<HTMLElement>(
      `[data-result-index="${selectedIndex}"]`,
    );
    if (el) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, open, flat.length]);

  // Global keydown: Ctrl/Cmd+K toggle, "/" to open
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isEditing =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable === true;

      // Ctrl/Cmd + K toggles regardless of focus context
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }

      // "/" opens when not typing and modal is closed
      if (
        e.key === "/" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !isEditing
      ) {
        // Don't double-open if already open
        // (when open the inner input handler won't trigger because of isEditing inside the input)
        e.preventDefault();
        setOpen(true);
        return;
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const handleSelect = React.useCallback(
    (entry: SitemapEntry) => {
      setOpen(false);
      setQuery("");
      router.push(entry.href);
    },
    [router],
  );

  const onModalKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (flat.length === 0) return;
      setSelectedIndex((i) => (i + 1) % flat.length);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (flat.length === 0) return;
      setSelectedIndex((i) => (i - 1 + flat.length) % flat.length);
      return;
    }
    if (e.key === "Enter") {
      if (flat.length === 0) return;
      e.preventDefault();
      const target = flat[selectedIndex] ?? flat[0];
      if (target) handleSelect(target);
      return;
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tìm kiếm nhanh"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]"
      onKeyDown={onModalKeyDown}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in"
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <div className="relative z-10 mx-4 w-full max-w-xl overflow-hidden rounded-xl border bg-card shadow-2xl animate-in fade-in slide-in-from-top-2">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Search className="size-4 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm trang, tính năng, đường dẫn..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Tìm kiếm"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden sm:inline-flex min-w-[20px] items-center justify-center rounded border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            Esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
          {flat.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              Không có kết quả phù hợp.
            </div>
          ) : (
            grouped.map((group) => {
              const meta = SITEMAP_CATEGORY_META[group.category];
              return (
                <div key={group.category} className="mb-2 last:mb-0">
                  <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {meta.label}
                  </div>
                  <ul className="space-y-0.5">
                    {group.entries.map((entry) => {
                      const flatIndex = flat.indexOf(entry);
                      const isActive = flatIndex === selectedIndex;
                      return (
                        <li key={entry.href}>
                          <button
                            type="button"
                            data-result-index={flatIndex}
                            onMouseEnter={() => setSelectedIndex(flatIndex)}
                            onClick={() => handleSelect(entry)}
                            className={cn(
                              "flex w-full items-start justify-between gap-3 rounded-md px-3 py-2 text-left transition-colors",
                              isActive
                                ? "bg-accent text-accent-foreground"
                                : "hover:bg-muted/60",
                            )}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">
                                {entry.label}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {entry.description}
                              </span>
                            </span>
                            <span className="shrink-0 text-[11px] text-muted-foreground">
                              {entry.href}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t px-4 py-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-2">
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-semibold">↑</kbd>
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-semibold">↓</kbd>
            <span>điều hướng</span>
          </span>
          <span className="flex items-center gap-2">
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-semibold">↵</kbd>
            <span>mở</span>
          </span>
        </div>
      </div>
    </div>
  );
}
