"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Loader2,
  LogIn,
  LogOut,
  Sun,
  Sunrise,
  Sunset,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { quickCheckin, quickCheckout } from "../me/check-in-actions";
import { ROLE_LABELS, SHIFT_LABELS, cn, formatHours } from "@/lib/utils";

export type FocusEmployee = {
  id: number;
  name: string;
  role: string;
  avatarUrl: string | null;
};

export type FocusAttendance = {
  id: number;
  checkInIso: string;
  checkOutIso: string | null;
  hoursWorked: number | null;
};

export type FocusShift = {
  id: number;
  shiftType: string | null;
  startTime: string | null;
  endTime: string | null;
};

type Props = {
  employee: FocusEmployee;
  currentAttendance: FocusAttendance | null;
  todayShift: FocusShift | null;
  tasksDoneToday: number;
};

const VI_DAYS = [
  "Chủ nhật",
  "Thứ hai",
  "Thứ ba",
  "Thứ tư",
  "Thứ năm",
  "Thứ sáu",
  "Thứ bảy",
];

const SHIFT_TYPE_ICON: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Sunset,
};

function computeHoursSoFar(att: FocusAttendance | null, now: Date): number {
  if (!att) return 0;
  if (att.checkOutIso) {
    if (att.hoursWorked != null) return att.hoursWorked;
    const ms = new Date(att.checkOutIso).getTime() - new Date(att.checkInIso).getTime();
    return Math.max(0, ms / 3_600_000);
  }
  const ms = now.getTime() - new Date(att.checkInIso).getTime();
  return Math.max(0, ms / 3_600_000);
}

