"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ClipboardCheck, Send, Loader2, Wrench } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { submitAttendanceCorrection } from "./correction-action";

type CorrectionType = "missed_checkin" | "missed_checkout" | "wrong_time" | "other";

const TYPE_OPTIONS: Array<{
  value: CorrectionType;
  label: string;
  hint: string;
}> = [
  { value: "missed_checkin", label: "Quên check-in", hint: "Đã làm nhưng quên bấm vào ca" },
  { value: "missed_checkout", label: "Quên check-out", hint: "Đã về nhưng quên tan ca" },
  { value: "wrong_time", label: "Sai giờ", hint: "Giờ ghi nhận chưa đúng" },
  { value: "other", label: "Lý do khác", hint: "Mô tả trong ghi chú" },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function maxIso(): string {
  return todayIso();
}

function minIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 14);
  return d.toISOString().slice(0, 10);
}

export function AttendanceCorrectionDialog() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<CorrectionType>("missed_checkin");
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState("");
  const [desiredCheckIn, setDesiredCheckIn] = useState("");
  const [desiredCheckOut, setDesiredCheckOut] = useState("");
  const [pending, startTransition] = useTransition();

  function reset() {
    setType("missed_checkin");
    setDate(todayIso());
    setNote("");
    setDesiredCheckIn("");
    setDesiredCheckOut("");
  }

  function submit() {
    if (note.trim().length < 5) {
      toast.error("Vui lòng mô tả chi tiết (ít nhất 5 ký tự)");
      return;
    }
    startTransition(async () => {
      const res = await submitAttendanceCorrection({
        date,
        type,
        note: note.trim(),
        desiredCheckIn: desiredCheckIn || undefined,
        desiredCheckOut: desiredCheckOut || undefined,
      });
      if (res.ok) {
        toast.success("Đã gửi yêu cầu — admin sẽ xem và xử lý");
        reset();
        setOpen(false);
      } else {
        toast.error(res.error || "Không gửi được");
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" size="sm">
        <Wrench className="size-4" />
        Yêu cầu sửa chấm công
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="size-5 text-primary" />
              Yêu cầu sửa chấm công
            </DialogTitle>
            <DialogDescription>
              Gửi yêu cầu cho admin xem xét và cập nhật. Chỉ áp dụng cho 14 ngày gần
              nhất.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Type chips */}
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Vấn đề
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {TYPE_OPTIONS.map((opt) => {
                  const active = type === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setType(opt.value)}
                      aria-pressed={active}
                      className={cn(
                        "flex flex-col items-start gap-0.5 rounded-md border px-2.5 py-2 text-left transition-all",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "border-primary bg-primary/10 text-foreground"
                          : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <span className="text-sm font-medium leading-tight">
                        {opt.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {opt.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date */}
            <div className="space-y-1">
              <Label htmlFor="correction-date">Ngày cần sửa</Label>
              <Input
                id="correction-date"
                type="date"
                value={date}
                min={minIso()}
                max={maxIso()}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* Optional desired times for wrong_time */}
            {(type === "wrong_time" ||
              type === "missed_checkin" ||
              type === "missed_checkout") && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="desired-checkin" className="text-xs">
                    Giờ check-in mong muốn
                  </Label>
                  <Input
                    id="desired-checkin"
                    type="time"
                    value={desiredCheckIn}
                    onChange={(e) => setDesiredCheckIn(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="desired-checkout" className="text-xs">
                    Giờ check-out mong muốn
                  </Label>
                  <Input
                    id="desired-checkout"
                    type="time"
                    value={desiredCheckOut}
                    onChange={(e) => setDesiredCheckOut(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Note */}
            <div className="space-y-1">
              <Label htmlFor="correction-note">Ghi chú chi tiết</Label>
              <textarea
                id="correction-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="VD: Hôm 22/05 mình check-in lúc 7h nhưng máy không nhận, làm tới 12h..."
                className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
              />
              <p className="text-[11px] text-muted-foreground text-right tabular-nums">
                {note.length}/500
              </p>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-end gap-2">
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
              onClick={submit}
              disabled={pending || note.trim().length < 5}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Gửi yêu cầu
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
