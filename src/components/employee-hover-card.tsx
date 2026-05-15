"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { ExternalLink, Heart, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, formatVND } from "@/lib/utils";
import type { EmployeePreviewData } from "@/app/api/employee-preview/[id]/route";

const HOVER_OPEN_DELAY_MS = 250;
const HOVER_CLOSE_DELAY_MS = 150;
const CACHE_TTL_MS = 30_000;
const POPOVER_WIDTH = 288;
const POPOVER_MAX_HEIGHT = 320;
const VIEWPORT_MARGIN = 8;

type CacheEntry = {
  data: EmployeePreviewData;
  fetchedAt: number;
};

type Position = {
  top: number;
  left: number;
};

const ROLE_VARIANT: Record<
  string,
  "default" | "secondary" | "success" | "warning"
> = {
  barista: "default",
  server: "secondary",
  cashier: "warning",
  manager: "success",
};

/**
 * Singleton hover preview for any element marked with `data-employee-id={N}`.
 * Mount once in the app layout. Uses event delegation so dynamically-rendered
 * links pick up the behavior automatically.
 */
export function EmployeeHoverCard({ isAdmin }: { isAdmin: boolean }) {
  const [data, setData] = useState<EmployeePreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);

  const cacheRef = useRef<Map<number, CacheEntry>>(new Map());
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const currentIdRef = useRef<number | null>(null);

  const clearOpenTimer = useCallback(() => {
    if (openTimerRef.current !== null) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const closeNow = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    currentIdRef.current = null;
    setData(null);
    setLoading(false);
    setPosition(null);
  }, [clearOpenTimer, clearCloseTimer]);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      closeNow();
    }, HOVER_CLOSE_DELAY_MS);
  }, [clearCloseTimer, closeNow]);

  const computePosition = useCallback((rect: DOMRect): Position => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
    left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(left, vw - POPOVER_WIDTH - VIEWPORT_MARGIN),
    );
    // Prefer below; flip above if no room
    let top = rect.bottom + 8;
    if (top + POPOVER_MAX_HEIGHT > vh - VIEWPORT_MARGIN) {
      top = Math.max(VIEWPORT_MARGIN, rect.top - POPOVER_MAX_HEIGHT - 8);
    }
    return { top, left };
  }, []);

  const openFor = useCallback(
    (id: number, rect: DOMRect) => {
      currentIdRef.current = id;
      setPosition(computePosition(rect));

      const cached = cacheRef.current.get(id);
      const fresh =
        cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS ? cached : null;
      if (fresh) {
        setData(fresh.data);
        setLoading(false);
        return;
      }

      setData(null);
      setLoading(true);
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      fetch(`/api/employee-preview/${id}`, {
        signal: ctrl.signal,
        credentials: "same-origin",
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = (await res.json()) as EmployeePreviewData;
          return json;
        })
        .then((json) => {
          cacheRef.current.set(id, { data: json, fetchedAt: Date.now() });
          // Only apply if user is still hovering this same id
          if (currentIdRef.current === id) {
            setData(json);
            setLoading(false);
          }
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          if (currentIdRef.current === id) {
            setLoading(false);
            setData(null);
          }
        });
    },
    [computePosition],
  );

  // Document delegation for hover triggers
  useEffect(() => {
    if (typeof document === "undefined") return;

    function findTrigger(target: EventTarget | null): HTMLElement | null {
      if (!(target instanceof Element)) return null;
      const el = target.closest<HTMLElement>("[data-employee-id]");
      return el;
    }

    function onOver(ev: MouseEvent) {
      const trigger = findTrigger(ev.target);
      if (!trigger) return;
      const raw = trigger.getAttribute("data-employee-id");
      if (!raw) return;
      const id = Number(raw);
      if (!Number.isInteger(id) || id <= 0) return;

      // Cancel any pending close while moving between trigger and popover
      clearCloseTimer();

      // If we're already showing this id, do nothing
      if (currentIdRef.current === id) return;

      clearOpenTimer();
      const rect = trigger.getBoundingClientRect();
      openTimerRef.current = setTimeout(() => {
        openFor(id, rect);
      }, HOVER_OPEN_DELAY_MS);
    }

    function onOut(ev: MouseEvent) {
      const trigger = findTrigger(ev.target);
      if (!trigger) return;
      // Ignore if the cursor moved into a child of the trigger
      const related = ev.relatedTarget;
      if (related instanceof Node && trigger.contains(related)) return;
      // Ignore if the cursor moved into the popover itself
      if (
        related instanceof Node &&
        popoverRef.current &&
        popoverRef.current.contains(related)
      ) {
        return;
      }
      clearOpenTimer();
      scheduleClose();
    }

    function onFocusIn(ev: FocusEvent) {
      const trigger = findTrigger(ev.target);
      if (!trigger) return;
      const raw = trigger.getAttribute("data-employee-id");
      if (!raw) return;
      const id = Number(raw);
      if (!Number.isInteger(id) || id <= 0) return;
      clearCloseTimer();
      if (currentIdRef.current === id) return;
      clearOpenTimer();
      const rect = trigger.getBoundingClientRect();
      openFor(id, rect);
    }

    function onFocusOut(ev: FocusEvent) {
      const trigger = findTrigger(ev.target);
      if (!trigger) return;
      const related = ev.relatedTarget;
      if (
        related instanceof Node &&
        popoverRef.current &&
        popoverRef.current.contains(related)
      ) {
        return;
      }
      scheduleClose();
    }

    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      clearOpenTimer();
      clearCloseTimer();
      if (abortRef.current) abortRef.current.abort();
    };
  }, [openFor, clearCloseTimer, clearOpenTimer, scheduleClose]);

  // Esc dismisses; also close on scroll/resize so the position stays sane
  useEffect(() => {
    if (!data && !loading) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeNow();
    }
    function onScroll() {
      closeNow();
    }
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [data, loading, closeNow]);

  if (!position) return null;
  if (!data && !loading) return null;

  const roleLabel = data ? ROLE_LABELS[data.role] ?? data.role : null;
  const variant = data ? ROLE_VARIANT[data.role] ?? "secondary" : "secondary";

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={data ? `Xem nhanh ${data.name}` : "Đang tải xem nhanh"}
      tabIndex={-1}
      onMouseEnter={clearCloseTimer}
      onMouseLeave={scheduleClose}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        width: POPOVER_WIDTH,
        zIndex: 90,
      }}
      className="rounded-xl border bg-card p-4 shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150"
    >
      {loading || !data ? (
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          <span className="ml-2 text-xs">Đang tải…</span>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3">
            <Avatar
              src={data.avatarUrl}
              alt={data.name}
              fallback={data.name}
              size={64}
              className="ring-2 ring-primary/10"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">
                {data.name}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {roleLabel && (
                  <Badge variant={variant} className="text-[10px]">
                    {roleLabel}
                  </Badge>
                )}
                {data.isActive && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    <span className="relative flex size-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                      <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                    </span>
                    Đang trong ca
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {formatVND(data.hourlyRate)}
                </span>
                /giờ
              </p>
            </div>
          </div>

          {data.lastActivity && (
            <p className="mt-3 line-clamp-2 rounded-md bg-muted/50 px-2 py-1.5 text-[11px] leading-snug text-muted-foreground">
              {data.lastActivity}
            </p>
          )}

          <div className="mt-3 flex items-center gap-2">
            <Link
              href={`/employees/${data.id}`}
              onClick={() => closeNow()}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border bg-card px-2 py-1.5 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ExternalLink className="size-3" />
              Mở hồ sơ
            </Link>
            {isAdmin && (
              <Link
                href={`/employees/${data.id}#kudos`}
                onClick={() => closeNow()}
                aria-label={`Tặng lời khen cho ${data.name}`}
                className="inline-flex items-center justify-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-300 dark:hover:bg-rose-900/40"
              >
                <Heart className="size-3" />
                Tặng lời khen
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}
