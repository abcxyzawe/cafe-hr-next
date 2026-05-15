"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { CheckCircle2, Loader2, X, BadgeCheck } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, formatVND, formatHours, cn } from "@/lib/utils";
import { bulkMarkPayrollPaid } from "./actions";
import {
  DEFAULT_DEDUCTION_CONFIG,
  STORAGE_KEY,
  computeDeductions,
  countEnabled,
  loadDeductionConfig,
  type DeductionConfig,
} from "@/lib/payroll-deductions";

export type PayrollRowVM = {
  payrollId: number | null;
  employeeId: number;
  name: string;
  role: string;
  hourlyRate: number;
  avatarUrl: string | null;
  totalHours: number;
  totalPay: number;
  paid: boolean;
};

export function PayrollBulkActions({
  rows,
  period,
  isAdmin,
}: {
  rows: PayrollRowVM[];
  period: string;
  isAdmin: boolean;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [pending, startTransition] = useTransition();
  const [deductionCfg, setDeductionCfg] = useState<DeductionConfig>(
    DEFAULT_DEDUCTION_CONFIG,
  );

  useEffect(() => {
    setDeductionCfg(loadDeductionConfig());
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      setDeductionCfg(loadDeductionConfig());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const enabledCount = countEnabled(deductionCfg);
  const showDeductions = enabledCount > 0;

  const selectableIds = useMemo(
    () =>
      rows
        .filter((r) => r.payrollId !== null && !r.paid)
        .map((r) => r.payrollId as number),
    [rows],
  );

  const allSelected =
    selectableIds.length > 0 && selected.size === selectableIds.length;
  const someSelected = selected.size > 0 && !allSelected;

  const selectionTotal = useMemo(() => {
    let sum = 0;
    for (const r of rows) {
      if (r.payrollId !== null && selected.has(r.payrollId)) {
        sum += r.totalPay;
      }
    }
    return sum;
  }, [rows, selected]);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === selectableIds.length ? new Set() : new Set(selectableIds),
    );
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function bulkMarkPaid() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const ok = window.confirm(
      `Đánh dấu ${ids.length} kỳ lương đã trả?\nTổng cộng: ${formatVND(selectionTotal)}\n\nHành động này sẽ ghi nhận vào lịch sử hoạt động.`,
    );
    if (!ok) return;

    startTransition(async () => {
      const res = await bulkMarkPayrollPaid(ids);
      if (res.ok) {
        toast.success(
          `Đã đánh dấu ${res.marked} kỳ lương · ${formatVND(res.totalAmount)}`,
        );
        clearSelection();
      } else {
        toast.error(res.error || "Không thể đánh dấu");
      }
    });
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <div className="relative size-40 overflow-hidden rounded-lg opacity-90">
          <Image
            src="/assets/empty-payroll.jpg"
            alt=""
            fill
            className="object-cover"
          />
        </div>
        <p className="text-sm text-muted-foreground">Kỳ này chưa có dữ liệu lương</p>
      </div>
    );
  }

  return (
    <>
      {showDeductions && (
        <div className="flex items-center gap-2 border-b bg-rose-50/40 px-6 py-2 text-xs text-rose-700 dark:bg-rose-950/20 dark:text-rose-300">
          <span className="inline-flex size-1.5 rounded-full bg-rose-500" />
          Đang áp dụng {enabledCount} khoản khấu trừ
          {deductionCfg.bhxhEnabled && ` · BHXH ${deductionCfg.bhxhPct}%`}
          {deductionCfg.bhytEnabled && ` · BHYT ${deductionCfg.bhytPct}%`}
          {deductionCfg.bhtnEnabled && ` · BHTN ${deductionCfg.bhtnPct}%`}
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            {isAdmin && (
              <TableHead className="w-[40px]">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  disabled={selectableIds.length === 0}
                  aria-label="Chọn tất cả"
                  className="size-4 cursor-pointer rounded border-input accent-primary disabled:cursor-not-allowed disabled:opacity-50"
                />
              </TableHead>
            )}
            <TableHead>Nhân viên</TableHead>
            <TableHead>Vai trò</TableHead>
            <TableHead className="text-right">Lương/giờ</TableHead>
            <TableHead className="text-right">Số giờ</TableHead>
            <TableHead className="text-right">
              {showDeductions ? "Lương gộp" : "Thực lĩnh"}
            </TableHead>
            {showDeductions && deductionCfg.bhxhEnabled && (
              <TableHead className="text-right">BHXH</TableHead>
            )}
            {showDeductions && deductionCfg.bhytEnabled && (
              <TableHead className="text-right">BHYT</TableHead>
            )}
            {showDeductions && deductionCfg.bhtnEnabled && (
              <TableHead className="text-right">BHTN</TableHead>
            )}
            {showDeductions && (
              <TableHead className="text-right">Net</TableHead>
            )}
            <TableHead className="w-[100px]">Trạng thái</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const isSelected =
              r.payrollId !== null && selected.has(r.payrollId);
            const canSelect = isAdmin && r.payrollId !== null && !r.paid;
            const ded = computeDeductions(r.totalPay, deductionCfg);
            return (
              <TableRow
                key={r.employeeId}
                data-state={isSelected ? "selected" : undefined}
                className={cn(isSelected && "bg-primary/5")}
              >
                {isAdmin && (
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={!canSelect}
                      onChange={() => {
                        if (r.payrollId !== null) toggle(r.payrollId);
                      }}
                      aria-label={`Chọn ${r.name}`}
                      className="size-4 cursor-pointer rounded border-input accent-primary disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </TableCell>
                )}
                <TableCell>
                  <Link
                    href={`/payroll/${period}/employee/${r.employeeId}`}
                    className="-mx-2 inline-flex items-center gap-3 rounded-md px-2 py-1 transition-colors hover:bg-accent"
                  >
                    <Avatar
                      src={r.avatarUrl}
                      alt={r.name}
                      fallback={r.name}
                      size={36}
                    />
                    <span className="font-medium hover:underline">{r.name}</span>
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {ROLE_LABELS[r.role] ?? r.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-sm">
                  {formatVND(r.hourlyRate)}
                </TableCell>
                <TableCell className="text-right">
                  {formatHours(r.totalHours)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right",
                    showDeductions
                      ? "text-sm text-muted-foreground"
                      : "font-semibold text-primary",
                  )}
                >
                  {formatVND(r.totalPay)}
                </TableCell>
                {showDeductions && deductionCfg.bhxhEnabled && (
                  <TableCell className="text-right">
                    <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                      −{formatVND(ded.bhxh)}
                      <span className="opacity-70">
                        {deductionCfg.bhxhPct}%
                      </span>
                    </span>
                  </TableCell>
                )}
                {showDeductions && deductionCfg.bhytEnabled && (
                  <TableCell className="text-right">
                    <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                      −{formatVND(ded.bhyt)}
                      <span className="opacity-70">
                        {deductionCfg.bhytPct}%
                      </span>
                    </span>
                  </TableCell>
                )}
                {showDeductions && deductionCfg.bhtnEnabled && (
                  <TableCell className="text-right">
                    <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                      −{formatVND(ded.bhtn)}
                      <span className="opacity-70">
                        {deductionCfg.bhtnPct}%
                      </span>
                    </span>
                  </TableCell>
                )}
                {showDeductions && (
                  <TableCell className="text-right font-semibold text-primary">
                    {formatVND(ded.net)}
                  </TableCell>
                )}
                <TableCell>
                  {r.paid ? (
                    <Badge variant="success" className="gap-1">
                      <BadgeCheck className="size-3" />
                      Đã trả
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Chưa trả</Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {isAdmin && selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 lg:bottom-6">
          <div className="flex flex-wrap items-center gap-2 rounded-full border bg-card/95 px-4 py-2 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-2 pr-2 text-sm">
              <CheckCircle2 className="size-4 text-primary" />
              <span className="font-medium">
                {selected.size} kỳ · Tổng{" "}
                <span className="text-primary">{formatVND(selectionTotal)}</span>
              </span>
            </div>
            <div className="h-5 w-px bg-border" />
            <Button
              variant="default"
              size="sm"
              disabled={pending}
              onClick={bulkMarkPaid}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <BadgeCheck className="size-4" />
              )}
              Đánh dấu đã trả
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              title="Bỏ chọn"
              disabled={pending}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
