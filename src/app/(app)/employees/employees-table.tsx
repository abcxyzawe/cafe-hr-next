"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Loader2,
  Trash2,
  Download,
  X,
  CheckCircle2,
  GitCompare,
  KeyRound,
} from "lucide-react";
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
import { Sparkline } from "@/components/ui/sparkline";
import { ROLE_LABELS, formatDate, cn } from "@/lib/utils";

const EMPTY_SPARK: number[] = [0, 0, 0, 0, 0, 0, 0];
import { bulkDeleteEmployees, bulkResetPin, updateEmployeeField } from "./actions";
import { GenerateAvatarButton, DeleteEmployeeButton } from "./employee-actions";
import { EditEmployeeButton } from "./edit-dialog";
import { InlineRateEdit } from "./inline-rate-edit";
import { InlineTextEdit } from "./inline-text-edit";
import { BulkRaiseDialog } from "./bulk-raise-dialog";

const NAME_VALIDATE = (v: string): string | null => {
  if (v.trim().length < 2) return "Tên phải có ít nhất 2 ký tự";
  return null;
};
const EMAIL_VALIDATE = (v: string): string | null => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Email không hợp lệ";
  return null;
};
const PHONE_VALIDATE = (v: string): string | null => {
  if (!/^[\d+\-\s]+$/.test(v)) return "Số điện thoại không hợp lệ";
  return null;
};

type EmployeeRow = {
  id: number;
  name: string;
  role: string;
  phone: string | null;
  email: string | null;
  hourlyRate: number;
  avatarUrl: string | null;
  dateOfBirth: Date | null;
  createdAt: Date;
};

const ROLE_VARIANT: Record<string, "default" | "secondary" | "success" | "warning"> = {
  barista: "default",
  server: "secondary",
  cashier: "warning",
  manager: "success",
};

