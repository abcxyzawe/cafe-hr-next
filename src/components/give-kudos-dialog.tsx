"use client";

import { useState, useTransition } from "react";
import { Heart, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { giveKudos } from "@/app/(app)/employees/[id]/kudos-actions";
import { suggestKudosMessagesAction } from "@/components/kudos-suggest-action";

const PRESET_EMOJIS = ["👏", "🌟", "🔥", "💪", "🎉", "❤️", "🚀", "☕"] as const;
const MAX_LEN = 200;

export function GiveKudosDialog({
  employeeId,
  employeeName,
  role,
}: {
  employeeId: number;
  employeeName: string;
  role?: string;
}) {
  const [open, setOpen] = useState(false);
  const [emoji, setEmoji] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const [suggestPending, startSuggestTransition] = useTransition();
  const [suggestions, setSuggestions] = useState<string[]>([]);

  function reset() {
    setEmoji("");
    setMessage("");
    setSuggestions([]);
  }

  function handleClose(next: boolean) {
    if (pending || suggestPending) return;
    setOpen(next);
    if (!next) reset();
  }

  function submit() {
    if (!emoji || message.trim().length === 0) return;
    startTransition(async () => {
      try {
        await giveKudos(employeeId, emoji, message.trim());
        toast.success("Đã gửi lời khen!");
        reset();
        setOpen(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Không gửi được lời khen");
      }
    });
  }

  function suggest() {
    if (!emoji || suggestPending) return;
    startSuggestTransition(async () => {
      const res = await suggestKudosMessagesAction(
        employeeName,
        role ?? "nhân viên quán cà phê",
        emoji,
      );
      if (res.ok) {
        setSuggestions(res.messages);
      } else {
        toast.error(res.error);
      }
    });
  }

  function pickSuggestion(text: string) {
    setMessage(text.slice(0, MAX_LEN));
    setSuggestions([]);
  }

  const disabled = pending || !emoji || message.trim().length === 0;
  const suggestDisabled = pending || suggestPending || !emoji;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Heart className="size-4" />
        Tặng lời khen
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent onClose={() => handleClose(false)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="size-5 text-rose-500" />
              Tặng lời khen cho {employeeName}
            </DialogTitle>
            <DialogDescription>
              Chọn một biểu tượng và viết vài dòng động viên — hiển thị công khai trên hồ sơ.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium">Chọn biểu tượng</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    disabled={pending}
                    onClick={() => setEmoji(e)}
                    className={cn(
                      "flex size-12 items-center justify-center rounded-lg border bg-card text-2xl transition hover:bg-accent",
                      emoji === e && "border-primary bg-primary/10 ring-2 ring-primary/40",
                    )}
                    aria-label={`Chọn ${e}`}
                    aria-pressed={emoji === e}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <label htmlFor="kudos-message" className="block text-sm font-medium">
                  Lời nhắn
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={suggest}
                  disabled={suggestDisabled}
                  title={!emoji ? "Hãy chọn biểu tượng trước" : "Để AI gợi ý lời khen"}
                >
                  {suggestPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  Gợi ý từ AI
                </Button>
              </div>
              <textarea
                id="kudos-message"
                value={message}
                onChange={(ev) => setMessage(ev.target.value.slice(0, MAX_LEN))}
                rows={4}
                maxLength={MAX_LEN}
                placeholder="Cảm ơn vì... / Hoàn thành xuất sắc..."
                disabled={pending}
                className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              />
              <div className="mt-1 text-right text-xs text-muted-foreground">
                {message.length}/{MAX_LEN}
              </div>
              {suggestions.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <p className="text-xs text-muted-foreground">
                    Gợi ý — bấm để dùng:
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {suggestions.map((s, idx) => (
                      <button
                        key={`${idx}-${s.slice(0, 20)}`}
                        type="button"
                        onClick={() => pickSuggestion(s)}
                        disabled={pending}
                        className="rounded-md border bg-card px-3 py-2 text-left text-sm transition hover:border-primary hover:bg-primary/5 disabled:opacity-50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleClose(false)}
                disabled={pending}
              >
                Huỷ
              </Button>
              <Button type="button" size="sm" onClick={submit} disabled={disabled}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Heart className="size-4" />}
                Gửi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
