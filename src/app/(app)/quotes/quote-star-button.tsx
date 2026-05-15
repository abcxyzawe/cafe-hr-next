"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SAVED_QUOTES_EVENT,
  getSavedQuotes,
  toggleSavedQuote,
} from "@/lib/saved-quotes";

export function QuoteStarButton({ quoteId }: { quoteId: number }) {
  const [saved, setSaved] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSaved(getSavedQuotes().has(quoteId));
    setHydrated(true);

    function refresh() {
      setSaved(getSavedQuotes().has(quoteId));
    }
    window.addEventListener("storage", refresh);
    window.addEventListener(SAVED_QUOTES_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(SAVED_QUOTES_EVENT, refresh);
    };
  }, [quoteId]);

  function onClick() {
    setSaved(toggleSavedQuote(quoteId));
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? "Bỏ lưu câu nói" : "Lưu câu nói"}
      title={saved ? "Bỏ lưu" : "Lưu vào yêu thích"}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        saved && "border-amber-400/50 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300",
        !hydrated && "opacity-60",
      )}
    >
      <Star
        className={cn("size-4", saved && "fill-current")}
        aria-hidden
      />
    </button>
  );
}
