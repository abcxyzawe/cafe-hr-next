"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { DoorClosed, X, Plus, Loader2, CalendarDays } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  declareClosure,
  cancelTodayClosure,
  cancelClosure,
} from "@/app/(app)/closure-actions";

type Props = {
  /** Active closure for today, or null if none. Server-fetched in layout. */
  closure: {
    id: number;
    reason: string;
    declaredBy: string;
    declaredAt: string; // ISO
  } | null;
  /** Whether the current user can declare/cancel closures. */
  isAdmin: boolean;
};

export function ClosureBanner({ closure, isAdmin }: Props) {
  if (closure) {
    return <ActiveBanner closure={closure} isAdmin={isAdmin} />;
  }
  if (isAdmin) {
    // No banner; admin trigger lives in DeclareClosureButton mounted elsewhere.
    return null;
  }
  return null;
}

function ActiveBanner({
  closure,
  isAdmin,
}: {
  closure: NonNullable<Props["closure"]>;
  isAdmin: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function cancel() {
    if (!confirm("Huỷ thông báo nghỉ hôm nay?")) return;
    startTransition(async () => {
      const res = await cancelTodayClosure();
      if (res.ok) toast.success("Đã huỷ thông báo nghỉ");
      else toast.error(res.error || "Không huỷ được");
    });
  }

  const declaredTime = new Date(closure.declaredAt).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-rose-500/40 bg-gradient-to-r from-rose-500/15 via-rose-500/5 to-amber-500/10 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-md">
          <DoorClosed className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-rose-700 dark:text-rose-300">
            🚪 Quán nghỉ hôm nay
          </p>
          <p className="mt-0.5 text-sm font-medium leading-snug">{closure.reason}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Thông báo bởi {closure.declaredBy} · {declaredTime}
          </p>
        </div>
        {isAdmin && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={cancel}
            disabled={pending}
            title="Huỷ thông báo nghỉ"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
            Huỷ
          </Button>
        )}
      </div>
    </div>
  );
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function DeclareClosureButton() {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [closureDate, setClosureDate] = useState(todayIso());
  const [pending, startTransition] = useTransition();

  function submit() {
    if (reason.trim().length < 3) {
      toast.error("Lý do phải ít nhất 3 ký tự");
      return;
    }
    startTransition(async () => {
      const res = await declareClosure({
        reason: reason.trim(),
        closureDate,
      });
      if (res.ok) {
        const isToday = closureDate === todayIso();
        toast.success(
          isToday
            ? "Đã đăng thông báo quán nghỉ hôm nay"
            : `Đã đặt lịch quán nghỉ ngày ${closureDate}`,
        );
        setReason("");
        setClosureDate(todayIso());
        setOpen(false);
      } else {
        toast.error(res.error || "Không gửi được");
      }
    });
  }

  const isFuture = closureDate > todayIso();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-rose-400/40 bg-rose-500/5 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-500/10 dark:text-rose-300"
      >
        <DoorClosed className="size-3.5" />
        Báo quán nghỉ
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DoorClosed className="size-5 text-rose-500" />
              Báo quán nghỉ
            </DialogTitle>
            <DialogDescription>
              Banner sẽ hiện cho mọi người vào dashboard đúng ngày đã chọn. Có thể
              huỷ bất cứ lúc nào.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="closure-date">Ngày nghỉ</Label>
              <Input
                id="closure-date"
                type="date"
                min={todayIso()}
                value={closureDate}
                onChange={(e) => setClosureDate(e.target.value)}
              />
              {isFuture && (
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <CalendarDays className="size-3" />
                  Đặt lịch trước — banner sẽ tự hiện vào đúng ngày này
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="closure-reason">Lý do</Label>
              <textarea
                id="closure-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={200}
                placeholder="VD: Liên hoan công ty · Mất điện · Bảo trì máy pha..."
                className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
              />
              <p className="text-[11px] text-muted-foreground text-right tabular-nums">
                {reason.length}/200
              </p>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Huỷ
            </Button>
            <Button onClick={submit} disabled={pending || reason.trim().length < 3}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              {isFuture ? "Đặt lịch nghỉ" : "Đăng thông báo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function UpcomingClosuresList({
  closures,
  isAdmin,
}: {
  closures: Array<{
    id: number;
    reason: string;
    declaredBy: string;
    closureDate: string;
  }>;
  isAdmin: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (closures.length === 0) return null;

  function cancel(id: number, date: string) {
    if (!confirm(`Huỷ lịch nghỉ ngày ${date}?`)) return;
    startTransition(async () => {
      const res = await cancelClosure(id);
      if (res.ok) toast.success(`Đã huỷ lịch nghỉ ${date}`);
      else toast.error(res.error || "Không huỷ được");
    });
  }

  return (
    <div className="rounded-xl border border-amber-400/30 bg-amber-500/5 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
        <CalendarDays className="size-3.5" />
        Lịch nghỉ sắp tới ({closures.length})
      </div>
      <ul className="space-y-1.5">
        {closures.map((c) => {
          const [y, m, d] = c.closureDate.split("-");
          return (
            <li
              key={c.id}
              className="flex flex-wrap items-center gap-2 rounded-md bg-background/60 px-2.5 py-1.5 text-sm"
            >
              <span className="font-mono text-xs font-bold tabular-nums text-amber-700 dark:text-amber-300">
                {d}/{m}/{y}
              </span>
              <span className="flex-1 truncate">{c.reason}</span>
              <span className="text-[11px] text-muted-foreground">
                bởi {c.declaredBy}
              </span>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => cancel(c.id, `${d}/${m}/${y}`)}
                  disabled={pending}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-50"
                  aria-label={`Huỷ lịch nghỉ ${d}/${m}/${y}`}
                  title="Huỷ"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
