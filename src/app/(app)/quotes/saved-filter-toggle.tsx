"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SAVED_QUOTES_EVENT,
  getSavedQuotes,
} from "@/lib/saved-quotes";

const FILTER_ATTR = "data-quote-id";
const HIDDEN_CLASS = "hidden";

function applyFilter(active: boolean) {
  if (typeof document === "undefined") return;
  const saved = getSavedQuotes();
  const items = document.querySelectorAll<HTMLElement>(`[${FILTER_ATTR}]`);
  items.forEach((el) => {
    const id = Number(el.getAttribute(FILTER_ATTR));
    if (!active) {
      el.classList.remove(HIDDEN_CLASS);
      return;
    }
    el.classList.toggle(HIDDEN_CLASS, !saved.has(id));
  });
}

export function SavedFilterToggle() {
  const [active, setActive] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    function refresh() {
      setCount(getSavedQuotes().size);
      applyFilter(active);
    }
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(SAVED_QUOTES_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(SAVED_QUOTES_EVENT, refresh);
    };
  }, [active]);

  function toggle() {
    const next = !active;
    setActive(next);
    applyFilter(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-amber-400/50 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
          : "bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Star className={cn("size-3.5", active && "fill-current")} aria-hidden />
      {active ? "Đang lọc đã lưu" : "Chỉ hiện đã lưu"}
      <span className="rounded-full bg-background/80 px-1.5 text-[10px] tabular-nums">
        {count}
      </span>
    </button>
  );
}
