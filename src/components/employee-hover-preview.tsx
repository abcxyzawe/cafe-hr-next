"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Loader2, MessageSquare, CircleDot } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, formatVND, cn } from "@/lib/utils";
import type { EmployeePreviewData } from "@/app/api/employee-preview/[id]/route";

const OPEN_DELAY_MS = 300;
const CLOSE_DELAY_MS = 200;
const LONG_PRESS_MS = 500;

// Module-level cache shared across all instances. Cleared on full reload.
const cache = new Map<number, EmployeePreviewData>();
// Dedupe in-flight requests by id so simultaneous hovers fire one fetch.
const inflight = new Map<number, Promise<EmployeePreviewData>>();

async function fetchPreview(id: number): Promise<EmployeePreviewData> {
  const cached = cache.get(id);
  if (cached) return cached;
  const existing = inflight.get(id);
  if (existing) return existing;
  const p = (async () => {
    const res = await fetch(`/api/employee-preview/${id}`, {
      credentials: "same-origin",
    });
    if (!res.ok) {
      throw new Error(`Preview request failed (${res.status})`);
    }
    const data = (await res.json()) as EmployeePreviewData;
    cache.set(id, data);
    return data;
  })();
  inflight.set(id, p);
  try {
    return await p;
  } finally {
    inflight.delete(id);
  }
}

interface EmployeeHoverPreviewProps {
  employeeId: number;
  children: ReactNode;
  /** Optional className applied to the inline-block wrapper around children */
  className?: string;
}

export function EmployeeHoverPreview({
  employeeId,
  children,
  className,
}: EmployeeHoverPreviewProps) {
  const popoverId = useId();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<EmployeePreviewData | null>(
    () => cache.get(employeeId) ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
    };
  }, []);

  const ensureData = useCallback(async () => {
    if (cache.has(employeeId)) {
      const cached = cache.get(employeeId);
      if (cached) setData(cached);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const result = await fetchPreview(employeeId);
      if (mountedRef.current) {
        setData(result);
      }
    } catch {
      if (mountedRef.current) {
        setError(true);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [employeeId]);

  const scheduleOpen = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (openTimeoutRef.current) return;
    openTimeoutRef.current = setTimeout(() => {
      openTimeoutRef.current = null;
      setOpen(true);
      void ensureData();
    }, OPEN_DELAY_MS);
  }, [ensureData]);

  const scheduleClose = useCallback(() => {
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
    if (closeTimeoutRef.current) return;
    closeTimeoutRef.current = setTimeout(() => {
      closeTimeoutRef.current = null;
      setOpen(false);
    }, CLOSE_DELAY_MS);
  }, []);

  const openImmediate = useCallback(() => {
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
    setOpen(true);
    void ensureData();
  }, [ensureData]);

  // Touch: long-press to open
  const handleTouchStart = useCallback(() => {
    if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
    longPressTimeoutRef.current = setTimeout(() => {
      longPressTimeoutRef.current = null;
      openImmediate();
    }, LONG_PRESS_MS);
  }, [openImmediate]);

  const cancelLongPress = useCallback(() => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }, []);

  // Close popover when clicking outside on touch devices
  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: PointerEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      const root = document.getElementById(popoverId);
      const triggerEl = document.querySelector(
        `[aria-describedby="${popoverId}"]`,
      );
      if (root?.contains(target)) return;
      if (triggerEl?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [open, popoverId]);

  // Render children unchanged on error (popover suppressed)
  const showPopover = open && !error;

  return (
    <span
      className={cn("relative inline-block", className)}
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
      onFocus={scheduleOpen}
      onBlur={scheduleClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={cancelLongPress}
      onTouchCancel={cancelLongPress}
      onTouchMove={cancelLongPress}
      aria-describedby={showPopover ? popoverId : undefined}
    >
      {children}
      {showPopover && (
        <div
          id={popoverId}
          role="tooltip"
          className="absolute left-0 top-full z-50 mt-2 w-72 max-w-xs rounded-lg border bg-white p-4 text-left shadow-xl dark:bg-neutral-900 dark:border-neutral-800"
          onMouseEnter={() => {
            if (closeTimeoutRef.current) {
              clearTimeout(closeTimeoutRef.current);
              closeTimeoutRef.current = null;
            }
          }}
          onMouseLeave={scheduleClose}
        >
          <PopoverBody data={data} loading={loading} />
        </div>
      )}
    </span>
  );
}

function PopoverBody({
  data,
  loading,
}: {
  data: EmployeePreviewData | null;
  loading: boolean;
}) {
  if (!data && loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span>Đang tải…</span>
      </div>
    );
  }
  if (!data) return null;

  const roleLabel = ROLE_LABELS[data.role] ?? data.role;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Avatar
          src={data.avatarUrl}
          alt={data.name}
          fallback={data.name}
          role={data.role}
          size={40}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{data.name}</div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px]">
              {roleLabel}
            </Badge>
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-medium",
                data.isActive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground",
              )}
            >
              <CircleDot className="size-3" />
              {data.isActive ? "Đang trong ca" : "Không trong ca"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-md bg-muted/40 px-2.5 py-1.5 text-[11px]">
        <span className="text-muted-foreground">Lương / giờ</span>
        <span className="font-semibold tabular-nums">
          {formatVND(data.hourlyRate)}
        </span>
      </div>

      <div>
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <MessageSquare className="size-3" />
          <span>Hoạt động gần đây</span>
        </div>
        <p className="line-clamp-3 text-xs text-foreground/80">
          {data.lastActivity ?? "Chưa có hoạt động được ghi nhận."}
        </p>
      </div>
    </div>
  );
}
