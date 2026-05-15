"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { swapWeekShifts } from "./actions";

type Employee = { id: number; name: string; role: string };

type ShiftLite = {
  id: number;
  employeeId: number;
  shiftDate: Date;
  shiftType: "morning" | "afternoon" | "evening" | null;
  startTime: string | null;
  endTime: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  morning: "Sáng",
  afternoon: "Chiều",
  evening: "Tối",
};

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function shiftLine(s: ShiftLite): string {
  const date = fmtDate(s.shiftDate);
  const type = s.shiftType ? TYPE_LABEL[s.shiftType] : "Khác";
  const time =
    s.startTime && s.endTime ? ` ${s.startTime}–${s.endTime}` : "";
  return `${date} · ${type}${time}`;
}

export function SwapShiftsDialog({
  employees,
  shifts,
  weekStartIso,
  isAdmin,
}: {
  employees: Employee[];
  shifts: ShiftLite[];
  weekStartIso: string;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [empA, setEmpA] = useState<string>("");
  const [empB, setEmpB] = useState<string>("");
  const [pending, startTransition] = useTransition();

  const empAId = empA ? Number(empA) : 0;
  const empBId = empB ? Number(empB) : 0;
  const canConfirm =
    empAId > 0 && empBId > 0 && empAId !== empBId && !pending;

  const aShifts = useMemo(
    () => shifts.filter((s) => s.employeeId === empAId),
    [shifts, empAId],
  );
  const bShifts = useMemo(
    () => shifts.filter((s) => s.employeeId === empBId),
    [shifts, empBId],
  );

  const empAName =
    employees.find((e) => e.id === empAId)?.name ?? "Nhân viên A";
  const empBName =
    employees.find((e) => e.id === empBId)?.name ?? "Nhân viên B";

  if (!isAdmin) return null;

  const handleConfirm = () => {
    if (!canConfirm) return;
    startTransition(async () => {
      const res = await swapWeekShifts(empAId, empBId, weekStartIso);
      if (res.ok) {
        toast.success(`Đã đổi ${res.swapped} ca giữa ${empAName} ↔ ${empBName}`);
        if (res.skippedDuplicates && res.skippedDuplicates.length > 0) {
          toast.warning(
            `Bỏ qua ${res.skippedDuplicates.length} ca trùng (cùng ngày + loại)`,
          );
        }
        setOpen(false);
        setEmpA("");
        setEmpB("");
      } else {
        toast.error(res.error || "Không đổi được ca");
      }
    });
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ArrowLeftRight className="size-4" />
        Đổi ca
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Đổi ca giữa 2 nhân viên</DialogTitle>
            <DialogDescription>
              Tất cả ca trong tuần đang xem sẽ được đổi giữa 2 người này.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="swap-emp-a">Nhân viên A</Label>
              <Select
                id="swap-emp-a"
                value={empA}
                onChange={(e) => setEmpA(e.target.value)}
              >
                <option value="">— Chọn —</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="swap-emp-b">Nhân viên B</Label>
              <Select
                id="swap-emp-b"
                value={empB}
                onChange={(e) => setEmpB(e.target.value)}
              >
                <option value="">— Chọn —</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {empAId > 0 && empBId > 0 && empAId === empBId && (
            <p className="mt-2 text-xs text-destructive">
              Hai nhân viên phải khác nhau.
            </p>
          )}

          {empAId > 0 && empBId > 0 && empAId !== empBId && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                  <span className="truncate">{empAName}</span>
                  <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate text-muted-foreground">
                    {empBName}
                  </span>
                </div>
                {aShifts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Không có ca nào trong tuần.
                  </p>
                ) : (
                  <ul className="space-y-1 text-xs">
                    {aShifts.map((s) => (
                      <li key={s.id} className="text-foreground">
                        {shiftLine(s)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                  <span className="truncate">{empBName}</span>
                  <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate text-muted-foreground">
                    {empAName}
                  </span>
                </div>
                {bShifts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Không có ca nào trong tuần.
                  </p>
                ) : (
                  <ul className="space-y-1 text-xs">
                    {bShifts.map((s) => (
                      <li key={s.id} className="text-foreground">
                        {shiftLine(s)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Huỷ
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowLeftRight className="size-4" />
              )}
              Đổi ngay
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
