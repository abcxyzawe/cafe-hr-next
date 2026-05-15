"use client";

import { useEffect, useState, useCallback } from "react";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "cafe-hr-feedback-handled";

function readSet(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    const out = new Set<number>();
    for (const v of parsed) {
      if (typeof v === "number" && Number.isFinite(v)) out.add(v);
    }
    return out;
  } catch {
    return new Set();
  }
}

function writeSet(set: Set<number>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // ignore quota errors
  }
}

export function HandledToggle({ id }: { id: number }) {
  const [handled, setHandled] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const set = readSet();
    setHandled(set.has(id));
    setHydrated(true);
  }, [id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      const set = readSet();
      setHandled(set.has(id));
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [id]);

  const toggle = useCallback(() => {
    const set = readSet();
    if (set.has(id)) {
      set.delete(id);
      setHandled(false);
    } else {
      set.add(id);
      setHandled(true);
    }
    writeSet(set);
  }, [id]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={handled}
      title={handled ? "Bỏ đánh dấu đã xử lý" : "Đánh dấu đã xử lý"}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
        hydrated && handled
          ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-900/30 dark:text-emerald-300"
          : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {hydrated && handled ? (
        <>
          <Check className="size-3" />
          Đã xử lý
        </>
      ) : (
        <>
          <Circle className="size-3" />
          Chưa xử lý
        </>
      )}
    </button>
  );
}
