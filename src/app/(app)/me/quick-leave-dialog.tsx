"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plane, Send, Loader2, Bookmark, X, CalendarHeart } from "lucide-react";
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
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createOwnLeaveRequest } from "@/app/(app)/leave/actions";
import {
  type LeaveTemplate,
  STORAGE_KEY as LEAVE_TEMPLATES_KEY,
  loadLeaveTemplates,
  removeLeaveTemplate,
  saveLeaveTemplate,
} from "@/lib/leave-templates";
import {
  getUpcomingLeaveSuggestions,
  type LeaveSuggestion,
} from "@/lib/leave-suggestions";

type LeaveType = "annual" | "sick" | "personal" | "unpaid";

const TYPE_OPTIONS: Array<{ value: LeaveType; label: string; tone: string }> = [
  { value: "annual", label: "Phép năm", tone: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" },
  { value: "sick", label: "Ốm", tone: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  { value: "personal", label: "Cá nhân", tone: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
  { value: "unpaid", label: "Không lương", tone: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function QuickLeaveDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<LeaveType>("annual");
  const [startDate, setStartDate] = useState(tomorrowIso());
  const [endDate, setEndDate] = useState(tomorrowIso());
  const [reason, setReason] = useState("");
  const [templates, setTemplates] = useState<LeaveTemplate[]>([]);
  const [suggestions, setSuggestions] = useState<LeaveSuggestion[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setTemplates(loadLeaveTemplates());
    setSuggestions(getUpcomingLeaveSuggestions(60, 5));
    function onStorage(ev: StorageEvent) {
      if (ev.key !== null && ev.key !== LEAVE_TEMPLATES_KEY) return;
      setTemplates(loadLeaveTemplates());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [open]);

  function applySuggestion(s: LeaveSuggestion) {
    setStartDate(s.startDate);
    setEndDate(s.endDate);
    setReason(s.reason);
    toast.success(`Đã chọn lịch nghỉ ${s.title}`);
  }

  function applyTemplate(t: LeaveTemplate) {
    setType(t.type);
    setReason(t.reason);
    toast.success(`Đã áp dụng mẫu "${t.name}"`);
  }

  function deleteTemplate(name: string) {
    removeLeaveTemplate(name);
    setTemplates(loadLeaveTemplates());
    toast.success(`Đã xoá mẫu "${name}"`);
  }

  function handleSaveTemplate() {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      toast.error("Nhập lý do trước khi lưu mẫu");
      return;
    }
    const input = window.prompt("Đặt tên cho mẫu (tối đa 40 ký tự):");
    if (input === null) return;
    const name = input.trim();
    if (name.length < 1 || name.length > 40) {
      toast.error("Tên mẫu phải có 1-40 ký tự");
      return;
    }
    saveLeaveTemplate({ name, type, reason: trimmedReason, createdAt: Date.now() });
    setTemplates(loadLeaveTemplates());
    toast.success(`Đã lưu mẫu "${name}"`);
  }

  function reset() {
    setType("annual");
    setStartDate(tomorrowIso());
    setEndDate(tomorrowIso());
    setReason("");
  }

  function submit() {
    if (startDate > endDate) {
      toast.error("Ngày kết thúc phải sau ngày bắt đầu");
      return;
    }
    if (startDate < todayIso()) {
      toast.warning("Bạn đang đăng ký nghỉ trong quá khứ — kiểm tra lại ngày");
    }
    startTransition(async () => {
      const res = await createOwnLeaveRequest({
        type,
        startDate,
        endDate,
        reason: reason.trim() || undefined,
      });
      if (res.ok) {
        toast.success("Đã gửi đơn xin nghỉ — chờ duyệt");
        reset();
        setOpen(false);
      } else if (res.error) {
        toast.error(res.error);
      } else if (res.fieldErrors) {
        const first = Object.values(res.fieldErrors)[0]?.[0];
        toast.error(first ?? "Dữ liệu không hợp lệ");
      }
    });
  }

  // Compute duration days inclusive
  const days = (() => {
    const a = new Date(startDate).getTime();
    const b = new Date(endDate).getTime();
    if (Number.isNaN(a) || Number.isNaN(b) || a > b) return 0;
    return Math.round((b - a) / 86_400_000) + 1;
  })();

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button onClick={() => setOpen(true)} variant="outline" size="sm">
          <Plane className="size-4" />
          Đơn xin nghỉ
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plane className="size-5 text-primary" />
              Gửi đơn xin nghỉ
            </DialogTitle>
            <DialogDescription>
              Đơn sẽ được gửi tới quản lý duyệt — bạn sẽ nhận thông báo khi có kết
              quả.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Holiday suggestions */}
            {suggestions.length > 0 && (
              <div>
                <p className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <CalendarHeart className="size-3 text-rose-500" />
                  Sắp đến ngày lễ — gợi ý nghỉ
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => applySuggestion(s)}
                      className="group inline-flex flex-col items-start gap-0.5 rounded-md border border-rose-300/40 bg-rose-50/30 px-2.5 py-1.5 text-left transition-all hover:border-rose-400/60 hover:bg-rose-50 dark:bg-rose-950/20 dark:hover:bg-rose-950/40"
                      title={`${s.startDate} → ${s.endDate}`}
                    >
                      <span className="text-xs font-semibold text-rose-700 group-hover:text-rose-600 dark:text-rose-300">
                        🎉 {s.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {s.subtitle}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Saved templates */}
            <div>
              <p className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Bookmark className="size-3" />
                Mẫu đã lưu
              </p>
              {templates.length === 0 ? (
                <p className="text-xs italic text-muted-foreground">
                  Chưa có mẫu nào — lưu form hiện tại để dùng nhanh sau này
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {templates.map((t) => (
                    <span
                      key={t.name}
                      className="inline-flex items-center gap-1 rounded-full border bg-card pl-2.5 text-xs transition-colors hover:bg-accent"
                    >
                      <button
                        type="button"
                        onClick={() => applyTemplate(t)}
                        className="flex items-center gap-1 py-1 font-medium transition-colors hover:text-primary"
                        title={`${t.reason}`}
                      >
                        {t.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTemplate(t.name)}
                        aria-label={`Xoá mẫu ${t.name}`}
                        className="flex h-full items-center px-1.5 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Type chips */}
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Loại phép
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
                        "flex items-center gap-2 rounded-md border px-2.5 py-2 text-sm font-medium transition-all",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "border-primary bg-primary/10 text-foreground"
                          : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block size-2 rounded-full",
                          opt.tone.split(" ")[0],
                        )}
                      />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hidden Select for accessibility (form fallback if a11y crawler) */}
            <Select
              value={type}
              onChange={(e) => setType(e.target.value as LeaveType)}
              className="sr-only"
              aria-hidden
              tabIndex={-1}
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="leave-start">Từ ngày</Label>
                <Input
                  id="leave-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="leave-end">Đến ngày</Label>
                <Input
                  id="leave-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            {days > 0 && (
              <p className="text-xs text-muted-foreground">
                Tổng cộng <span className="font-semibold">{days} ngày</span>
              </p>
            )}

            {/* Reason */}
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="leave-reason">Lý do (tuỳ chọn)</Label>
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={!reason.trim()}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-primary transition-colors hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
                >
                  <Bookmark className="size-3" />
                  Lưu mẫu
                </button>
              </div>
              <textarea
                id="leave-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="VD: Về quê, ốm sốt, việc gia đình..."
                className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
              />
              <p className="text-[11px] text-muted-foreground text-right tabular-nums">
                {reason.length}/500
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
            <Button type="button" onClick={submit} disabled={pending || days === 0}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Gửi đơn
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