export function FocusBoard({
  employee,
  currentAttendance,
  todayShift,
  tasksDoneToday,
}: Props) {
  const [now, setNow] = useState<Date | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const isCheckedIn =
    currentAttendance != null && currentAttendance.checkOutIso == null;
  const hasFinished =
    currentAttendance != null && currentAttendance.checkOutIso != null;
  const status: "active" | "done" | "none" = isCheckedIn
    ? "active"
    : hasFinished
      ? "done"
      : "none";

  const hoursSoFar = useMemo(
    () => computeHoursSoFar(currentAttendance, now ?? new Date(0)),
    [currentAttendance, now],
  );

  function doCheckin() {
    startTransition(async () => {
      const res = await quickCheckin();
      if (res.ok) toast.success("Đã check-in. Tập trung làm việc nhé!");
      else toast.error(res.error || "Không check-in được");
    });
  }

  function doCheckout() {
    startTransition(async () => {
      const res = await quickCheckout();
      if (res.ok) toast.success("Đã check-out. Cảm ơn vì ca làm hôm nay!");
      else toast.error(res.error || "Không check-out được");
    });
  }

  const roleLabel = ROLE_LABELS[employee.role] ?? employee.role;

  // Pre-render placeholders SSR to avoid mismatch
  const hh = now ? String(now.getHours()).padStart(2, "0") : "--";
  const mm = now ? String(now.getMinutes()).padStart(2, "0") : "--";
  const ss = now ? String(now.getSeconds()).padStart(2, "0") : "--";
  const dateLine = now
    ? `${VI_DAYS[now.getDay()]} · ${String(now.getDate()).padStart(2, "0")}/${String(
        now.getMonth() + 1,
      ).padStart(2, "0")}/${now.getFullYear()}`
    : "—";

  const ShiftIcon: React.ComponentType<{ className?: string }> =
    todayShift?.shiftType
      ? (SHIFT_TYPE_ICON[todayShift.shiftType] ?? CalendarClock)
      : CalendarClock;
  const shiftLabel = todayShift?.shiftType
    ? (SHIFT_LABELS[todayShift.shiftType] ?? todayShift.shiftType)
    : "Không có ca";
  const shiftTime =
    todayShift?.startTime || todayShift?.endTime
      ? `${todayShift?.startTime ?? "—"} – ${todayShift?.endTime ?? "—"}`
      : "Tự do";

  return (
    <div className="mx-auto max-w-2xl p-8 space-y-8">
      {/* Header: avatar + name + status pill */}
      <div className="flex items-center gap-4">
        <Avatar
          src={employee.avatarUrl}
          alt={employee.name}
          fallback={employee.name}
          role={employee.role}
          size={64}
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-3xl font-bold leading-tight">
            {employee.name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{roleLabel}</Badge>
            {status === "active" && (
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">
                Đang ca
              </Badge>
            )}
            {status === "done" && (
              <Badge variant="secondary">Đã rời ca</Badge>
            )}
            {status === "none" && (
              <Badge className="bg-amber-500 hover:bg-amber-500 text-white">
                Chưa check-in
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* HUGE clock + date */}
      <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-accent/30 p-8 text-center">
        <div
          className="text-7xl font-bold tabular-nums tracking-tight"
          suppressHydrationWarning
        >
          {hh}:{mm}
          <span className="text-3xl text-muted-foreground">:{ss}</span>
        </div>
        <div
          className="mt-2 text-lg font-medium capitalize text-muted-foreground"
          suppressHydrationWarning
        >
          {dateLine}
        </div>
      </div>

      {/* HUGE check-in / check-out button */}
      <div>
        {status === "none" && (
          <Button
            onClick={doCheckin}
            disabled={pending}
            className="h-20 w-full bg-emerald-600 text-2xl font-bold text-white shadow-lg hover:bg-emerald-700"
          >
            {pending ? (
              <Loader2 className="size-6 animate-spin" />
            ) : (
              <LogIn className="size-6" />
            )}
            Bấm để check-in
          </Button>
        )}
        {status === "active" && (
          <Button
            onClick={doCheckout}
            disabled={pending}
            className="h-20 w-full bg-rose-600 text-2xl font-bold text-white shadow-lg hover:bg-rose-700"
          >
            {pending ? (
              <Loader2 className="size-6 animate-spin" />
            ) : (
              <LogOut className="size-6" />
            )}
            Bấm để check-out
          </Button>
        )}
        {status === "done" && (
          <Button
            onClick={doCheckin}
            disabled={pending}
            className="h-20 w-full bg-slate-700 text-xl font-bold text-white shadow-lg hover:bg-slate-800"
          >
            {pending ? (
              <Loader2 className="size-6 animate-spin" />
            ) : (
              <CheckCircle2 className="size-6" />
            )}
            Đã hoàn thành ca · Bấm để check-in lại
          </Button>
        )}
      </div>

      {/* Today summary: 3 stat tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          icon={Clock}
          label="Giờ làm hôm nay"
          value={now ? formatHours(hoursSoFar) : "—"}
          tone="primary"
        />
        <StatTile
          icon={ClipboardCheck}
          label="Việc đã xong"
          value={String(tasksDoneToday)}
          tone="emerald"
        />
        <StatTile
          icon={ShiftIcon}
          label={shiftLabel}
          value={shiftTime}
          tone="indigo"
          small
        />
      </div>

      {/* Footer: exit focus mode */}
      <div className="flex justify-center pt-4">
        <Button asChild variant="ghost" size="lg">
          <Link href="/me">
            <ArrowLeft className="size-5" />
            Thoát chế độ tập trung
          </Link>
        </Button>
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
  small,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: "primary" | "emerald" | "indigo";
  small?: boolean;
}) {
  const toneClass =
    tone === "primary"
      ? "bg-primary/10 text-primary"
      : tone === "emerald"
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
        : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300";
  return (
    <div className="rounded-xl border bg-card/50 p-4 text-center shadow-sm">
      <div
        className={cn(
          "mx-auto mb-2 flex size-12 items-center justify-center rounded-xl",
          toneClass,
        )}
      >
        <Icon className="size-6" />
      </div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-bold tabular-nums",
          small ? "text-lg" : "text-2xl",
        )}
        suppressHydrationWarning
      >
        {value}
      </p>
    </div>
  );
}
