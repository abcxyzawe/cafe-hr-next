"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  ClipboardCopy,
  Download,
  Loader2,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { generateShiftTemplateAction } from "./generate-action";
import {
  INITIAL_SHIFT_TEMPLATE_STATE,
  SHIFT_TEMPLATE_ROLES,
  SHIFT_TEMPLATE_SHIFT_OPTS,
  SHIFT_TEMPLATE_WEEKDAY_FULL,
  shiftTemplateRoleLabel,
  shiftTemplateShiftLabel,
  targetsFieldName,
  type ShiftTemplateEmployee,
  type ShiftTemplateRoleKey,
  type ShiftTemplateState,
  type ShiftTemplateTargets,
} from "./shift-template-types";
import type { ShiftTemplateDay, ShiftTemplateShiftKey } from "@/lib/xai";

type Props = {
  employees: ShiftTemplateEmployee[];
};

function buildMarkdown(
  template: ShiftTemplateDay[],
  empMap: Map<number, ShiftTemplateEmployee>,
  generatedAt: number | null,
): string {
  const lines: string[] = [];
  lines.push("# Mẫu lịch tuần (AI đề xuất)");
  lines.push("");
  if (generatedAt) {
    const d = new Date(generatedAt);
    lines.push(`- Tạo lúc: ${d.toLocaleString("vi-VN")}`);
    lines.push("");
  }
  lines.push("| Ngày | Sáng | Chiều | Tối |");
  lines.push("|---|---|---|---|");
  for (const day of template) {
    const cells: string[] = [];
    cells.push(`${SHIFT_TEMPLATE_WEEKDAY_FULL[day.weekday]} (${day.weekday})`);
    for (const shift of SHIFT_TEMPLATE_SHIFT_OPTS) {
      const ids = day.shifts[shift.value];
      if (ids.length === 0) {
        cells.push("—");
      } else {
        const names = ids
          .map((id) => empMap.get(id)?.name ?? `#${id}`)
          .join(", ");
        cells.push(names);
      }
    }
    lines.push(`| ${cells.join(" | ")} |`);
  }
  lines.push("");
  lines.push("## Tổng số ngày làm trong tuần");
  lines.push("");
  const counts = new Map<number, number>();
  for (const day of template) {
    for (const shift of SHIFT_TEMPLATE_SHIFT_OPTS) {
      for (const id of day.shifts[shift.value]) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
  }
  for (const [id, count] of counts) {
    const emp = empMap.get(id);
    const label = emp
      ? `${emp.name} — ${shiftTemplateRoleLabel(emp.role)}`
      : `#${id}`;
    lines.push(`- ${label}: ${count} ngày`);
  }
  return lines.join("\n");
}

function downloadMarkdown(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ShiftTemplateForm({ employees }: Props) {
  const [state, formAction, pending] = useActionState<
    ShiftTemplateState,
    FormData
  >(generateShiftTemplateAction, INITIAL_SHIFT_TEMPLATE_STATE);

  const [targets, setTargets] = useState<ShiftTemplateTargets>(
    INITIAL_SHIFT_TEMPLATE_STATE.targets,
  );
  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (state.template !== null) {
      setTargets(state.targets);
    }
  }, [state.template, state.targets]);

  useEffect(() => {
    if (state.error && state.error !== lastErrorRef.current) {
      lastErrorRef.current = state.error;
      toast.error(state.error);
    }
    if (!state.error) {
      lastErrorRef.current = null;
    }
  }, [state.error]);

  const empMap = useMemo<Map<number, ShiftTemplateEmployee>>(() => {
    const m = new Map<number, ShiftTemplateEmployee>();
    for (const e of employees) m.set(e.id, e);
    return m;
  }, [employees]);

  const employeesByRole = useMemo<Record<ShiftTemplateRoleKey, number>>(() => {
    const acc: Record<ShiftTemplateRoleKey, number> = {
      barista: 0,
      server: 0,
      cashier: 0,
      manager: 0,
    };
    for (const e of employees) {
      if (
        e.role === "barista" ||
        e.role === "server" ||
        e.role === "cashier" ||
        e.role === "manager"
      ) {
        acc[e.role] += 1;
      }
    }
    return acc;
  }, [employees]);

  const template = state.template;
  const hasResults = template !== null && template.length > 0;

  const dayCounts = useMemo<Map<number, number>>(() => {
    const counts = new Map<number, number>();
    if (!template) return counts;
    for (const day of template) {
      const seen = new Set<number>();
      for (const shift of SHIFT_TEMPLATE_SHIFT_OPTS) {
        for (const id of day.shifts[shift.value]) {
          if (!seen.has(id)) {
            seen.add(id);
            counts.set(id, (counts.get(id) ?? 0) + 1);
          }
        }
      }
    }
    return counts;
  }, [template]);

  const handleCopy = useCallback(async () => {
    if (!template) return;
    const md = buildMarkdown(template, empMap, state.generatedAt);
    try {
      await navigator.clipboard.writeText(md);
      toast.success("Đã sao chép lịch tuần");
    } catch {
      toast.error("Không sao chép được. Vui lòng thử lại.");
    }
  }, [template, empMap, state.generatedAt]);

  const handleDownload = useCallback(() => {
    if (!template) return;
    const md = buildMarkdown(template, empMap, state.generatedAt);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadMarkdown(`mau-lich-tuan-${stamp}.md`, md);
    toast.success("Đã tải file Markdown");
  }, [template, empMap, state.generatedAt]);

  const updateTarget = useCallback(
    (
      shift: ShiftTemplateShiftKey,
      role: ShiftTemplateRoleKey,
      raw: string,
    ) => {
      const n = Math.max(0, Math.min(10, Math.floor(Number(raw) || 0)));
      setTargets((prev) => ({
        ...prev,
        [shift]: { ...prev[shift], [role]: n },
      }));
    },
    [],
  );

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-5">
        <div className="rounded-lg border bg-card/50 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <Label className="text-sm font-medium">
              Mục tiêu nhân sự cho từng ca (theo vai trò)
            </Label>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Users className="size-3" />
              Tổng nhân viên: {employees.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-2 py-2 text-left font-medium text-muted-foreground">
                    Vai trò
                  </th>
                  {SHIFT_TEMPLATE_SHIFT_OPTS.map((s) => (
                    <th
                      key={s.value}
                      className="px-2 py-2 text-left font-medium text-muted-foreground"
                    >
                      Ca {s.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SHIFT_TEMPLATE_ROLES.map((role) => {
                  const have = employeesByRole[role.value];
                  return (
                    <tr key={role.value} className="border-b last:border-b-0">
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{role.label}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {have} người
                          </Badge>
                        </div>
                      </td>
                      {SHIFT_TEMPLATE_SHIFT_OPTS.map((shift) => {
                        const fieldId = targetsFieldName(
                          shift.value,
                          role.value,
                        );
                        return (
                          <td key={shift.value} className="px-2 py-2">
                            <Input
                              id={fieldId}
                              name={fieldId}
                              type="number"
                              min={0}
                              max={10}
                              step={1}
                              inputMode="numeric"
                              value={String(
                                targets[shift.value][role.value],
                              )}
                              onChange={(e) =>
                                updateTarget(
                                  shift.value,
                                  role.value,
                                  e.target.value,
                                )
                              }
                              disabled={pending}
                              className="h-9 w-20"
                              aria-label={`Số ${role.label} ca ${shift.label}`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {hasResults ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleCopy}
                disabled={pending}
              >
                <ClipboardCopy className="size-4" />
                Sao chép
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleDownload}
                disabled={pending}
              >
                <Download className="size-4" />
                Tải markdown
              </Button>
            </>
          ) : null}
          <Button type="submit" disabled={pending || employees.length === 0}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : hasResults ? (
              <RefreshCw className="size-4" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {pending
              ? "Đang lập lịch..."
              : hasResults
                ? "Tạo lại lịch tuần"
                : "Tạo lịch tuần"}
          </Button>
        </div>
      </form>

      {pending && !hasResults ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang lập lịch tuần dựa trên mục tiêu của bạn...
        </div>
      ) : null}

      {hasResults && template ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <CalendarDays className="size-3" />
              Lịch tuần đề xuất
            </div>
            {state.generatedAt ? (
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {new Date(state.generatedAt).toLocaleString("vi-VN")}
              </span>
            ) : null}
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Ngày
                  </th>
                  {SHIFT_TEMPLATE_SHIFT_OPTS.map((s) => (
                    <th
                      key={s.value}
                      className="px-3 py-2 text-left font-medium text-muted-foreground"
                    >
                      Ca {s.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {template.map((day) => (
                  <tr
                    key={day.weekday}
                    className="border-b last:border-b-0 align-top"
                  >
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">
                          {SHIFT_TEMPLATE_WEEKDAY_FULL[day.weekday]}
                        </span>
                        <span className="font-semibold">{day.weekday}</span>
                      </div>
                    </td>
                    {SHIFT_TEMPLATE_SHIFT_OPTS.map((shift) => {
                      const ids = day.shifts[shift.value];
                      return (
                        <td
                          key={shift.value}
                          className="px-3 py-2.5"
                        >
                          <div className="mb-1 flex items-center gap-1.5">
                            <Badge
                              variant="secondary"
                              className="text-[10px]"
                            >
                              {ids.length} người
                            </Badge>
                          </div>
                          {ids.length === 0 ? (
                            <span className="text-xs italic text-muted-foreground">
                              (trống)
                            </span>
                          ) : (
                            <ul className="space-y-0.5">
                              {ids.map((id) => {
                                const emp = empMap.get(id);
                                return (
                                  <li
                                    key={id}
                                    className="text-sm leading-snug"
                                  >
                                    <span className="font-medium">
                                      {emp?.name ?? `#${id}`}
                                    </span>
                                    <span className="ml-1 text-[11px] text-muted-foreground">
                                      ·{" "}
                                      {emp
                                        ? shiftTemplateRoleLabel(emp.role)
                                        : ""}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border bg-card/50 p-4">
            <h3 className="mb-3 text-sm font-semibold">
              Tổng số ngày làm trong tuần
            </h3>
            {dayCounts.size === 0 ? (
              <p className="text-sm text-muted-foreground">
                Chưa có nhân viên nào được xếp.
              </p>
            ) : (
              <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from(dayCounts.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([id, count]) => {
                    const emp = empMap.get(id);
                    return (
                      <li
                        key={id}
                        className="flex items-center justify-between gap-2 rounded-md border bg-background px-2.5 py-1.5 text-sm"
                      >
                        <span className="truncate">
                          <span className="font-medium">
                            {emp?.name ?? `#${id}`}
                          </span>
                          <span className="ml-1 text-[11px] text-muted-foreground">
                            ·{" "}
                            {emp
                              ? shiftTemplateRoleLabel(emp.role)
                              : ""}
                          </span>
                        </span>
                        <Badge
                          variant={count > 5 ? "destructive" : "secondary"}
                          className="text-[10px]"
                        >
                          {count} ngày
                        </Badge>
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>

          <div className="text-[11px] text-muted-foreground">
            Mục tiêu mỗi ca:{" "}
            {SHIFT_TEMPLATE_SHIFT_OPTS.map((s) => {
              const parts: string[] = [];
              for (const r of SHIFT_TEMPLATE_ROLES) {
                const n = state.targets[s.value][r.value];
                if (n > 0) parts.push(`${r.label} ${n}`);
              }
              return `${shiftTemplateShiftLabel(s.value)} (${
                parts.length === 0 ? "0" : parts.join(", ")
              })`;
            }).join(" · ")}
          </div>
        </section>
      ) : null}
    </div>
  );
}
