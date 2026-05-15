"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ListTodo, Loader2, Plus, Send } from "lucide-react";
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
import { createTaskForSelf } from "./quick-task-action";

type TaskPriority = "low" | "normal" | "high" | "urgent";

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Thấp",
  normal: "Bình thường",
  high: "Cao",
  urgent: "Khẩn",
};

const PRIORITY_TONE: Record<TaskPriority, string> = {
  low: "bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200",
  normal: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  high: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  urgent: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

const PRIORITIES: TaskPriority[] = ["low", "normal", "high", "urgent"];

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function QuickTaskDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(tomorrowIso());
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [pending, startTransition] = useTransition();

  function reset() {
    setTitle("");
    setDueDate(tomorrowIso());
    setPriority("normal");
  }

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Nhập tiêu đề việc cần làm");
      return;
    }
    startTransition(async () => {
      const res = await createTaskForSelf({
        title: trimmed,
        dueDate: dueDate || null,
        priority,
      });
      if (res.ok) {
        toast.success("Đã tạo việc cho chính bạn");
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

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          variant="outline"
          size="sm"
        >
          <Plus className="size-4" />
          Tự giao việc
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListTodo className="size-5 text-primary" />
              Tự giao việc cho mình
            </DialogTitle>
            <DialogDescription>
              Tạo nhanh một việc cần làm và tự gán cho bản thân.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="quick-task-title">Tiêu đề</Label>
              <Input
                id="quick-task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Kiểm kho sữa tươi cuối ca"
                maxLength={120}
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground text-right tabular-nums">
                {title.length}/120
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="quick-task-due">Hạn (tuỳ chọn)</Label>
              <Input
                id="quick-task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Mức ưu tiên
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {PRIORITIES.map((p) => {
                  const active = priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
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
                          PRIORITY_TONE[p].split(" ")[0],
                        )}
                      />
                      {PRIORITY_LABELS[p]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
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
              disabled={pending || title.trim().length === 0}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Tạo việc
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
