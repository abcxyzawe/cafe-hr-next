"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Megaphone, Info, CheckCircle2, AlertTriangle, Send, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { broadcastAnnouncement } from "@/app/(app)/announcement-action";

type Severity = "info" | "success" | "warning";

const SEVERITIES: Array<{
  id: Severity;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}> = [
  {
    id: "info",
    label: "Thông tin",
    icon: Info,
    tone: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  },
  {
    id: "success",
    label: "Tin vui",
    icon: CheckCircle2,
    tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  {
    id: "warning",
    label: "Quan trọng",
    icon: AlertTriangle,
    tone: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
];

type Props = {
  isAdmin: boolean;
};

export function AnnouncementComposerDialog({ isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const [severity, setSeverity] = useState<Severity>("info");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  if (!isAdmin) return null;

  function reset() {
    setSeverity("info");
    setMessage("");
  }

  function submit() {
    const trimmed = message.trim();
    if (trimmed.length < 5) {
      toast.error("Nội dung phải ít nhất 5 ký tự");
      return;
    }
    if (trimmed.length > 500) {
      toast.error("Nội dung tối đa 500 ký tự");
      return;
    }
    startTransition(async () => {
      const res = await broadcastAnnouncement({ message: trimmed, severity });
      if (res.ok) {
        toast.success("Đã gửi thông báo tới tất cả nhân viên đang online");
        reset();
        setOpen(false);
      } else {
        toast.error(res.error || "Không gửi được thông báo");
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="hidden sm:inline-flex"
        title="Gửi thông báo tới mọi người"
      >
        <Megaphone className="size-4" />
        Thông báo
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="size-5 text-primary" />
              Gửi thông báo nội bộ
            </DialogTitle>
            <DialogDescription>
              Mọi người đang dùng app sẽ nhận được toast thông báo trong vòng 3 giây
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Mức độ
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {SEVERITIES.map((s) => {
                  const Icon = s.icon;
                  const active = severity === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSeverity(s.id)}
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
                          s.tone,
                        )}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                htmlFor="announcement-message"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Nội dung
              </label>
              <textarea
                id="announcement-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="VD: Hôm nay quán đóng cửa lúc 22h, mọi người sắp xếp ca sớm nhé!"
                rows={5}
                maxLength={500}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y min-h-[120px]"
              />
              <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Tối thiểu 5 · tối đa 500 ký tự</span>
                <span className="tabular-nums">{message.length}/500</span>
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
              Gửi thông báo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
