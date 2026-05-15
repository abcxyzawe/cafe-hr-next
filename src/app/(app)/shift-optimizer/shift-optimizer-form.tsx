"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarDays,
  Loader2,
  RefreshCw,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { generateShiftPlanAction } from "./generate-action";
import {
  INITIAL_SHIFT_OPTIMIZER_STATE,
  NOTES_MAX,
  TRAFFIC_OPTIONS,
  isMondayIso,
  isValidIsoDate,
  roleLabel,
  type ShiftOptimizerActionState,
  type ShiftOptimizerEmployee,
  type ShiftOptimizerEmployeeGroup,
  type ShiftOptimizerFormValues,
  type ShiftTraffic,
} from "./types";

type ShiftOptimizerFormProps = {
  employees: ShiftOptimizerEmployeeGroup[];
};

const TEXTAREA_CLASS =
  "flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50";

const SLOT_ICON: Record<"Sáng" | "Chiều" | "Tối", React.ReactNode> = {
  "Sáng": <Sunrise className="size-4" />,
  "Chiều": <Sun className="size-4" />,
  "Tối": <Sunset className="size-4" />,
};

const SLOT_TONE: Record<"Sáng" | "Chiều" | "Tối", string> = {
  "Sáng":
    "border-amber-200/70 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/30",
  "Chiều":
    "border-sky-200/70 bg-sky-50/60 dark:border-sky-900/60 dark:bg-sky-950/30",
  "Tối":
    "border-violet-200/70 bg-violet-50/60 dark:border-violet-900/60 dark:bg-violet-950/30",
};

async function actionAdapter(
  _prev: ShiftOptimizerActionState,
  formData: FormData,
): Promise<ShiftOptimizerActionState> {
  const values: ShiftOptimizerFormValues = {
    weekStart: String(formData.get("weekStart") ?? ""),
    traffic: (() => {
      const t = String(formData.get("traffic") ?? "medium");
      return t === "low" || t === "high" ? t : "medium";
    })(),
    notes: String(formData.get("notes") ?? ""),
  };
  const res = await generateShiftPlanAction(formData);
  if (res.ok) {
    return {
      values,
      result: res.data,
      error: null,
      generatedAt: Date.now(),
    };
  }
  return {
    values,
    result: null,
    error: res.error,
    generatedAt: null,
  };
}

