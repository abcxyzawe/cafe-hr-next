"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, LogOut, Trash2, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime, formatHours } from "@/lib/utils";
import { bulkCloseAttendance, bulkDeleteAttendance } from "./actions";

export type AttendanceHistoryRow = {
  id: number;
  employeeName: string;
  checkIn: Date;
  checkOut: Date | null;
  hoursWorked: number | null;
};

export function AttendanceHistoryTable({
  rows,
  isAdmin,
}: {
  rows: AttendanceHistoryRow[];
  isAdmin: boolean;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [pending, startTransition] = useTransition();

  const allIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const openIdSet = useMemo(
    () => new Set(rows.filter((r) => r.checkOut === null).map((r) => r.id)),
    [rows],
  );
  const allSelected = selected.size > 0 && selected.size === allIds.length;
  const someSelected = selected.size > 0 && !allSelected;

  const openSelectedCount = useMemo(() => {
    let n = 0;
    for (const id of selected) if (openIdSet.has(id)) n++;
    return n;
  }, [selected, openIdSet]);

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
      prev.size === allIds.length ? new Set() : new Set(allIds),
    );
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function doBulkClose() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    startTransition(async () => {
      const res = await bulkCloseAttendance(ids);
      if (res.ok) {
        toast.success(`Đã đóng ${res.closed} ca`);
        clearSelection();
      } else {
        toast.error(res.error || "Không đóng được");
      }
    });
  }

  function doBulkDelete() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (
      !confirm(
        `Xoá ${ids.length} lượt chấm công đã chọn? Hành động này không thể hoàn tác.`,
      )
    )
      return;
    startTransition(async () => {
      const res = await bulkDeleteAttendance(ids);
      if (res.ok) {
        toast.success(`Đã xoá ${res.deleted} lượt chấm công`);
        clearSelection();
      } else {
        toast.error(res.error || "Không xoá được");
      }
    });
  }

  return (
    <>
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
                  aria-label="Chọn tất cả"
                  className="size-4 cursor-pointer rounded border-input accent-primary"
                />
              </TableHead>
            )}
            <TableHead>Nhân viên</TableHead>
            <TableHead>Check-in</TableHead>
            <TableHead>Check-out</TableHead>
            <TableHead className="text-right">Số giờ</TableHead>
            <TableHead className="text-right">Trạng thái</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((a) => {
            const isSelected = selected.has(a.id);
            return (
              <TableRow
                key={a.id}
                data-state={isSelected ? "selected" : undefined}
                className={cn(isSelected && "bg-primary/5")}
              >
                {isAdmin && (
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(a.id)}
                      aria-label={`Chọn lượt #${a.id}`}
                      className="size-4 cursor-pointer rounded border-input accent-primary"
                    />
                  </TableCell>
                )}
                <TableCell className="font-medium">{a.employeeName}</TableCell>
                <TableCell className="text-sm">{formatDateTime(a.checkIn)}</TableCell>
                <TableCell className="text-sm">{formatDateTime(a.checkOut)}</TableCell>
                <TableCell className="text-right font-medium">
                  {a.hoursWorked !== null ? formatHours(a.hoursWorked) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {a.checkOut ? (
                    <Badge variant="secondary">Hoàn tất</Badge>
                  ) : (
                    <Badge variant="success">Đang làm</Badge>
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
              <span className="font-medium">{selected.size} đã chọn</span>
            </div>
            <div className="h-5 w-px bg-border" />
            <Button
              size="sm"
              disabled={pending || openSelectedCount === 0}
              onClick={doBulkClose}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4" />
              )}
              Đóng ca ({openSelectedCount} chưa đóng)
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={pending}
              onClick={doBulkDelete}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Xoá ({selected.size})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              title="Bỏ chọn"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
