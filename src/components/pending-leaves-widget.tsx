"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowRight, CalendarClock, Check, Loader2, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import {
  approveLeave,
  bulkApproveLeaves,
  bulkRejectLeaves,
  rejectLeave,
} from "@/app/(app)/leave/actions";

export type PendingLeaveItem = {
  id: number;
  type: "annual" | "sick" | "personal" | "unpaid";
  startDate: Date | string;
  endDate: Date | string;
  reason: string | null;
  employee: {
    id: number;
    name: string;
    avatarUrl: string | null;
  };
};

const TYPE_LABELS: Record<PendingLeaveItem["type"], string> = {
  annual: "Nghỉ phép",
  sick: "Nghỉ ốm",
  personal: "Cá nhân",
  unpaid: "Không lương",
};

const TYPE_VARIANT: Record<
  PendingLeaveItem["type"],
  "default" | "secondary" | "warning" | "outline"
> = {
  annual: "default",
  sick: "warning",
  personal: "secondary",
  unpaid: "outline",
};

export function PendingLeavesWidget({ items }: { items: PendingLeaveItem[] }) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [bulkPending, startBulk] = useTransition();

  const visible = useMemo(() => items.slice(0, 5), [items]);
  const visibleIds = useMemo(() => visible.map((v) => v.id), [visible]);

  if (items.length === 0) return null;

  const selectedCount = selected.size;
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  const toggleOne = (id: number, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) {
        for (const id of visibleIds) next.add(id);
      } else {
        for (const id of visibleIds) next.delete(id);
      }
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const runBulk = (mode: "approve" | "reject") => {
    if (selectedCount === 0) return;
    const ids = Array.from(selected);
    const verb = mode === "approve" ? "duyệt" : "từ chối";
    if (
      !window.confirm(
        `Bạn có chắc muốn ${verb} ${selectedCount} đơn nghỉ đã chọn?`,
      )
    ) {
      return;
    }
    startBulk(async () => {
      try {
        const res =
          mode === "approve"
            ? await bulkApproveLeaves(ids)
            : await bulkRejectLeaves(ids);
        const skipped = ids.length - res.processed;
        const action = mode === "approve" ? "Đã duyệt" : "Đã từ chối";
        if (res.processed === 0) {
          toast.warning("Không có đơn nào được xử lý (đã được quyết định trước)");
        } else if (skipped > 0) {
          toast.success(`${action} ${res.processed} đơn (bỏ qua ${skipped})`);
        } else {
          toast.success(`${action} ${res.processed} đơn`);
        }
        clearSelection();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Lỗi");
      }
    });
  };

  return (
    <Card className="relative">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <div className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          <CalendarClock className="size-5" />
        </div>
        <div className="flex-1">
          <CardTitle className="flex items-center gap-2">
            Đơn nghỉ chờ duyệt
            <Badge variant="warning">{items.length}</Badge>
          </CardTitle>
          <CardDescription>
            Duyệt nhanh các đơn đang chờ xử lý
          </CardDescription>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground select-none">
          <input
            type="checkbox"
            className="size-4 cursor-pointer accent-amber-600"
            checked={allVisibleSelected}
            onChange={(e) => toggleAll(e.target.checked)}
            aria-label="Chọn tất cả đơn hiển thị"
          />
          Chọn tất cả
        </label>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="divide-y">
          {visible.map((l) => (
            <PendingLeaveRow
              key={l.id}
              item={l}
              checked={selected.has(l.id)}
              onToggle={(c) => toggleOne(l.id, c)}
              disabled={bulkPending}
            />
          ))}
        </ul>
        <div className="flex justify-end pt-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/leave">
              Xem tất cả <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
      {selectedCount > 0 && (
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-b-xl border-t bg-background/95 px-4 py-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <span className="text-sm font-medium">
            {selectedCount} đã chọn
          </span>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={bulkPending}
              onClick={() => runBulk("approve")}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {bulkPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Duyệt {selectedCount}
            </Button>
            <Button
              size="sm"
              disabled={bulkPending}
              onClick={() => runBulk("reject")}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              <X className="size-4" />
              Từ chối {selectedCount}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={bulkPending}
              onClick={clearSelection}
            >
              Bỏ chọn
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function PendingLeaveRow({
  item,
  checked,
  onToggle,
  disabled,
}: {
  item: PendingLeaveItem;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  disabled: boolean;
}) {
  const [pending, startTransition] = useTransition();

  const handleApprove = () => {
    startTransition(async () => {
      try {
        await approveLeave(item.id);
        toast.success("Đã duyệt đơn");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Lỗi");
      }
    });
  };

  const handleReject = () => {
    startTransition(async () => {
      try {
        await rejectLeave(item.id);
        toast.success("Đã từ chối đơn");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Lỗi");
      }
    });
  };

  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
      <input
        type="checkbox"
        className="size-4 cursor-pointer accent-amber-600 sm:self-center"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onToggle(e.target.checked)}
        aria-label={`Chọn đơn nghỉ của ${item.employee.name}`}
      />
      <Avatar
        src={item.employee.avatarUrl}
        alt={item.employee.name}
        fallback={item.employee.name}
        size={40}
      />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/employees/${item.employee.id}`}
            className="truncate font-medium hover:underline"
          >
            {item.employee.name}
          </Link>
          <Badge variant={TYPE_VARIANT[item.type]}>
            {TYPE_LABELS[item.type]}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatDate(item.startDate)} – {formatDate(item.endDate)}
        </p>
        {item.reason && (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            “{item.reason}”
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending || disabled}
          onClick={handleApprove}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          Duyệt
        </Button>
        <Button
          size="sm"
          disabled={pending || disabled}
          onClick={handleReject}
          className="bg-rose-600 text-white hover:bg-rose-700"
        >
          <X className="size-4" />
          Từ chối
        </Button>
      </div>
    </li>
  );
}