export function ShiftOptimizerForm({ employees }: ShiftOptimizerFormProps) {
  const [state, formAction, pending] = useActionState<
    ShiftOptimizerActionState,
    FormData
  >(actionAdapter, INITIAL_SHIFT_OPTIMIZER_STATE);

  const [weekStart, setWeekStart] = useState<string>(
    INITIAL_SHIFT_OPTIMIZER_STATE.values.weekStart,
  );
  const [traffic, setTraffic] = useState<ShiftTraffic>(
    INITIAL_SHIFT_OPTIMIZER_STATE.values.traffic,
  );
  const [notes, setNotes] = useState<string>(
    INITIAL_SHIFT_OPTIMIZER_STATE.values.notes,
  );
  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (state.result !== null) {
      setWeekStart(state.values.weekStart);
      setTraffic(state.values.traffic);
      setNotes(state.values.notes);
    }
  }, [state.result, state.values]);

  useEffect(() => {
    if (state.error && state.error !== lastErrorRef.current) {
      lastErrorRef.current = state.error;
      toast.error(state.error);
    }
    if (!state.error) {
      lastErrorRef.current = null;
    }
  }, [state.error]);

  const employeeIndex = useMemo(() => {
    const map = new Map<number, ShiftOptimizerEmployee>();
    for (const group of employees) {
      for (const m of group.members) {
        map.set(m.id, m);
      }
    }
    return map;
  }, [employees]);

  const totalEmployees = employeeIndex.size;
  const weekStartValid = isValidIsoDate(weekStart) && isMondayIso(weekStart);
  const notesLen = notes.trim().length;
  const notesValid = notesLen <= NOTES_MAX;
  const formValid = weekStartValid && notesValid && totalEmployees > 0;

  const result = state.result;
  const hasResult = result !== null;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-card/50 p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="size-4" />
          </span>
          <h3 className="text-sm font-semibold">
            Đội ngũ hiện có ({totalEmployees} nhân viên)
          </h3>
        </div>
        {employees.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Chưa có nhân viên nào trong hệ thống. Hãy thêm nhân viên trước
            khi xếp ca.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {employees.map((group) => (
              <div
                key={group.role}
                className="rounded-xl border border-dashed bg-background/60 p-3"
              >
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.roleLabel} · {group.members.length}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {group.members.map((m) => (
                    <Badge
                      key={m.id}
                      variant="secondary"
                      className="font-normal"
                    >
                      {m.name}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <form action={formAction} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="so-week" className="text-sm font-medium">
              Tuần mục tiêu (Thứ 2){" "}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="so-week"
              name="weekStart"
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              disabled={pending}
              required
            />
            <p className="text-[11px] text-muted-foreground">
              Chọn một ngày Thứ 2. Tuần sẽ kéo dài 7 ngày đến Chủ nhật.
              {weekStartValid ? null : (
                <span className="ml-1 text-destructive">
                  Vui lòng chọn đúng ngày Thứ 2 (YYYY-MM-DD).
                </span>
              )}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="so-traffic" className="text-sm font-medium">
              Lưu lượng khách dự kiến{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Select
              id="so-traffic"
              name="traffic"
              value={traffic}
              onChange={(e) => setTraffic(e.target.value as ShiftTraffic)}
              disabled={pending}
              required
            >
              {TRAFFIC_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} — {opt.hint}
                </option>
              ))}
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Lưu lượng càng cao, mỗi ca sẽ được đề xuất nhiều nhân viên hơn.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="so-notes" className="text-sm font-medium">
            Ghi chú (tuỳ chọn)
          </Label>
          <textarea
            id="so-notes"
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ví dụ: Thứ 7 có sự kiện workshop, cần thêm 1 server. Nhân viên A xin nghỉ Thứ 3..."
            disabled={pending}
            maxLength={NOTES_MAX}
            rows={3}
            className={TEXTAREA_CLASS}
          />
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {notesLen}/{NOTES_MAX} ký tự
          </p>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button type="submit" disabled={pending || !formValid}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : hasResult ? (
              <RefreshCw className="size-4" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {pending
              ? "Đang tối ưu..."
              : hasResult
                ? "Tối ưu lại tuần"
                : "Tạo lịch ca với AI"}
          </Button>
        </div>
      </form>

      {pending && !hasResult ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang phân bổ nhân viên cho 7 ngày × 3 ca...
        </div>
      ) : null}

      {hasResult && result ? (
        <section className="space-y-4">
          <div className="rounded-2xl border bg-card/60 p-4 shadow-sm sm:p-5">
            <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="size-3" />
              Tổng quan tuần
            </div>
            <p className="text-sm leading-relaxed text-foreground">
              {result.summary}
            </p>
            {result.warnings.length > 0 ? (
              <ul className="mt-3 space-y-1.5">
                {result.warnings.map((w, i) => (
                  <li
                    key={`warn-${i}`}
                    className="flex items-start gap-2 rounded-md border border-amber-200/60 bg-amber-50/60 px-2.5 py-1.5 text-[13px] leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
                  >
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {result.days.map((day) => (
              <article
                key={`${day.date}-${day.weekdayLabel}`}
                className="space-y-3 rounded-2xl border bg-card/60 p-3 shadow-sm sm:p-4"
              >
                <header className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <CalendarDays className="size-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold leading-tight">
                      {day.weekdayLabel}
                    </h3>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {day.date}
                    </p>
                  </div>
                </header>

                <div className="space-y-2">
                  {day.slots.map((slot) => (
                    <div
                      key={`${day.date}-${slot.name}`}
                      className={`space-y-2 rounded-xl border p-2.5 shadow-sm ${SLOT_TONE[slot.name]}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-1.5 text-[12px] font-semibold">
                          {SLOT_ICON[slot.name]}
                          Ca {slot.name}
                        </div>
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {slot.suggestedEmployeeIds.length} người
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {slot.suggestedEmployeeIds.length === 0 ? (
                          <span className="text-[12px] italic text-muted-foreground">
                            Chưa phân bổ
                          </span>
                        ) : (
                          slot.suggestedEmployeeIds.map((id) => {
                            const emp = employeeIndex.get(id);
                            if (!emp) {
                              return (
                                <Badge
                                  key={`${day.date}-${slot.name}-${id}`}
                                  variant="outline"
                                  className="font-normal"
                                >
                                  #{id}
                                </Badge>
                              );
                            }
                            return (
                              <Badge
                                key={`${day.date}-${slot.name}-${id}`}
                                variant="secondary"
                                className="font-normal"
                                title={roleLabel(emp.role)}
                              >
                                {emp.name}
                              </Badge>
                            );
                          })
                        )}
                      </div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Trọng tâm: {slot.focus}
                      </p>
                      <p className="text-[12px] leading-relaxed text-foreground/90">
                        {slot.reasoning}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
