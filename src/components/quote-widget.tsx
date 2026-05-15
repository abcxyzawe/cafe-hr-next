"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Sparkles, Quote, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { regenerateQuote } from "@/app/(app)/quote-actions";

export function QuoteWidget({
  initialContent,
  isAdmin,
}: {
  initialContent: string;
  initialModel?: string;
  isAdmin: boolean;
}) {
  const [content, setContent] = useState(initialContent);
  const [pending, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      const res = await regenerateQuote();
      if (res.ok && res.content) {
        setContent(res.content);
        toast.success("Đã đổi câu nói mới");
      } else {
        toast.error(res.error || "Không đổi được câu nói");
      }
    });
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-amber-50 via-background to-orange-50 p-6 shadow-sm dark:from-stone-900/60 dark:via-background dark:to-stone-900/60">
      <div className="absolute -right-4 -top-4 size-32 rounded-full bg-primary/10 blur-2xl" />
      <div className="absolute -bottom-6 -left-6 size-32 rounded-full bg-amber-500/10 blur-2xl" />
      <div className="relative flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
          <Quote className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="size-3" />
            <span className="font-semibold uppercase tracking-wider">
              Câu nói hôm nay
            </span>
          </div>
          <p className="text-lg font-medium leading-snug">
            <span className="text-primary">&ldquo;</span>
            {content}
            <span className="text-primary">&rdquo;</span>
          </p>
        </div>
        {isAdmin && (
          <Button
            variant="ghost"
            size="icon"
            disabled={pending}
            onClick={refresh}
            title="Đổi câu nói khác"
            className="shrink-0"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
