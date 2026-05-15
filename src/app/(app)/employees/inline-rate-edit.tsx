"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Check, X } from "lucide-react";
import { updateHourlyRate } from "./actions";
import { formatVND, cn } from "@/lib/utils";

export function InlineRateEdit({
  id,
  initialRate,
  canEdit,
}: {
  id: number;
  initialRate: number;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(initialRate));
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function save() {
    const num = Number(value.replace(/[,\s]/g, ""));
    if (!Number.isFinite(num) || num < 0) {
      toast.error("Lương không hợp lệ");
      return;
    }
    if (num === initialRate) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const res = await updateHourlyRate(id, num);
      if (res.ok) {
        toast.success("Đã cập nhật lương");
        setEditing(false);
      } else {
        toast.error(res.error || "Không cập nhật được");
      }
    });
  }

  if (!canEdit) {
    return <span className="font-medium">{formatVND(initialRate)}</span>;
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="group/edit inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-medium transition-colors hover:bg-accent"
        title="Click để sửa"
      >
        <span>{formatVND(initialRate)}</span>
        <Pencil className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover/edit:opacity-100" />
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      <input
        ref={inputRef}
        type="number"
        min={0}
        step={1000}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          else if (e.key === "Escape") {
            setValue(String(initialRate));
            setEditing(false);
          }
        }}
        onBlur={() => {
          // Defer to allow click on confirm button
          setTimeout(() => {
            if (document.activeElement?.tagName !== "BUTTON") save();
          }, 100);
        }}
        disabled={pending}
        className={cn(
          "h-7 w-24 rounded-md border border-input bg-background px-2 text-right text-sm tabular-nums shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          pending && "opacity-50",
        )}
      />
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={save}
        disabled={pending}
        className="rounded-md p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
        title="Lưu (Enter)"
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          setValue(String(initialRate));
          setEditing(false);
        }}
        disabled={pending}
        className="rounded-md p-1 text-muted-foreground hover:bg-accent"
        title="Huỷ (Esc)"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
