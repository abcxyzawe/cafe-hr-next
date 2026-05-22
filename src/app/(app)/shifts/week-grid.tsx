"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Sunrise, Sun, Moon, PartyPopper, CalendarHeart, GripVertical, Trash2, X, Loader2, CheckCircle2 } from "lucide-react";
import { ROLE_LABELS, SHIFT_LABELS, cn } from "@/lib/utils";
import { getHoliday, type Holiday } from "@/lib/holidays";
import { DeleteShiftButton } from "./delete-shift-button";
import { InlineTimeEdit } from "./inline-time-edit";
import { moveShift, bulkDeleteShifts } from "./actions";

type Shift = {
  id: number;
  employeeId: number;
  shiftDate: Date;
  shiftType: "morning" | "afternoon" | "evening" | null;
  startTime: string | null;
  endTime: string | null;
};

type Employee = { id: number; name: string; role: string };

const ROLE_DOT: Record<string, string> = {
  barista: "bg-amber-500",
  server: "bg-sky-500",
  cashier: "bg-rose-500",
  manager: "bg-emerald-500",
};

const SHIFT_META: Array<{
  key: "morning" | "afternoon" | "evening";
  icon: React.ComponentType<{ className?: string }>;
  range: string;
  bg: string;
}> = [
  { key: "morning", icon: Sunrise, range: "07–12", bg: "bg-amber-50 dark:bg-amber-950/30" },
  { key: "afternoon", icon: Sun, range: "12–17", bg: "bg-orange-50 dark:bg-orange-950/30" },
  { key: "evening", icon: Moon, range: "17–22", bg: "bg-indigo-50 dark:bg-indigo-950/30" },
];

const WEEKDAY = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

type DragPayload = {
  shiftId: number;
  fromDateIso: string;
  fromType: "morning" | "afternoon" | "evening";
};

