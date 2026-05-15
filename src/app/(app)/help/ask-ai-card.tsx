"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, Send, Wand2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  askHelpAction,
  initialAskHelpState,
  type AskHelpState,
} from "./ask-action";

const SUGGESTIONS: ReadonlyArray<string> = [
  "Làm sao tạo nhân viên mới?",
  "Cách xuất Excel bảng lương?",
  "Phân quyền admin/staff khác gì nhau?",
];

const MAX_LEN = 500;

export function AskAiCard() {
  const [state, formAction, pending] = useActionState<AskHelpState, FormData>(
    askHelpAction,
    initialAskHelpState,
  );

  const formRef = useRef<HTMLFormElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState<string>("");
  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (state.error && state.error !== lastErrorRef.current) {
      lastErrorRef.current = state.error;
      toast.error(state.error);
    }
    if (!state.error) {
      lastErrorRef.current = null;
    }
  }, [state.error]);

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setDraft(e.target.value);
  }

  function applySuggestion(text: string) {
    if (pending) return;
    setDraft(text);
    // Defer submit so the textarea value flushes into the form first.
    requestAnimationFrame(() => {
      formRef.current?.requestSubmit();
    });
  }

  const remaining = MAX_LEN - draft.length;
  const overLimit = draft.length > MAX_LEN;
  const empty = draft.trim().length === 0;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-accent/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          Hỏi AI · trợ lý hệ thống
        </CardTitle>
        <CardDescription>
          Đặt câu hỏi về cách dùng Cafe HR — trợ lý sẽ trả lời dựa trên các
          chức năng có sẵn.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <form ref={formRef} action={formAction} className="space-y-2">
          <textarea
            ref={taRef}
            name="question"
            rows={3}
            required
            maxLength={MAX_LEN}
            value={draft}
            onChange={handleChange}
            disabled={pending}
            placeholder="Ví dụ: Làm sao tăng lương cho 5 nhân viên cùng lúc?"
            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          />
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-[11px] tabular-nums ${
                overLimit
                  ? "text-destructive"
                  : remaining < 50
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
              }`}
            >
              {draft.length}/{MAX_LEN}
            </span>
            <Button
              type="submit"
              size="sm"
              disabled={pending || empty || overLimit}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Hỏi
            </Button>
          </div>
        </form>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Wand2 className="size-3" />
            Gợi ý:
          </span>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => applySuggestion(s)}
              disabled={pending}
              className="rounded-full border border-input bg-background px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {s}
            </button>
          ))}
        </div>

        {pending ? (
          <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary" />
            đang trả lời...
          </div>
        ) : state.answer ? (
          <div className="space-y-2 rounded-md border bg-card/60 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="size-3" />
              Trợ lý
            </div>
            {splitParagraphs(state.answer).map((p, i) => (
              <p
                key={i}
                className="text-sm leading-relaxed text-foreground whitespace-pre-wrap"
              >
                {p}
              </p>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}
