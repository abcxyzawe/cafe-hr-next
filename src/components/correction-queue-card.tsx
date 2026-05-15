"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Check, Loader2, Wrench, X } from "lucide-react";
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
import type { CorrectionRequest } from "@/lib/correction-requests";
import {
  approveCorrection,
  rejectCorrection,
} from "@/app/(app)/correction-actions";

const TYPE_LABELS: Record<string, string> = {
  missed_checkin: "Quên check-in",
  missed_checkout: "Quên check-out",
  wrong_time: "Sai giờ",
  other: "Lý do khác",
};

const TYPE_VARIANT: Record<string, "default" | "secondary" | "warning" | "outline"> = {
  missed_checkin: "warning",
  missed_checkout: "warning",
  wrong_time: "default",
  other: "secondary",
};

export function CorrectionQueueCard({ items }: { items: CorrectionRequest[] }) {
  if (items.length === 0) return null;

  return (
    <Card className="border-sky-200/60 bg-sky-50/40 dark:border-sky-900/40 dark:bg-sky-950/20">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <div className="flex size-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
          <Wrench className="size-5" />
        </div>
        <div className="flex-1">
          <CardTitle className="flex items-center gap-2">
            Yêu cầu sửa chấm công
            <Badge variant="default">{items.length}</Badge>
          </CardTitle>
          <CardDescription>
            Duyệt yêu cầu sửa giờ chấm công do nhân viên gửi
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {items.map((it) => (
            <CorrectionRow key={it.id} item={it} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function CorrectionRow({ item }: { item: CorrectionRequest }) {
  const [pending, startTransition] = useTransition();
  const typeLabel = TYPE_LABELS[item.type] ?? item.type;
  const typeVariant = TYPE_VARIANT[item.type] ?? "secondary";

  const handleApprove = () => {
    if (
      !window.confirm(
        `Duyệt yêu cầu của ${item.employeeName} cho ngày ${item.date}? Bản ghi chấm công sẽ được cập nhật.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        await approveCorrection(item.id);
        toast.success("Đã duyệt yêu cầu");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Lỗi");
      }
    });
  };

  const handleReject = () => {
    const reason = window.prompt(
      `Từ chối yêu cầu của ${item.employeeName}? (Có thể nhập lý do)`,
      "",
    );
    if (reason === null) return;
    startTransition(async () => {
      try {
        await rejectCorrection(item.id, reason || undefined);
        toast.success("Đã từ chối yêu cầu");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Lỗi");
      }
    });
  };

  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium">{item.employeeName}</span>
          <Badge variant={typeVariant}>{typeLabel}</Badge>
          <span className="text-xs text-muted-foreground">
            {formatDate(item.date)}
          </span>
        </div>
        {(item.desiredCheckIn || item.desiredCheckOut) && (
          <p className="text-xs text-muted-foreground">
            Giờ mong muốn:{" "}
            {item.desiredCheckIn ? (
              <span className="font-medium">{item.desiredCheckIn}</span>
            ) : (
              <span className="italic">—</span>
            )}
            {" → "}
            {item.desiredCheckOut ? (
              <span className="font-medium">{item.desiredCheckOut}</span>
            ) : (
              <span className="italic">—</span>
            )}
          </p>
        )}
        {item.note && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            “{item.note}”
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending}
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
          disabled={pending}
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
