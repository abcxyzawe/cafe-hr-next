"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { History, X } from "lucide-react";

const STORAGE_KEY = "cafe-hr-notes-recent-searches";
const MAX_RECENT = 5;
const EVENT_NAME = "cafe-hr:notes-recent-changed";

function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is string => typeof s === "string" && s.length > 0).slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

function writeRecent(list: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
  window.dispatchEvent(new Event(EVENT_NAME));
  window.dispatchEvent(
    new StorageEvent("storage", { key: STORAGE_KEY, newValue: JSON.stringify(list) }),
  );
}

/** Tracks the current query and pushes it to the front of the recent list. */
export function RecentSearchesTracker({ query }: { query: string }) {
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    const current = readRecent();
    const next = [trimmed, ...current.filter((s) => s !== trimmed)];
    writeRecent(next);
  }, [query]);
  return null;
}

/** Renders the chips. Clicking a chip navigates to /notes-search?q=... */
export function RecentSearchesChips() {
  const [items, setItems] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(readRecent());
    setHydrated(true);
    function refresh() {
      setItems(readRecent());
    }
    window.addEventListener("storage", refresh);
    window.addEventListener(EVENT_NAME, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(EVENT_NAME, refresh);
    };
  }, []);

  function remove(term: string) {
    writeRecent(readRecent().filter((s) => s !== term));
  }

  if (!hydrated || items.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <History className="size-3.5" />
        Gần đây:
      </span>
      {items.map((term) => (
        <span
          key={term}
          className="inline-flex items-center gap-1 rounded-full border bg-muted px-2.5 py-0.5 text-xs hover:bg-accent"
        >
          <Link
            href={`/notes-search?q=${encodeURIComponent(term)}`}
            className="max-w-[180px] truncate"
          >
            {term}
          </Link>
          <button
            type="button"
            onClick={() => remove(term)}
            aria-label={`Xoá ${term}`}
            className="inline-flex size-3.5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
          >
            <X className="size-2.5" />
          </button>
        </span>
      ))}
    </div>
  );
}
