"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Megaphone,
  Sparkles,
  Send,
  Loader2,
  RotateCcw,
  Info,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  composeAnnouncementAction,
  type ComposeAnnouncementState,
} from "@/components/announcement-compose-action";
import { broadcastAnnouncement } from "@/app/(app)/announcement-action";

type Tone = "friendly" | "formal" | "urgent";
type Severity = "info" | "success" | "warning";

const TONE_OPTIONS: Array<{ id: Tone; label: string }> = [
  { id: "friendly", label: "Vui vẻ" },
  { id: "formal", label: "Chính thức" },
  { id: "urgent", label: "Khẩn cấp" },
];

const TONE_TO_SEVERITY: Record<Tone, Severity> = {
  friendly: "success",
  formal: "info",
  urgent: "warning",
};

const SEVERITY_META: Record<
  Severity,
  { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  info: {
    label: "Thông tin",
    icon: Info,
    tone: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  },
  success: {
    label: "Tin vui",
    icon: CheckCircle2,
    tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  warning: {
    label: "Quan trọng",
    icon: AlertTriangle,
    tone: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
};

const INITIAL_STATE: ComposeAnnouncementState = { ok: false };

type Props = {
  isAdmin: boolean;
};

export function AiAnnouncementComposerDialog({ isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState<Tone>("friendly");
  const [draft, setDraft] = useState("");
  const [posting, startPosting] = useTransition();
  const [state, formAction, composing] = useActionState<
    ComposeAnnouncementState,
    FormData
  >(composeAnnouncementAction, INITIAL_STATE);

  useEffect(() => {
    if (state.ok && state.draft && draft === "") {
      setDraft(state.draft);
    }
  }, [state, draft]);

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }
  }, [state.error]);

  if (!isAdmin) return null;

  const severity: Severity = TONE_TO_SEVERITY[tone];
  const SeverityIcon = SEVERITY_META[severity].icon;

  function resetAll(): void {
    setTopic("");
    setTone("friendly");
    setDraft("");
  }

  function backToCompose(): void {
    setDraft("");
  }

  function handleClose(): void {
    setOpen(false);
  }

  function handlePost(): void {
    const trimmed = draft.trim();
    if (trimmed.length < 5) {
      toast.error("Nội dung phải có ít nhất 5 ký tự");
      return;
    }
    if (trimmed.length > 500) {
      toast.error("Nội dung tối đa 500 ký tự");
      return;
    }
    startPosting(async () => {
      const res = await broadcastAnnouncement({
        message: trimmed,
        severity,
      });
      if (res.ok) {
        toast.success("Đã đăng");
        resetAll();
        setOpen(false);
      } else {
        toast.error(res.error || "Không đăng được thông báo");
      }
    });
  }

  const showDraft = draft.length > 0;
  const draftLen = draft.length;

  return (
    <>
      <Button
        type="button"
        variant="default"
        onClick={() => setOpen(true)}
        title="Soạn thông báo bằng AI"
      >
        <Megaphone className="size-4" />
        Soạn thông báo bằng AI
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg" onClose={handleClose}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              Soạn thông báo bằng AI
            </DialogTitle>
            <DialogDescription>
              Nhập chủ đề ngắn — AI sẽ viết bản nháp ấm áp bằng tiếng Việt để bạn
              chỉnh sửa trước khi đăng.
            </DialogDescription>
          </DialogHeader>

          {!showDraft && (
            <form action={formAction} className="space-y-4">
              <div>
                <label
                  htmlFor="ai-ann-topic"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Chủ đề / Ý chính
                </label>
                <Input
                  id="ai-ann-topic"
                  name="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="VD: nhắc mọi người dọn quầy trước khi đóng cửa"
                  maxLength={300}
                  required
                  minLength={3}
                  disabled={composing}
                />
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>3 – 300 ký tự</span>
                  <span className="tabular-nums">{topic.length}/300</span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="ai-ann-tone"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Tông giọng
                </label>
                <Select
                  id="ai-ann-tone"
                  name="tone"
                  value={tone}
                  onChange={(e) => setTone(e.target.value as Tone)}
                  disabled={composing}
                >
                  {TONE_OPTIONS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClose}
                  disabled={composing}
                >
                  Huỷ
                </Button>
                <Button
                  type="submit"
                  disabled={composing || topic.trim().length < 3}
                >
                  {composing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  Soạn nháp
                </Button>
              </div>
            </form>
          )}

          {showDraft && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs">
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded",
                    SEVERITY_META[severity].tone,
                  )}
                >
                  <SeverityIcon className="size-3.5" />
                </span>
                <span className="text-muted-foreground">
                  Sẽ đăng ở mức:{" "}
                  <span className="font-medium text-foreground">
                    {SEVERITY_META[severity].label}
                  </span>
                </span>
              </div>

              <div>
                <label
                  htmlFor="ai-ann-draft"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Bản nháp (chỉnh sửa nếu cần)
                </label>
                <textarea
                  id="ai-ann-draft"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={6}
                  maxLength={500}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y min-h-[140px]"
                  disabled={posting}
                />
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Tối thiểu 5 · tối đa 500 ký tự</span>
                  <span className="tabular-nums">{draftLen}/500</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={backToCompose}
                  disabled={posting}
                >
                  <RotateCcw className="size-4" />
                  Soạn lại
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleClose}
                    disabled={posting}
                  >
                    Huỷ
                  </Button>
                  <Button
                    type="button"
                    onClick={handlePost}
                    disabled={posting || draft.trim().length < 5}
                  >
                    {posting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    Đăng tin
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
