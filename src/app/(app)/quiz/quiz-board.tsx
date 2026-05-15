"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  Sparkles,
  Trophy,
  XCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { generateQuizAction, type QuizTopic } from "./quiz-action";
import type { QuizQuestion } from "@/lib/xai";

type Phase = "setup" | "answering" | "result";

const TOPIC_OPTIONS: ReadonlyArray<{
  value: QuizTopic;
  label: string;
  hint: string;
}> = [
  { value: "sop", label: "SOP", hint: "Quy trình vận hành quán" },
  { value: "recipes", label: "Công thức", hint: "Pha chế đồ uống" },
  { value: "mixed", label: "Tổng hợp", hint: "Cả SOP và công thức" },
];

function cheerMessage(score: number): string {
  if (score === 5) return "Xuất sắc! Bạn nắm rất chắc kiến thức quán.";
  if (score === 4) return "Rất tốt! Chỉ còn một chút là hoàn hảo.";
  if (score === 3) return "Khá ổn — ôn lại vài điểm là vững ngay.";
  if (score === 2) return "Cố lên nhé, làm thêm vài bài là tiến bộ thấy rõ.";
  if (score === 1) return "Đừng nản — xem kỹ giải thích rồi thử lại nhé.";
  return "Cùng đọc lại quy trình và thử bài mới nha.";
}

export function QuizBoard() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [topic, setTopic] = useState<QuizTopic>("mixed");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Array<number | null>>([]);
  const [pending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      const res = await generateQuizAction(topic);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setQuestions(res.questions);
      setAnswers(new Array<number | null>(res.questions.length).fill(null));
      setPhase("answering");
    });
  }

  function handleSelect(qIdx: number, choiceIdx: number) {
    setAnswers((prev) => {
      const next = prev.slice();
      next[qIdx] = choiceIdx;
      return next;
    });
  }

  function handleSubmit() {
    const missing = answers.findIndex((a) => a === null);
    if (missing !== -1) {
      toast.error(`Bạn chưa chọn đáp án cho câu ${missing + 1}.`);
      return;
    }
    setPhase("result");
  }

  function handleReset() {
    setPhase("setup");
    setQuestions([]);
    setAnswers([]);
  }

  const score =
    phase === "result"
      ? questions.reduce(
          (acc, q, i) => acc + (answers[i] === q.answerIndex ? 1 : 0),
          0,
        )
      : 0;

  return (
    <div className="space-y-4">
      {phase === "setup" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-primary" />
              Chọn chủ đề bài quiz
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">
              {TOPIC_OPTIONS.map((opt) => {
                const active = topic === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={pending}
                    onClick={() => setTopic(opt.value)}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-lg border bg-card p-3 text-left transition-all",
                      "hover:border-primary/40 hover:shadow-sm",
                      active
                        ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                        : "border-input",
                      pending && "cursor-not-allowed opacity-60",
                    )}
                    aria-pressed={active}
                  >
                    <span className="text-sm font-semibold">{opt.label}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {opt.hint}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end">
              <Button onClick={handleGenerate} disabled={pending}>
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Tạo bài quiz
              </Button>
            </div>
            {pending ? (
              <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-primary" />
                AI đang soạn 5 câu hỏi cho bạn...
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {phase === "answering" || phase === "result" ? (
        <div className="space-y-4">
          {phase === "result" ? (
            <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-background to-accent/20">
              <CardContent className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                    <Trophy className="size-6" />
                  </span>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">
                      {score}/{questions.length}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {cheerMessage(score)}
                    </p>
                  </div>
                </div>
                <Button onClick={handleReset} variant="outline">
                  <RefreshCw className="size-4" />
                  Tạo bài mới
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {questions.map((q, qIdx) => {
            const picked = answers[qIdx];
            const correct = q.answerIndex;
            const isResult = phase === "result";
            const isCorrect = isResult && picked === correct;
            return (
              <Card key={qIdx}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-start gap-2 text-base">
                    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {qIdx + 1}
                    </span>
                    <span className="flex-1 leading-snug">{q.q}</span>
                    {isResult ? (
                      isCorrect ? (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="size-3.5" />
                          Đúng
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:text-red-400">
                          <XCircle className="size-3.5" />
                          Sai
                        </span>
                      )
                    ) : null}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <ul className="space-y-1.5">
                    {q.choices.map((choice, cIdx) => {
                      const checked = picked === cIdx;
                      const isAnswer = isResult && cIdx === correct;
                      const isWrongPick =
                        isResult && checked && cIdx !== correct;
                      return (
                        <li key={cIdx}>
                          <label
                            className={cn(
                              "flex cursor-pointer items-start gap-2.5 rounded-md border bg-card p-2.5 text-sm transition-colors",
                              "hover:bg-accent/40",
                              checked && !isResult
                                ? "border-primary/60 bg-primary/5"
                                : "border-input",
                              isAnswer &&
                                "border-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/10",
                              isWrongPick &&
                                "border-red-500 bg-red-500/10 hover:bg-red-500/10",
                              isResult && "cursor-default",
                            )}
                          >
                            <input
                              type="radio"
                              name={`q-${qIdx}`}
                              value={cIdx}
                              checked={checked}
                              disabled={isResult}
                              onChange={() => handleSelect(qIdx, cIdx)}
                              className="mt-0.5 size-4 accent-primary"
                            />
                            <span className="flex-1 leading-snug">
                              {choice}
                            </span>
                            {isAnswer ? (
                              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            ) : isWrongPick ? (
                              <XCircle className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />
                            ) : null}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                  {isResult ? (
                    <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        Giải thích:{" "}
                      </span>
                      {q.explanation}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}

          {phase === "answering" ? (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleReset}>
                Hủy
              </Button>
              <Button onClick={handleSubmit}>
                <CheckCircle2 className="size-4" />
                Nộp bài
              </Button>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button onClick={handleReset} variant="outline">
                <RefreshCw className="size-4" />
                Tạo bài mới
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
