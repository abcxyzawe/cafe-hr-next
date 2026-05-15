"use client";

import { useMemo, useState } from "react";
import { Calculator, TrendingUp, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn, formatVND, formatHours } from "@/lib/utils";

type Row = {
  id: number;
  name: string;
  hours: number;
  hourlyRate: number;
  total_pay: number;
};

type Adjustment = {
  id: string;
  employeeId: number;
  extraHours: number;
};

export function WhatIfPayrollTool({ rows }: { rows: Row[] }) {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [pickedEmployeeId, setPickedEmployeeId] = useState<number | "">("");
  const [extraHours, setExtraHours] = useState<number>(8);

  const employeesById = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  const adjustedRows = useMemo(() => {
    const adjMap = new Map<number, number>();
    for (const a of adjustments) {
      adjMap.set(a.employeeId, (adjMap.get(a.employeeId) ?? 0) + a.extraHours);
    }
    return rows
      .map((r) => {
        const extra = adjMap.get(r.id) ?? 0;
        const newHours = Math.max(0, r.hours + extra);
        return {
          ...r,
          extraHours: extra,
          newHours,
          newPay: Math.round(newHours * r.hourlyRate),
          delta: Math.round(newHours * r.hourlyRate) - r.total_pay,
        };
      })
      .filter((r) => r.extraHours !== 0);
  }, [rows, adjustments]);

  const baselineTotal = rows.reduce((sum, r) => sum + r.total_pay, 0);
  const adjustedTotal = rows.reduce((sum, r) => {
    const adj = adjustedRows.find((a) => a.id === r.id);
    return sum + (adj?.newPay ?? r.total_pay);
  }, 0);
  const totalDelta = adjustedTotal - baselineTotal;

  function addAdjustment() {
    if (pickedEmployeeId === "" || !Number.isFinite(extraHours) || extraHours === 0)
      return;
    const empId = Number(pickedEmployeeId);
    if (!employeesById.has(empId)) return;
    setAdjustments((prev) => [
      ...prev,
      {
        id: `${empId}-${Date.now()}`,
        employeeId: empId,
        extraHours: Math.round(extraHours * 10) / 10,
      },
    ]);
    setExtraHours(8);
  }

  function removeAdjustment(id: string) {
    setAdjustments((prev) => prev.filter((a) => a.id !== id));
  }

  function reset() {
    setAdjustments([]);
  }

  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="size-5 text-primary" />
          Mô phỏng "Giả sử"
        </CardTitle>
        <CardDescription>
          Cộng/trừ giờ giả định cho nhân viên để xem tác động lên tổng lương kỳ
          này. Không lưu — chỉ là công cụ lập kế hoạch.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add adjustment row */}
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
          <div className="space-y-1">
            <Label htmlFor="whatif-emp">Nhân viên</Label>
            <Select
              id="whatif-emp"
              value={pickedEmployeeId}
              onChange={(e) =>
                setPickedEmployeeId(
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
            >
              <option value="">— Chọn —</option>
              {rows.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} (hiện {formatHours(r.hours)})
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="whatif-hours">Giờ ± (vd 8 hoặc -4)</Label>
            <Input
              id="whatif-hours"
              type="number"
              step={0.5}
              value={extraHours}
              onChange={(e) => setExtraHours(Number(e.target.value))}
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              onClick={addAdjustment}
              disabled={pickedEmployeeId === "" || !Number.isFinite(extraHours) || extraHours === 0}
            >
              <TrendingUp className="size-4" />
              Thêm
            </Button>
          </div>
        </div>

        {adjustments.length === 0 ? (
          <p className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
            Chưa có điều chỉnh nào — thêm vài thay đổi để xem tổng lương mới.
          </p>
        ) : (
          <div className="space-y-3">
            <ul className="space-y-1.5">
              {adjustedRows.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{r.name}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                      r.extraHours > 0
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-rose-500/15 text-rose-700 dark:text-rose-300",
                    )}
                  >
                    {r.extraHours > 0 ? "+" : ""}
                    {r.extraHours}h
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatHours(r.hours)} → {formatHours(r.newHours)}
                  </span>
                  <span className="ml-auto flex items-center gap-2 tabular-nums">
                    <span className="text-muted-foreground text-xs">
                      {formatVND(r.total_pay)} →
                    </span>
                    <span
                      className={cn(
                        "font-bold",
                        r.delta > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : r.delta < 0
                            ? "text-rose-600 dark:text-rose-400"
                            : "",
                      )}
                    >
                      {formatVND(r.newPay)}
                    </span>
                    {r.delta !== 0 && (
                      <Badge
                        variant={r.delta > 0 ? "success" : "destructive"}
                        className="text-[10px] tabular-nums"
                      >
                        {r.delta > 0 ? "+" : ""}
                        {formatVND(r.delta)}
                      </Badge>
                    )}
                  </span>
                  {/* Find the matching adjustment to remove (by employeeId+timestamp via the adjustments list) */}
                  <RemoveButton
                    adjustments={adjustments}
                    employeeId={r.id}
                    onRemove={removeAdjustment}
                  />
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border-2 border-primary/20 bg-primary/5 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Tổng lương sau điều chỉnh
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  {formatVND(adjustedTotal)}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  Hiện tại: {formatVND(baselineTotal)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Chênh lệch
                </p>
                <p
                  className={cn(
                    "text-2xl font-bold tabular-nums",
                    totalDelta > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : totalDelta < 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "",
                  )}
                >
                  {totalDelta > 0 ? "+" : ""}
                  {formatVND(totalDelta)}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={reset}
                  className="mt-1 h-6 px-2 text-xs"
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RemoveButton({
  adjustments,
  employeeId,
  onRemove,
}: {
  adjustments: Adjustment[];
  employeeId: number;
  onRemove: (id: string) => void;
}) {
  function removeAll() {
    for (const a of adjustments.filter((a) => a.employeeId === employeeId)) {
      onRemove(a.id);
    }
  }
  return (
    <button
      type="button"
      onClick={removeAll}
      title="Xoá điều chỉnh"
      aria-label="Xoá điều chỉnh"
      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-600"
    >
      <X className="size-3.5" />
    </button>
  );
}
