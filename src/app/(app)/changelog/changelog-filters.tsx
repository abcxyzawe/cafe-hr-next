"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, CheckCheck, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setLastReadToLatest } from "@/lib/changelog-read-state";

type ChangelogFiltersProps = {
  /** All distinct years found in the entries, descending. */
  years: number[];
  /** Latest version string — passed to localStorage on "mark all read". */
  latestVersion: string;
};

const ALL_YEARS = "all";

/**
 * Client filters for /changelog.
 *
 * Filtering happens via DOM toggling: each `<article data-year="2025" data-text="...">`
 * card on the page gets `.hidden` added when it doesn't match. Keeps the server tree
 * untouched so we don't lose RSC streaming.
 */
export function ChangelogFilters({
  years,
  latestVersion,
}: ChangelogFiltersProps) {
  const [year, setYear] = useState<string>(ALL_YEARS);
  const [query, setQuery] = useState("");
  const [marked, setMarked] = useState(false);

  const applyFilters = useCallback((selectedYear: string, q: string): void => {
    if (typeof document === "undefined") return;
    const needle = q.trim().toLowerCase();
    const cards = document.querySelectorAll<HTMLElement>(
      "[data-changelog-entry]",
    );
    let visible = 0;
    cards.forEach((el) => {
      const cardYear = el.getAttribute("data-year") ?? "";
      const cardText = (el.getAttribute("data-text") ?? "").toLowerCase();
      const yearOk = selectedYear === ALL_YEARS || cardYear === selectedYear;
      const textOk = needle.length === 0 || cardText.includes(needle);
      const show = yearOk && textOk;
      el.classList.toggle("hidden", !show);
      if (show) visible += 1;
    });
    const empty = document.querySelector<HTMLElement>(
      "[data-changelog-empty]",
    );
    if (empty) empty.classList.toggle("hidden", visible !== 0);
  }, []);

  useEffect(() => {
    applyFilters(year, query);
  }, [applyFilters, year, query]);

  const yearList = useMemo(
    () => [ALL_YEARS, ...years.map((y) => String(y))],
    [years],
  );

  const handleMarkRead = (): void => {
    setLastReadToLatest(latestVersion);
    setMarked(true);
    window.setTimeout(() => setMarked(false), 1500);
  };

  return (
    <div className="space-y-3 rounded-2xl border bg-card/60 p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm trong tiêu đề hoặc mô tả…"
            className="pl-8 pr-8"
            aria-label="Tìm kiếm thay đổi"
          />
          {query.length > 0 ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Xoá tìm kiếm"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
        <Button
          type="button"
          variant={marked ? "secondary" : "outline"}
          size="sm"
          onClick={handleMarkRead}
          className="self-start sm:self-auto"
        >
          {marked ? (
            <>
              <Check className="size-4" />
              Đã lưu
            </>
          ) : (
            <>
              <CheckCheck className="size-4" />
              Đánh dấu đã đọc tất cả
            </>
          )}
        </Button>
      </div>

      <div
        role="tablist"
        aria-label="Lọc theo năm"
        className="flex flex-wrap items-center gap-1.5"
      >
        {yearList.map((y) => {
          const active = year === y;
          return (
            <button
              key={y}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setYear(y)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {y === ALL_YEARS ? "Tất cả" : y}
            </button>
          );
        })}
      </div>
    </div>
  );
}
