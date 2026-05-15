"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Loader2, Check, X as XIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ROLE_LABELS } from "@/lib/utils";
import { generateAvatarForEmployee } from "./actions";
import {
  listMissingAvatarEmployeesAction,
  type MissingAvatarEmployee,
} from "./missing-avatars-action";

type Status = "pending" | "generating" | "success" | "error";

type RowState = {
  status: Status;
  error?: string;
};

export function BatchAvatarDialog({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<MissingAvatarEmployee[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [rows, setRows] = useState<Record<number, RowState>>({});
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [, startTransition] = useTransition();

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await listMissingAvatarEmployeesAction();
      if (!res.ok || !res.employees) {
        setLoadError(res.error ?? "Không tải được danh sách");
        setEmployees([]);
        setSelected(new Set());
        return;
      }
      setEmployees(res.employees);
      setSelected(new Set(res.employees.map((e) => e.id)));
      setRows(
        Object.fromEntries(
          res.employees.map((e) => [e.id, { status: "pending" as Status }]),
        ),
      );
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Lỗi không xác định");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setFinished(false);
    setRunning(false);
    void loadEmployees();
  }, [open, loadEmployees]);

  if (!isAdmin) return null;

  const total = selected.size;
  const completedCount = Object.values(rows).filter(
    (r) => r.status === "success" || r.status === "error",
  ).length;
  const successCount = Object.values(rows).filter(
    (r) => r.status === "success",
  ).length;
  const inProgressTotal = total; // freeze at start
  const progressPct =
    inProgressTotal === 0 ? 0 : Math.round((completedCount / inProgressTotal) * 100);

  const toggleAll = (checked: boolean) => {
    if (running) return;
    setSelected(checked ? new Set(employees.map((e) => e.id)) : new Set());
  };

  const toggleOne = (id: number) => {
    if (running) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStart = () => {
    if (running || finished) return;
    if (selected.size === 0) {
      toast.error("Chọn ít nhất 1 nhân viên");
      return;
    }
    const ids = employees.filter((e) => selected.has(e.id)).map((e) => e.id);
    setRunning(true);
    setFinished(false);
    setRows((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = { status: "pending" };
      return next;
    });

    startTransition(async () => {
      let ok = 0;
      let fail = 0;
      for (const id of ids) {
        setRows((prev) => ({ ...prev, [id]: { status: "generating" } }));
        try {
          await generateAvatarForEmployee(id);
          setRows((prev) => ({ ...prev, [id]: { status: "success" } }));
          ok++;
        } catch (e) {
          setRows((prev) => ({
            ...prev,
            [id]: {
              status: "error",
              error: e instanceof Error ? e.message : "Lỗi",
            },
          }));
          fail++;
        }
      }
      setRunning(false);
      setFinished(true);
      router.refresh();
      if (fail === 0) {
        toast.success(`Đã tạo ${ok} avatar`);
      } else {
        toast.warning(`Hoàn tất: ${ok} thành công, ${fail} lỗi`);
      }
    });
  };

  const handleClose = () => {
    if (running) return;
    setOpen(false);
  };

  const allChecked = employees.length > 0 && selected.size === employees.length;
  const someChecked = selected.size > 0 && selected.size < employees.length;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Sparkles className="size-4" />
        <span className="hidden sm:inline">Tạo avatar hàng loạt</span>
        <span className="sm:hidden">Avatar hàng loạt</span>
      </Button>

      <Dialog open={open} onOpenChange={(o) => (running ? null : setOpen(o))}>
        <DialogContent
          onClose={running ? undefined : handleClose}
          className="max-w-2xl"
        >
          <DialogHeader>
            <DialogTitle>Tạo avatar hàng loạt</DialogTitle>
            <DialogDescription>
              Chọn các nhân viên chưa có avatar. Hệ thống sẽ tạo lần lượt từng người
              để tránh giới hạn API.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Đang tải danh sách...
            </div>
          ) : loadError ? (
            <p className="py-6 text-sm text-destructive">{loadError}</p>
          ) : employees.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Tất cả nhân viên đã có avatar.
            </p>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between text-sm">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-input"
                    checked={allChecked}
                    ref={(el) => {
                      if (el) el.indeterminate = someChecked;
                    }}
                    disabled={running}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                  <span>
                    Chọn tất cả ({selected.size}/{employees.length})
                  </span>
                </label>
                {(running || finished) && (
                  <span className="font-medium tabular-nums">
                    {completedCount} / {inProgressTotal}
                  </span>
                )}
              </div>

              {(running || finished) && (
                <div className="mb-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              )}

              <div className="max-h-[40vh] overflow-y-auto rounded-md border">
                <ul className="divide-y">
                  {employees.map((emp) => {
                    const row = rows[emp.id] ?? { status: "pending" as Status };
                    const isSelected = selected.has(emp.id);
                    return (
                      <li
                        key={emp.id}
                        className="flex items-center gap-3 px-3 py-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          className="size-4 rounded border-input"
                          checked={isSelected}
                          disabled={running}
                          onChange={() => toggleOne(emp.id)}
                          aria-label={`Chọn ${emp.name}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium">{emp.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {ROLE_LABELS[emp.role] ?? emp.role}
                          </p>
                        </div>
                        <StatusBadge state={row} selected={isSelected} />
                      </li>
                    );
                  })}
                </ul>
              </div>

              {finished && (
                <p className="mt-3 text-sm">
                  Đã tạo{" "}
                  <span className="font-semibold">{successCount}</span> /{" "}
                  <span className="font-semibold">{inProgressTotal}</span> avatar
                  {successCount < inProgressTotal && (
                    <span className="text-destructive">
                      {" "}
                      ({inProgressTotal - successCount} lỗi)
                    </span>
                  )}
                </p>
              )}

              <div className="mt-5 flex justify-end gap-2">
                {finished ? (
                  <Button onClick={handleClose}>Đóng</Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleClose}
                      disabled={running}
                    >
                      Huỷ
                    </Button>
                    <Button
                      onClick={handleStart}
                      disabled={running || selected.size === 0}
                    >
                      {running ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Sparkles className="size-4" />
                      )}
                      {running ? "Đang tạo..." : `Bắt đầu (${selected.size})`}
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatusBadge({
  state,
  selected,
}: {
  state: RowState;
  selected: boolean;
}) {
  if (!selected && state.status === "pending") {
    return <span className="text-xs text-muted-foreground">Bỏ qua</span>;
  }
  switch (state.status) {
    case "pending":
      return (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="size-3.5" />
          Chờ
        </span>
      );
    case "generating":
      return (
        <span className="inline-flex items-center gap-1 text-xs text-primary">
          <Loader2 className="size-3.5 animate-spin" />
          Đang tạo...
        </span>
      );
    case "success":
      return (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
          <Check className="size-3.5" />
          Thành công
        </span>
      );
    case "error":
      return (
        <span
          className="inline-flex items-center gap-1 text-xs text-destructive"
          title={state.error}
        >
          <XIcon className="size-3.5" />
          Lỗi
        </span>
      );
  }
}
