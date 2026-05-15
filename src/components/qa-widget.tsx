"use client";

import { useState, useTransition, useRef, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  Send,
  Loader2,
  MessageCircleQuestion,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ask } from "@/app/(app)/ask-action";

const SUGGESTIONS = [
  "Ai làm nhiều giờ nhất tháng này?",
  "Còn ca trống nào hôm nay không?",
  "Tổng lương dự tính tháng này là bao nhiêu?",
  "Ai đang trong ca ngay bây giờ?",
  "Có ai sắp nghỉ phép tuần này không?",
];

const FALLBACK_FOLLOWUPS: ReadonlyArray<string> = [
  "Tổng giờ tháng này?",
  "Ai nghỉ nhiều nhất?",
  "Còn ca trống nào không?",
];

// Lookup of follow-up suggestions keyed by topic keywords found in the previous Q.
const FOLLOWUP_TOPICS: ReadonlyArray<{
  keywords: ReadonlyArray<string>;
  followups: ReadonlyArray<string>;
}> = [
  {
    keywords: ["lương", "thu nhập", "thực lĩnh"],
    followups: [
      "Ai có lương cao nhất?",
      "Tổng lương dự tính tháng này?",
      "So sánh với tháng trước?",
    ],
  },
  {
    keywords: ["giờ", "tăng ca", "overtime"],
    followups: [
      "Ai làm ít giờ nhất?",
      "Trung bình mỗi người bao nhiêu giờ?",
      "Có ai làm quá 200h chưa?",
    ],
  },
  {
    keywords: ["ca", "lịch", "shift"],
    followups: [
      "Còn ca trống nào hôm nay không?",
      "Ai trực ca tối nay?",
      "Tuần này có bao nhiêu ca?",
    ],
  },
  {
    keywords: ["nghỉ", "leave", "phép"],
    followups: [
      "Đơn nghỉ nào đang chờ duyệt?",
      "Tuần này ai nghỉ?",
      "Ai nghỉ nhiều nhất tháng này?",
    ],
  },
  {
    keywords: ["task", "việc", "công việc"],
    followups: [
      "Task nào quá hạn?",
      "Ai có nhiều task nhất?",
      "Còn task chưa giao không?",
    ],
  },
];

function generateFollowups(lastQuestion: string): ReadonlyArray<string> {
  const q = lastQuestion.toLowerCase();
  const match = FOLLOWUP_TOPICS.find((t) =>
    t.keywords.some((k) => q.includes(k)),
  );
  return match?.followups ?? FALLBACK_FOLLOWUPS;
}

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  ts: number;
};

const HISTORY_CONTEXT_LIMIT = 6;

export function QAWidget() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  const lastAssistantIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return i;
    }
    return -1;
  }, [messages]);

  const followups = useMemo<ReadonlyArray<string>>(() => {
    if (lastAssistantIndex <= 0) return [];
    // Find the user question that preceded the last assistant reply
    for (let i = lastAssistantIndex - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        return generateFollowups(messages[i].content);
      }
    }
    return FALLBACK_FOLLOWUPS;
  }, [lastAssistantIndex, messages]);

  function submit(q: string) {
    const trimmed = q.trim();
    if (!trimmed || pending) return;
    setQuestion("");

    const userMsg: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: trimmed,
      ts: Date.now(),
    };
    // Snapshot context BEFORE adding the new user msg (cap to last N)
    const contextHistory = messages.slice(-HISTORY_CONTEXT_LIMIT).map((m) => ({
      role: m.role,
      content: m.content,
    }));
    setMessages((prev) => [...prev, userMsg]);

    startTransition(async () => {
      const res = await ask(trimmed, contextHistory);
      if (res.ok && res.answer) {
        const reply: ChatMessage = {
          id: Date.now() + 1,
          role: "assistant",
          content: res.answer,
          ts: Date.now(),
        };
        setMessages((prev) => [...prev, reply]);
      } else {
        toast.error(res.error || "Không nhận được câu trả lời");
        // Rollback the user message so they can retry cleanly
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      }
    });
  }

  function reset() {
    if (pending) return;
    setMessages([]);
    setQuestion("");
    inputRef.current?.focus();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow">
          <MessageCircleQuestion className="size-5" />
        </div>
        <div className="flex-1">
          <CardTitle className="flex items-center gap-2">
            Hỏi trợ lý
            <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="size-2.5" /> Beta
            </span>
          </CardTitle>
          <CardDescription>
            Trò chuyện đa lượt — trợ lý nhớ ngữ cảnh câu hỏi trước
          </CardDescription>
        </div>
        {messages.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={reset}
            disabled={pending}
            className="shrink-0"
            title="Xoá toàn bộ hội thoại"
          >
            <RotateCcw className="size-3.5" />
            Reset hội thoại
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {messages.length > 0 && (
          <div className="max-h-80 space-y-3 overflow-y-auto rounded-lg border bg-muted/30 p-3">
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex items-start gap-2">
                  <span className="text-xs font-bold text-muted-foreground">
                    Hỏi:
                  </span>
                  <p className="flex-1 text-sm font-medium">{m.content}</p>
                </div>
              ) : (
                <div
                  key={m.id}
                  className="flex items-start gap-2 rounded-md bg-card p-2 shadow-sm"
                >
                  <span className="text-xs font-bold text-primary">Đáp:</span>
                  <p className="flex-1 whitespace-pre-wrap text-sm leading-relaxed">
                    {m.content}
                  </p>
                </div>
              ),
            )}
            {pending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Trợ lý đang suy nghĩ…
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}

        {!pending && lastAssistantIndex >= 0 && followups.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Hỏi tiếp:</p>
            <div className="flex flex-wrap gap-1.5">
              {followups.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => submit(s)}
                  className="rounded-full border bg-card px-3 py-1 text-xs transition-colors hover:border-primary/40 hover:bg-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(question);
          }}
          className="flex gap-2"
        >
          <Input
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              // Cmd+Enter / Ctrl+Enter shortcut
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                submit(question);
              }
            }}
            placeholder={
              messages.length === 0
                ? "VD: Ai làm nhiều nhất tháng này?"
                : "Hỏi tiếp… (Ctrl+Enter để gửi)"
            }
            maxLength={500}
            disabled={pending}
            className="flex-1"
          />
          <Button type="submit" disabled={pending || !question.trim()}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Hỏi
          </Button>
        </form>

        {messages.length === 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Gợi ý câu hỏi:</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setQuestion(s);
                    submit(s);
                  }}
                  disabled={pending}
                  className={cn(
                    "rounded-full border bg-card px-3 py-1 text-xs transition-colors hover:border-primary/40 hover:bg-accent",
                    pending && "opacity-50",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
