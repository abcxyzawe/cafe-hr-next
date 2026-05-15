"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { updateShiftTime } from "./actions";

const HHMM = /^\d{2}:\d{2}$/;

function formatRange(startTime: string | null, endTime: string | null): string {
  if (!startTime && !endTime) return "—";
  return `${startTime ?? "—"}-${endTime ?? "—"}`;
}

export function InlineTimeEdit({
  id,
  startTime,
  endTime,
  editable,
}: {
  id: number;
  startTime: string | null;
  endTime: string | null;
  editable: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(startTime ?? "");
  const [end, setEnd] = useState(endTime ?? "");
  const [pending, startTransition] = useTransition();
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setStart(startTime ?? "");
    setEnd(endTime ?? "");
  }, [startTime, endTime]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    }
    function onClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [open]);

  if (!editable) {
    return (
      <span className="text-[10px] text-muted-foreground">
        {formatRange(startTime, endTime)}
      </span>
    );
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    const s = start.trim() === "" ? null : start.trim();
    const en = end.trim() === "" ? null : end.trim();
    if (s !== null && !HHMM.test(s)) {
      toast.error("Giờ bắt đầu phải dạng HH:MM");
      return;
    }
    if (en !== null && !HHMM.test(en)) {
      toast.error("Giờ kết thúc phải dạng HH:MM");
      return;
    }
    if (s !== null && en !== null && !(s < en)) {
      toast.error("Giờ bắt đầu phải trước giờ kết thúc");
      return;
    }
    startTransition(async () => {
      const res = await updateShiftTime(id, s, en);
      if (res.ok) {
        toast.success("Đã lưu giờ ca");
        setOpen(false);
      } else {
        toast.error(res.error ?? "Không lưu được");
      }
    });
  }

  return (
    <span className="relative inline-block">
      <button
        type="button"
        draggable={false}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((v) => !v);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onDragStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className={cn(
          "cursor-pointer rounded px-1 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground",
          open && "bg-accent text-foreground",
        )}
        title="Click để sửa giờ ca"
      >
        {formatRange(startTime, endTime)}
      </button>
      {open && (
        <div
          ref={popoverRef}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute left-0 top-full z-50 mt-1 w-[220px] rounded-md border bg-popover p-2 text-popover-foreground shadow-lg"
        >
          <form onSubmit={onSubmit} className="space-y-2">
            <div className="text-xs font-medium">Sửa giờ ca</div>
            <div className="flex items-center gap-1">
              <Input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="h-7 px-1.5 text-xs"
                aria-label="Giờ bắt đầu"
              />
              <span className="text-xs text-muted-foreground">–</span>
              <Input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="h-7 px-1.5 text-xs"
                aria-label="Giờ kết thúc"
              />
            </div>
            <div className="flex justify-end gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Huỷ
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={pending}
              >
                {pending ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  "Lưu"
                )}
              </Button>
            </div>
          </form>
        </div>
      )}
    </span>
  );
}
