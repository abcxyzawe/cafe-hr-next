"use client";

import * as React from "react";
import { Pencil, Target, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  STORAGE_KEY,
  getGoal,
  removeGoal,
  saveGoal,
} from "@/lib/hours-goal";
import { cn } from "@/lib/utils";

type HoursGoalTrackerProps = {
  employeeId: number;
  currentHours: number;
  editable: boolean;
  compact?: boolean;
};

function clampPercent(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function barColor(percent: number): string {
  if (percent >= 90) return "bg-emerald-500";
  if (percent >= 50) return "bg-amber-500";
  return "bg-rose-500";
}

function textColor(percent: number): string {
  if (percent >= 90) return "text-emerald-600 dark:text-emerald-400";
  if (percent >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

export function HoursGoalTracker({
  employeeId,
  currentHours,
  editable,
  compact = false,
}: HoursGoalTrackerProps): React.ReactElement | null {
  const [goal, setGoal] = React.useState<number | null>(null);
  const [editing, setEditing] = React.useState<boolean>(false);
  const [draft, setDraft] = React.useState<string>("");
  const [hydrated, setHydrated] = React.useState<boolean>(false);

  React.useEffect(() => {
    setGoal(getGoal(employeeId));
    setHydrated(true);
  }, [employeeId]);

  React.useEffect(() => {
    function onStorage(e: StorageEvent): void {
      if (e.key !== STORAGE_KEY && e.key !== null) return;
      setGoal(getGoal(employeeId));
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [employeeId]);

  function startEdit(): void {
    setDraft(goal != null ? String(goal) : "");
    setEditing(true);
  }

  function cancelEdit(): void {
    setEditing(false);
    setDraft("");
  }

  function commitEdit(): void {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Mục tiêu phải là số giờ lớn hơn 0");
      return;
    }
    if (parsed > 1000) {
      toast.error("Mục tiêu giờ tháng quá lớn (tối đa 1000)");
      return;
    }
    saveGoal(employeeId, parsed);
    setGoal(parsed);
    setEditing(false);
    setDraft("");
    toast.success(`Đã đặt mục tiêu ${parsed}h cho tháng này`);
  }

  function clearGoal(): void {
    removeGoal(employeeId);
    setGoal(null);
    setEditing(false);
    setDraft("");
    toast.success("Đã xoá mục tiêu giờ tháng");
  }

  if (!hydrated) {
    // Avoid SSR/CSR mismatch — render nothing until we read localStorage
    return null;
  }

  if (editing) {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-md border bg-card/50 p-2",
          compact ? "text-xs" : "text-sm",
        )}
      >
        <Target className="size-4 text-muted-foreground" />
        <span className="text-muted-foreground">Mục tiêu giờ tháng:</span>
        <Input
          type="number"
          inputMode="decimal"
          min="1"
          step="1"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitEdit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancelEdit();
            }
          }}
          className="h-8 w-24"
          autoFocus
          aria-label="Mục tiêu giờ tháng"
        />
        <span className="text-muted-foreground">giờ</span>
        <div className="ml-auto flex items-center gap-1">
          <Button size="sm" variant="default" onClick={commitEdit}>
            <Check className="size-4" /> Lưu
          </Button>
          <Button size="sm" variant="ghost" onClick={cancelEdit}>
            <X className="size-4" /> Huỷ
          </Button>
          {goal != null && (
            <Button
              size="sm"
              variant="ghost"
              onClick={clearGoal}
              className="text-rose-600 hover:text-rose-700"
              aria-label="Xoá mục tiêu"
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (goal == null) {
    if (!editable) {
      if (compact) {
        return (
          <p className="text-xs text-muted-foreground">
            Chưa đặt mục tiêu giờ tháng
          </p>
        );
      }
      return null;
    }
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={startEdit}
        className="gap-1"
      >
        <Target className="size-4" /> Đặt mục tiêu giờ tháng
      </Button>
    );
  }

  const safeGoal = goal > 0 ? goal : 1;
  const rawPercent = (currentHours / safeGoal) * 100;
  const percent = clampPercent(rawPercent);
  const percentLabel = Math.round(rawPercent);
  const hoursLabel = Number.isInteger(currentHours)
    ? currentHours.toString()
    : currentHours.toFixed(1);

  return (
    <div
      className={cn(
        "space-y-1.5 rounded-md border bg-card/40 p-3",
        compact && "p-2",
      )}
    >
      <div className="flex items-center gap-2">
        <Target className="size-4 text-muted-foreground" />
        <span
          className={cn(
            "font-medium",
            compact ? "text-xs" : "text-sm",
          )}
        >
          Mục tiêu giờ tháng
        </span>
        <span
          className={cn(
            "ml-auto tabular-nums",
            compact ? "text-xs" : "text-sm",
            textColor(percent),
          )}
        >
          {hoursLabel}h / {goal}h{" "}
          <span className="text-muted-foreground">({percentLabel}%)</span>
        </span>
        {editable && (
          <Button
            size="icon"
            variant="ghost"
            onClick={startEdit}
            aria-label="Sửa mục tiêu"
            className="size-7"
          >
            <Pencil className="size-3.5" />
          </Button>
        )}
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={`Tiến độ ${percentLabel}%`}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            barColor(percent),
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
