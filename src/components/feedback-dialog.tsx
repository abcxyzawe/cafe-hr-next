"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { MessageSquareHeart, Bug, Lightbulb, ThumbsUp, MessageCircle, Send, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { submitFeedback } from "@/app/(app)/feedback-action";

type Category = "bug" | "feature" | "praise" | "other";

const CATEGORIES: Array<{
  id: Category;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}> = [
  { id: "bug", label: "Báo lỗi", icon: Bug, tone: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" },
  { id: "feature", label: "Đề xuất", icon: Lightbulb, tone: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  { id: "praise", label: "Lời khen", icon: ThumbsUp, tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  { id: "other", label: "Khác", icon: MessageCircle, tone: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" },
];

export function FeedbackDialog({
  trigger,
}: {
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("bug");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function reset() {
    setCategory("bug");
    setMessage("");
  }

  function submit() {
    if (message.trim().length < 5) {
      toast.error("Nội dung phải ít nhất 5 ký tự");
      return;
    }
    const pageUrl =
      typeof window !== "undefined" ? window.location.pathname : undefined;
    startTransition(async () => {
      const res = await submitFeedback({ category, message: message.trim(), pageUrl });
      if (res.ok) {
        toast.success("Cảm ơn phản hồi của bạn — đã ghi nhận!");
        reset();
        setOpen(false);
      } else {
        toast.error(res.error || "Không gửi được phản hồi");
      }
    });
  }

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Gửi phản hồi"
          aria-label="Gửi phản hồi"
          className="hidden h-9 w-9 items-center justify-center rounded-md border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:inline-flex"
        >
          <MessageSquareHeart className="size-4" />
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquareHeart className="size-5 text-primary" />
              Phản hồi tới đội phát triển
            </DialogTitle>
            <DialogDescription>
              Mọi góp ý đều được ghi vào nhật ký hệ thống — cảm ơn bạn!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Loại phản hồi
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {CATEGORIES.map((c) => {
                  const Icon = c.icon;
                  const active = category === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
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
                          "flex size-6 items-center justify-center rounded",
                          c.tone,
                        )}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                htmlFor="feedback-message"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Nội dung
              </label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  category === "bug"
                    ? "Mô tả lỗi: bạn đang làm gì, mong đợi gì, kết quả thực tế..."
                    : category === "feature"
                      ? "Tính năng bạn muốn có và lý do giúp ích..."
                      : category === "praise"
                        ? "Điều gì làm bạn hài lòng?"
                        : "Nội dung phản hồi..."
                }
                rows={5}
                maxLength={2000}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y min-h-[120px]"
              />
              <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Tối thiểu 5 · tối đa 2000 ký tự</span>
                <span className="tabular-nums">{message.length}/2000</span>
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
              disabled={pending || message.trim().length < 5}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Gửi phản hồi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
