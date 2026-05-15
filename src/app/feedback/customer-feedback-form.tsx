"use client";

import { useState, useTransition } from "react";
import { Star, Send, Loader2, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { submitCustomerFeedback } from "./customer-feedback-action";

const RATING_LABELS: Record<number, string> = {
  1: "Rất tệ",
  2: "Chưa hài lòng",
  3: "Bình thường",
  4: "Tốt",
  5: "Tuyệt vời",
};

export function CustomerFeedbackForm() {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function reset() {
    setRating(0);
    setHoverRating(0);
    setComment("");
    setName("");
    setContact("");
    setWebsite("");
    setError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (rating < 1) {
      setError("Vui lòng chọn số sao đánh giá");
      return;
    }
    if (comment.trim().length < 5) {
      setError("Vui lòng viết nhận xét tối thiểu 5 ký tự");
      return;
    }
    startTransition(async () => {
      const res = await submitCustomerFeedback({
        rating,
        comment: comment.trim(),
        name: name.trim() || undefined,
        contact: contact.trim() || undefined,
        website: website || undefined,
      });
      if (res.ok) {
        reset();
        setDone(true);
      } else {
        // Silently drop spam-flagged submissions
        if (res.error === "Spam detected") {
          reset();
          setDone(true);
          return;
        }
        setError(res.error ?? "Không gửi được phản hồi");
      }
    });
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-8 text-center shadow-sm">
        <div className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          <PartyPopper className="size-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold">Cảm ơn 🙏</h2>
          <p className="text-sm text-muted-foreground">
            Chúng tôi đã nhận được phản hồi của bạn — đội Cafe HR rất trân trọng!
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setDone(false)}
        >
          Gửi phản hồi khác
        </Button>
      </div>
    );
  }

  const displayRating = hoverRating || rating;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-xl border bg-card p-6 shadow-sm"
      noValidate
    >
      <div>
        <Label className="mb-2 block text-sm font-semibold">
          Bạn cho quán bao nhiêu sao?
        </Label>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => {
            const filled = n <= displayRating;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                aria-label={`${n} sao`}
                aria-pressed={rating === n}
                className={cn(
                  "rounded-md p-1 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <Star
                  className={cn(
                    "size-9 transition-colors",
                    filled
                      ? "fill-amber-400 text-amber-400"
                      : "fill-transparent text-muted-foreground/40",
                  )}
                />
              </button>
            );
          })}
          {displayRating > 0 && (
            <span className="ml-3 text-sm font-medium text-muted-foreground">
              {RATING_LABELS[displayRating]}
            </span>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="cf-comment" className="mb-1.5 block text-sm font-semibold">
          Nhận xét của bạn
        </Label>
        <textarea
          id="cf-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Đồ uống, không gian, phục vụ — bất cứ điều gì bạn muốn chia sẻ..."
          rows={5}
          maxLength={1000}
          className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[120px]"
        />
        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Tối thiểu 5 · tối đa 1000 ký tự</span>
          <span className="tabular-nums">{comment.length}/1000</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="cf-name" className="mb-1.5 block text-sm font-semibold">
            Tên của bạn <span className="text-xs font-normal text-muted-foreground">(không bắt buộc)</span>
          </Label>
          <Input
            id="cf-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: Minh"
            maxLength={100}
            autoComplete="name"
          />
        </div>
        <div>
          <Label htmlFor="cf-contact" className="mb-1.5 block text-sm font-semibold">
            Liên hệ <span className="text-xs font-normal text-muted-foreground">(không bắt buộc)</span>
          </Label>
          <Input
            id="cf-contact"
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Email hoặc số điện thoại"
            maxLength={100}
            autoComplete="email"
          />
        </div>
      </div>

      {/* Honeypot — hidden from users; bots will likely fill it */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-9999px",
          width: "1px",
          height: "1px",
          overflow: "hidden",
        }}
      >
        <label htmlFor="cf-website">Website (do not fill)</label>
        <input
          id="cf-website"
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button type="submit" disabled={pending} size="lg">
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          Gửi phản hồi
        </Button>
      </div>
    </form>
  );
}