export function EmployeesTable({
  employees,
  isAdmin,
  sparklines,
}: {
  employees: EmployeeRow[];
  isAdmin: boolean;
  sparklines?: Record<number, number[]>;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [pending, startTransition] = useTransition();

  const allIds = useMemo(() => employees.map((e) => e.id), [employees]);
  const allSelected = selected.size > 0 && selected.size === allIds.length;
  const someSelected = selected.size > 0 && !allSelected;

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

  function bulkDelete() {
    const ids = Array.from(selected);
    if (
      !confirm(
        `Xoá ${ids.length} nhân viên đã chọn? Hành động này không thể hoàn tác và sẽ xoá cả attendance + shift + leave + task + notes liên quan.`,
      )
    )
      return;
    startTransition(async () => {
      const res = await bulkDeleteEmployees(ids);
      if (res.ok) {
        toast.success(`Đã xoá ${res.deleted} nhân viên`);
        clearSelection();
      } else {
        toast.error(res.error || "Không xoá được");
      }
    });
  }

  function bulkResetPinAction() {
    const ids = Array.from(selected);
    if (
      !confirm(
        `Reset PIN cho ${ids.length} nhân viên đã chọn? Họ sẽ phải đặt PIN mới để chấm công qua kiosk.`,
      )
    )
      return;
    startTransition(async () => {
      const res = await bulkResetPin(ids);
      if (res.ok) {
        if (res.reset === 0)
          toast.info("Không có nhân viên nào có PIN để reset");
        else toast.success(`Đã reset PIN cho ${res.reset} nhân viên`);
        clearSelection();
      } else {
        toast.error(res.error || "Không reset được");
      }
    });
  }

  const exportHref = `/api/employees/csv?ids=${Array.from(selected).join(",")}`;
  const compareHref =
    selected.size >= 2 && selected.size <= 4
      ? `/employees/compare?ids=${Array.from(selected).join(",")}`
      : null;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
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
            <TableHead className="w-[60px]">#</TableHead>
            <TableHead>Nhân viên</TableHead>
            <TableHead>Vai trò</TableHead>
            <TableHead className="hidden md:table-cell">Liên hệ</TableHead>
            <TableHead className="text-right">Lương/giờ</TableHead>
            <TableHead className="hidden lg:table-cell">Ngày tạo</TableHead>
            <TableHead className="w-[200px] text-right">Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((e) => {
            const isSelected = selected.has(e.id);
            return (
              <TableRow
                key={e.id}
                data-state={isSelected ? "selected" : undefined}
                className={cn(isSelected && "bg-primary/5")}
              >
                <TableCell>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(e.id)}
                    aria-label={`Chọn ${e.name}`}
                    className="size-4 cursor-pointer rounded border-input accent-primary"
                  />
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {e.id.toString().padStart(3, "0")}
                </TableCell>
                <TableCell className="align-top">
                  <div className="flex min-h-10 items-center gap-3">
                    <Link
                      href={`/employees/${e.id}`}
                      className="shrink-0"
                      aria-label={`Mở hồ sơ ${e.name}`}
                      data-employee-id={e.id}
                    >
                      <Avatar
                        src={e.avatarUrl}
                        alt={e.name}
                        fallback={e.name}
                        size={40}
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <InlineTextEdit
                        value={e.name}
                        editable={isAdmin}
                        validate={NAME_VALIDATE}
                        ariaLabel={`tên ${e.name}`}
                        className="font-medium"
                        onSave={(v) =>
                          updateEmployeeField(e.id, "name", v)
                        }
                      />
                      {e.email && (
                        <p className="truncate text-xs text-muted-foreground md:hidden">
                          {e.email}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <div className="flex min-h-10 items-center">
                    <Badge variant={ROLE_VARIANT[e.role] ?? "secondary"}>
                      {ROLE_LABELS[e.role] ?? e.role}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="hidden align-top text-sm text-muted-foreground md:table-cell">
                  <div className="flex flex-col gap-0.5">
                    <InlineTextEdit
                      value={e.phone}
                      editable={isAdmin}
                      validate={PHONE_VALIDATE}
                      placeholder="— SĐT"
                      ariaLabel={`SĐT ${e.name}`}
                      onSave={(v) =>
                        updateEmployeeField(e.id, "phone", v)
                      }
                    />
                    <InlineTextEdit
                      value={e.email}
                      editable={isAdmin}
                      validate={EMAIL_VALIDATE}
                      placeholder="— email"
                      ariaLabel={`email ${e.name}`}
                      className="text-xs"
                      onSave={(v) =>
                        updateEmployeeField(e.id, "email", v)
                      }
                    />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Sparkline
                      values={sparklines?.[e.id] ?? EMPTY_SPARK}
                      width={56}
                      height={18}
                      variant="area"
                      className="hidden text-primary md:inline-block"
                    />
                    <InlineRateEdit
                      id={e.id}
                      initialRate={e.hourlyRate}
                      canEdit={isAdmin}
                    />
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  {formatDate(e.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <GenerateAvatarButton id={e.id} />
                    {isAdmin && (
                      <EditEmployeeButton
                        employee={{
                          id: e.id,
                          name: e.name,
                          role: e.role,
                          phone: e.phone,
                          email: e.email,
                          hourlyRate: e.hourlyRate,
                          dateOfBirth: e.dateOfBirth
                            ? new Date(e.dateOfBirth).toISOString().slice(0, 10)
                            : null,
                        }}
                      />
                    )}
                    {isAdmin && (
                      <DeleteEmployeeButton id={e.id} name={e.name} />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 lg:bottom-6">
          <div className="flex flex-wrap items-center gap-2 rounded-full border bg-card/95 px-4 py-2 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-2 pr-2 text-sm">
              <CheckCircle2 className="size-4 text-primary" />
              <span className="font-medium">
                {selected.size} đã chọn
              </span>
            </div>
            <div className="h-5 w-px bg-border" />
            <Button asChild variant="outline" size="sm">
              <a href={exportHref} download>
                <Download className="size-4" />
                CSV
              </a>
            </Button>
            {compareHref && (
              <Button asChild variant="outline" size="sm">
                <Link href={compareHref}>
                  <GitCompare className="size-4" />
                  So sánh ({selected.size})
                </Link>
              </Button>
            )}
            {isAdmin && (
              <BulkRaiseDialog
                selected={employees
                  .filter((e) => selected.has(e.id))
                  .map((e) => ({ id: e.id, name: e.name, hourlyRate: e.hourlyRate }))}
                onDone={clearSelection}
              />
            )}
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={bulkResetPinAction}
                title="Reset PIN cho các nhân viên đã chọn"
              >
                <KeyRound className="size-4" />
                Reset PIN
              </Button>
            )}
            {isAdmin && (
              <Button
                variant="destructive"
                size="sm"
                disabled={pending}
                onClick={bulkDelete}
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                Xoá ({selected.size})
              </Button>
            )}
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
