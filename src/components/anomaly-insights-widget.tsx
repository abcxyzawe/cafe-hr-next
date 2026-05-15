"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  TrendingDown,
  UserX,
  Wrench,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Anomaly } from "@/lib/anomalies";
import {
  closeOpenAttendance,
  markAsNoShow,
} from "@/lib/anomaly-actions";

const ICON_MAP = {
  clock: Clock,
  "user-x": UserX,
  "trending-down": TrendingDown,
  "alert-triangle": AlertTriangle,
} as const;

const SEVERITY_STYLES: Record<
  Anomaly["severity"],
  { border: string; badge: string }
> = {
  critical: {
    border: "border-l-rose-500",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  },
  warning: {
    border: "border-l-amber-500",
    badge:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
  info: {
    border: "border-l-sky-500",
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  },
};

type ParsedAction =
  | { kind: "no-show"; employeeId: number; date: string }
  | { kind: "open-attendance"; attendanceId: number }
  | { kind: "pending-leave"; leaveId: number }
  | { kind: "none" };

function parseAnomalyAction(id: string): ParsedAction {
  const parts = id.split(":");
  if (parts[0] === "no-show" && parts.length >= 3) {
    const empId = Number(parts[1]);
    const date = parts.slice(2).join(":");
    if (Number.isInteger(empId) && empId > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { kind: "no-show", employeeId: empId, date };
    }
  }
  if (parts[0] === "open-attendance" && parts.length >= 2) {
    const attId = Number(parts[1]);
    if (Number.isInteger(attId) && attId > 0) {
      return { kind: "open-attendance", attendanceId: attId };
    }
  }
  if (parts[0] === "pending-leave" && parts.length >= 2) {
    const leaveId = Number(parts[1]);
    if (Number.isInteger(leaveId) && leaveId > 0) {
      return { kind: "pending-leave", leaveId };
    }
  }
  return { kind: "none" };
}

function FixButton({ action }: { action: ParsedAction }) {
  const [pending, startTransition] = useTransition();

  if (action.kind === "pending-leave") {
    return (
      <Button
        asChild
        size="sm"
        variant="outline"
        className="h-7 shrink-0 px-2 text-xs"
      >
        <Link
          href={`/leave?status=pending&id=${action.leaveId}`}
          title="Mở duyệt"
        >
          <ArrowRight className="size-3" />
          Mở duyệt
        </Link>
      </Button>
    );
  }

  if (action.kind === "no-show") {
    const { employeeId, date } = action;
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        className="h-7 shrink-0 px-2 text-xs"
        title="Đánh dấu nghỉ không lương"
        onClick={() => {
          startTransition(async () => {
            const res = await markAsNoShow(employeeId, date);
            if (res.ok) toast.success("Đã đánh dấu nghỉ không lương");
            else toast.error(res.error);
          });
        }}
      >
        {pending ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <Wrench className="size-3" />
        )}
        Sửa nhanh
      </Button>
    );
  }

  if (action.kind === "open-attendance") {
    const { attendanceId } = action;
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        className="h-7 shrink-0 px-2 text-xs"
        title="Đóng ca"
        onClick={() => {
          startTransition(async () => {
            const res = await closeOpenAttendance(attendanceId);
            if (res.ok) toast.success("Đã đóng ca");
            else toast.error(res.error);
          });
        }}
      >
        {pending ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <Wrench className="size-3" />
        )}
        Sửa nhanh
      </Button>
    );
  }

  return null;
}

export function AnomalyInsightsWidget({ items }: { items: Anomaly[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <div className="flex size-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
          <AlertTriangle className="size-5" />
        </div>
        <div className="flex-1">
          <CardTitle>Cần chú ý</CardTitle>
          <CardDescription>
            {items.length} điểm bất thường phát hiện trong 14 ngày qua
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
            <CheckCircle2 className="size-4" />
            <span>✨ Mọi thứ đều ổn — không phát hiện điểm bất thường</span>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((a) => {
              const Icon = ICON_MAP[a.icon];
              const styles = SEVERITY_STYLES[a.severity];
              const action = parseAnomalyAction(a.id);
              const titleNode = a.employeeId ? (
                <Link
                  href={`/employees/${a.employeeId}`}
                  className="font-semibold hover:underline"
                >
                  {a.title}
                </Link>
              ) : (
                <span className="font-semibold">{a.title}</span>
              );
              return (
                <li
                  key={a.id}
                  className={`flex items-start gap-3 rounded-md border border-l-4 bg-card p-3 ${styles.border}`}
                >
                  <div
                    className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${styles.badge}`}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      {titleNode}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {a.description}
                    </p>
                  </div>
                  <FixButton action={action} />
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