export function WeekGrid({
  weekStart,
  shifts: initialShifts,
  employees,
  holidays = [],
  isAdmin = false,
}: {
  weekStart: Date;
  shifts: Shift[];
  employees: Employee[];
  holidays?: Holiday[];
  isAdmin?: boolean;
}) {
  const empById = new Map(employees.map((e) => [e.id, e]));
  const holidayByIso = new Map(holidays.map((h) => [h.iso, h]));
  const [shifts, setShifts] = useState(initialShifts);
  const [dragging, setDragging] = useState<DragPayload | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkPending, startBulkTransition] = useTransition();

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function bulkDelete() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(`Xoá ${ids.length} ca đã chọn? Hành động không thể hoàn tác.`)) return;
    startBulkTransition(async () => {
      const res = await bulkDeleteShifts(ids);
      if (res.ok) {
        toast.success(`Đã xoá ${res.deleted} ca`);
        // Optimistic local removal
        setShifts((prev) => prev.filter((s) => !selected.has(s.id)));
        clearSelection();
      } else {
        toast.error(res.error || "Không xoá được");
      }
    });
  }

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const todayIso = new Date().toISOString().slice(0, 10);

  // bucket[dayIndex][shiftType] = shifts[]
  const buckets: Record<string, Shift[]> = {};
  for (const s of shifts) {
    const dayIso = new Date(s.shiftDate).toISOString().slice(0, 10);
    const key = `${dayIso}__${s.shiftType ?? "morning"}`;
    (buckets[key] ??= []).push(s);
  }

  // Conflict map: shiftId → number of OTHER shifts the same employee has on the same day.
  // A conflict means an employee has 2+ shifts on the same day across any types.
  const conflictById: Map<number, number> = new Map();
  const perDayPerEmployee: Map<string, Shift[]> = new Map();
  for (const s of shifts) {
    const dayIso = new Date(s.shiftDate).toISOString().slice(0, 10);
    const key = `${dayIso}__${s.employeeId}`;
    const list = perDayPerEmployee.get(key) ?? [];
    list.push(s);
    perDayPerEmployee.set(key, list);
  }
  for (const list of perDayPerEmployee.values()) {
    if (list.length >= 2) {
      for (const s of list) conflictById.set(s.id, list.length - 1);
    }
  }

  function onDragStart(e: React.DragEvent, shift: Shift) {
    const dayIso = new Date(shift.shiftDate).toISOString().slice(0, 10);
    const payload: DragPayload = {
      shiftId: shift.id,
      fromDateIso: dayIso,
      fromType: shift.shiftType ?? "morning",
    };
    e.dataTransfer.setData("application/x-cafe-shift", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
    setDragging(payload);
  }

  function onDragEnd() {
    setDragging(null);
    setDragOver(null);
  }

  function onCellDragOver(e: React.DragEvent, key: string) {
    if (!dragging) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(key);
  }

  function onCellDrop(
    e: React.DragEvent,
    targetDateIso: string,
    targetType: "morning" | "afternoon" | "evening",
  ) {
    e.preventDefault();
    setDragOver(null);
    let payload: DragPayload | null = dragging;
    try {
      const raw = e.dataTransfer.getData("application/x-cafe-shift");
      if (raw) payload = JSON.parse(raw) as DragPayload;
    } catch {
      // use dragging state fallback
    }
    setDragging(null);
    if (!payload) return;
    if (
      payload.fromDateIso === targetDateIso &&
      payload.fromType === targetType
    ) {
      return; // dropped on same cell
    }

    // Optimistic update — move shift in local state
    setShifts((prev) =>
      prev.map((s) =>
        s.id === payload.shiftId
          ? {
              ...s,
              shiftDate: new Date(targetDateIso),
              shiftType: targetType,
            }
          : s,
      ),
    );

    startTransition(async () => {
      const res = await moveShift(payload.shiftId, targetDateIso, targetType);
      if (res.ok) {
        if (res.warning) {
          toast.warning(`Đã chuyển ca, nhưng: ${res.warning}`);
        } else {
          toast.success("Đã chuyển ca");
        }
      } else {
        // Revert optimistic
        setShifts(initialShifts);
        toast.error(res.error || "Không chuyển được");
      }
    });
  }

  return (
    <div className="-mx-2 overflow-x-auto sm:mx-0">
      {isAdmin && (
        <p className="mb-2 px-2 text-[11px] italic text-muted-foreground sm:px-0">
          💡 Mẹo: Shift+Click vào ca để chọn nhiều · kéo để chuyển ngày · click giờ để sửa
        </p>
      )}
      <div className="min-w-[640px] px-2 sm:min-w-[760px] sm:px-0">
        <div className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))] border-b sm:grid-cols-[80px_repeat(7,minmax(0,1fr))]">
          <div className="border-r p-2" />
          {days.map((d) => {
            const iso = d.toISOString().slice(0, 10);
            const localIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            const isToday = iso === todayIso;
            const holiday = getHoliday(d);
            const propHoliday = holidayByIso.get(localIso) ?? holidayByIso.get(iso) ?? null;
            const holidayName = propHoliday?.name ?? holiday?.name ?? null;
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            return (
              <div
                key={iso}
                className={cn(
                  "border-r p-2 text-center last:border-r-0",
                  isToday && "bg-primary/5",
                  (holiday || propHoliday) && "bg-rose-50 dark:bg-rose-950/30",
                )}
                title={holidayName ?? undefined}
              >
                <div
                  className={cn(
                    "text-xs uppercase tracking-wide",
                    isToday
                      ? "font-semibold text-primary"
                      : (holiday || propHoliday)
                        ? "font-semibold text-rose-600 dark:text-rose-400"
                        : isWeekend
                          ? "text-rose-500/70"
                          : "text-muted-foreground",
                  )}
                >
                  {WEEKDAY[d.getDay() === 0 ? 6 : d.getDay() - 1]}
                </div>
                <div
                  className={cn(
                    "text-sm font-semibold",
                    isToday && "text-primary",
                    (holiday || propHoliday) && !isToday && "text-rose-600 dark:text-rose-400",
                  )}
                >
                  {d.getDate()}/{d.getMonth() + 1}
                </div>
                {propHoliday ? (
                  <div
                    className="mt-1 inline-flex max-w-full items-center gap-0.5 rounded bg-rose-500/10 px-1 py-0.5 text-[10px] font-medium text-rose-700 dark:text-rose-300"
                    title={propHoliday.name}
                  >
                    <CalendarHeart className="size-2.5 shrink-0" />
                    <span className="truncate">{propHoliday.name}</span>
                  </div>
                ) : holiday ? (
                  <div className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-medium text-rose-600 dark:text-rose-400">
                    <PartyPopper className="size-2.5" />
                    {holiday.short}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {SHIFT_META.map((meta) => {
          const Icon = meta.icon;
          return (
            <div
              key={meta.key}
              className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))] border-b last:border-b-0 sm:grid-cols-[80px_repeat(7,minmax(0,1fr))]"
            >
              <div
                className={cn(
                  "flex flex-col items-center justify-center gap-1 border-r p-2 text-center text-xs",
                  meta.bg,
                )}
              >
                <Icon className="size-4 text-muted-foreground" />
                <div className="font-medium">{SHIFT_LABELS[meta.key]}</div>
                <div className="text-muted-foreground">{meta.range}</div>
              </div>
              {days.map((d) => {
                const iso = d.toISOString().slice(0, 10);
                const localIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                const cellKey = `${iso}__${meta.key}`;
                const cellShifts = buckets[cellKey] ?? [];
                const isToday = iso === todayIso;
                const isHolidayCell =
                  holidayByIso.has(localIso) || holidayByIso.has(iso);
                const isDropTarget = !!dragging && dragOver === cellKey;
                const isDragSource =
                  !!dragging &&
                  dragging.fromDateIso === iso &&
                  dragging.fromType === meta.key;
                return (
                  <div
                    key={iso}
                    onDragOver={(e) => onCellDragOver(e, cellKey)}
                    onDragLeave={() => {
                      if (dragOver === cellKey) setDragOver(null);
                    }}
                    onDrop={(e) => onCellDrop(e, iso, meta.key)}
                    className={cn(
                      "min-h-[88px] space-y-1 border-r p-2 transition-colors last:border-r-0",
                      isToday ? "bg-primary/5" : meta.bg,
                      isHolidayCell && !isToday && "bg-rose-500/5",
                      isDropTarget &&
                        !isDragSource &&
                        "bg-primary/15 ring-2 ring-inset ring-primary",
                      isDragSource && "opacity-50",
                    )}
                  >
                    {cellShifts.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground/50">
                        {isDropTarget && !isDragSource ? "Thả vào đây" : "—"}
                      </div>
                    ) : (
                      cellShifts.map((s) => {
                        const emp = empById.get(s.employeeId);
                        const isSelected = selected.has(s.id);
                        const conflictCount = conflictById.get(s.id) ?? 0;
                        const hasConflict = conflictCount > 0;
                        return (
                          <div
                            key={s.id}
                            draggable
                            onDragStart={(e) => onDragStart(e, s)}
                            onDragEnd={onDragEnd}
                            onClick={(e) => {
                              if (!isAdmin) return;
                              if (e.shiftKey || selected.size > 0) {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleSelect(s.id);
                              }
                            }}
                            className={cn(
                              "group relative rounded-md border bg-card px-1.5 py-1 text-xs shadow-sm transition-shadow",
                              "cursor-grab active:cursor-grabbing hover:shadow-md",
                              dragging?.shiftId === s.id && "opacity-40",
                              isSelected &&
                                "border-primary ring-2 ring-primary/40 bg-primary/5",
                              hasConflict &&
                                !isSelected &&
                                "border-rose-400 ring-2 ring-rose-400/40 bg-rose-500/5",
                            )}
                            title={
                              hasConflict
                                ? `⚠️ Trùng ${conflictCount} ca khác cùng ngày của ${emp?.name ?? "nhân viên này"}`
                                : isAdmin
                                  ? "Kéo để chuyển · Shift+Click để chọn nhiều"
                                  : "Kéo để chuyển ca sang ngày/loại khác"
                            }
                          >
                            {isSelected && (
                              <CheckCircle2
                                className="absolute -right-1.5 -top-1.5 size-4 rounded-full bg-background text-primary"
                                aria-hidden
                              />
                            )}
                            {hasConflict && !isSelected && (
                              <span
                                className="absolute -right-1.5 -top-1.5 inline-flex size-4 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white shadow"
                                aria-label={`Trùng ${conflictCount} ca`}
                                title={`Trùng ${conflictCount} ca khác cùng ngày`}
                              >
                                ⚠
                              </span>
                            )}
                            <div className="flex items-center gap-1">
                              <GripVertical className="size-3 shrink-0 text-muted-foreground/40" />
                              <span
                                className={cn(
                                  "size-2 shrink-0 rounded-full",
                                  ROLE_DOT[emp?.role ?? ""] ?? "bg-slate-400",
                                )}
                              />
                              <span className="min-w-0 flex-1 truncate font-medium">
                                {emp?.name ?? `#${s.employeeId}`}
                              </span>
                              <span className="opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                                <DeleteShiftButton
                                  id={s.id}
                                  onDeleted={(id) =>
                                    setShifts((prev) =>
                                      prev.filter((x) => x.id !== id),
                                    )
                                  }
                                />
                              </span>
                            </div>
                            <div className="pl-4">
                              <InlineTimeEdit
                                id={s.id}
                                startTime={s.startTime}
                                endTime={s.endTime}
                                editable={isAdmin}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="font-medium">Vai trò:</span>
        {Object.entries(ROLE_DOT).map(([role, dot]) => (
          <div key={role} className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", dot)} />
            <span>{ROLE_LABELS[role]}</span>
          </div>
        ))}
        <span className="ml-auto inline-flex items-center gap-1.5 text-muted-foreground/70">
          <GripVertical className="size-3" />
          Kéo thẻ ca để chuyển sang ngày/loại khác
        </span>
      </div>

      {/* Floating bulk-action bar */}
      {isAdmin && selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 lg:bottom-6">
          <div className="flex flex-wrap items-center gap-2 rounded-full border bg-card/95 px-4 py-2 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-2 pr-2 text-sm">
              <CheckCircle2 className="size-4 text-primary" />
              <span className="font-medium">{selected.size} ca đã chọn</span>
            </div>
            <div className="h-5 w-px bg-border" />
            <button
              type="button"
              onClick={bulkDelete}
              disabled={bulkPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              {bulkPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Xoá ({selected.size})
            </button>
            <button
              type="button"
              onClick={clearSelection}
              title="Bỏ chọn"
              aria-label="Bỏ chọn"
              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
