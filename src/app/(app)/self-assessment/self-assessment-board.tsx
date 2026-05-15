"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  BookmarkPlus,
  Gauge,
  History,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ASSESSMENT_EVENT,
  STORAGE_KEY,
  deleteResult,
  getHistory,
  saveResult,
  type AssessmentResult,
} from "@/lib/self-assessment-state";
import { generateAssessmentAction } from "./generate-action";

type Phase = "setup" | "answering" | "result";

type RoleOption = {
  value: "barista" | "server" | "cashier" | "manager";
  label: string;
};

const ROLE_OPTIONS: ReadonlyArray<RoleOption> = [
  { value: "barista", label: "Barista (pha chế)" },
  { value: "server", label: "Phục vụ bàn" },
  { value: "cashier", label: "Thu ngân" },
  { value: "manager", label: "Quản lý ca" },
];

const LIKERT_LABELS: ReadonlyArray<string> = [
  "Hoàn toàn không đồng ý",
  "Không đồng ý",
  "Trung lập",
  "Đồng ý",
  "Hoàn toàn đồng ý",
];

function isRole(value: string): value is RoleOption["value"] {
  return ROLE_OPTIONS.some((o) => o.value === value);
}

function computeScore(answers: ReadonlyArray<number>): number {
  const sum = answers.reduce((acc, n) => acc + n, 0);
  return Math.round((sum / (answers.length * 5)) * 100);
}

function scoreColors(score: number): {
  text: string;
  bg: string;
  ring: string;
  label: string;
} {
  if (score < 40) {
    return {
      text: "text-rose-700 dark:text-rose-400",
      bg: "bg-rose-500/10",
      ring: "ring-rose-500/40",
      label: "Cần được quan tâm",
    };
  }
  if (score <= 65) {
    return {
      text: "text-amber-700 dark:text-amber-400",
      bg: "bg-amber-500/10",
      ring: "ring-amber-500/40",
      label: "Tạm ổn — có thể cải thiện",
    };
  }
  return {
    text: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    ring: "ring-emerald-500/40",
    label: "Đang rất hạnh phúc",
  };
}

const DATE_FMT = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatTakenAt(iso: string): string {
  try {
    return DATE_FMT.format(new Date(iso));
  } catch {
    return iso;
  }
}

export function SelfAssessmentBoard({
  initialRole,
}: {
  initialRole: string;
}) {
  const safeInitialRole: RoleOption["value"] = isRole(initialRole)
    ? initialRole
    : "barista";

  const [phase, setPhase] = useState<Phase>("setup");
  const [role, setRole] = useState<RoleOption["value"]>(safeInitialRole);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Array<number | null>>([]);
  const [history, setHistory] = useState<AssessmentResult[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [savedThisSession, setSavedThisSession] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setHistory(getHistory());
    setHydrated(true);

    const refresh = () => setHistory(getHistory());
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === STORAGE_KEY) refresh();
    };
    window.addEventListener(ASSESSMENT_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(ASSESSMENT_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  function handleStart() {
    startTransition(async () => {
      const res = await generateAssessmentAction(role);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setQuestions(res.questions);
      setAnswers(new Array<number | null>(res.questions.length).fill(null));
      setSavedThisSession(false);
      setPhase("answering");
    });
  }

  function handlePick(qIdx: number, value: number) {
    setAnswers((prev) => {
      const next = prev.slice();
      next[qIdx] = value;
      return next;
    });
  }

  function handleSubmit() {
    const missing = answers.findIndex((a) => a === null);
    if (missing !== -1) {
      toast.error(`Bạn chưa trả lời câu ${missing + 1}.`);
      return;
    }
    setPhase("result");
  }

  function handleReset() {
    setPhase("setup");
    setQuestions([]);
    setAnswers([]);
    setSavedThisSession(false);
  }

  function handleSave() {
    const numeric = answers.filter((a): a is number => a !== null);
    if (numeric.length !== questions.length) {
      toast.error("Câu trả lời chưa đầy đủ.");
      return;
    }
    const overall = computeScore(numeric);
    saveResult({
      overallScore: overall,
      questions,
      answers: numeric,
    });
    setSavedThisSession(true);
    toast.success("Đã lưu kết quả vào nhật ký riêng tư.");
  }

  function handleDelete(id: string) {
    deleteResult(id);
    toast.success("Đã xoá kết quả.");
  }

  const numericAnswers: number[] =
    phase === "result"
      ? answers.filter((a): a is number => a !== null)
      : [];
  const score =
    phase === "result" && numericAnswers.length === questions.length
      ? computeScore(numericAnswers)
      : 0;
  const colors = scoreColors(score);

  return (
    <div className="space-y-6">
      {phase === "setup" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-primary" />
              Bắt đầu bài tự đánh giá
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:max-w-sm">
              <Label htmlFor="self-assessment-role">Vai trò của bạn</Label>
              <Select
                id="self-assessment-role"
                value={role}
                disabled={pending}
                onChange={(e) => {
                  const v = e.currentTarget.value;
                  if (isRole(v)) setRole(v);
                }}
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">
                Câu hỏi sẽ được điều chỉnh theo vai trò bạn chọn.
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleStart} disabled={pending}>
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Bắt đầu
              </Button>
            </div>
            {pending ? (
              <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-primary" />
                AI đang soạn 10 câu hỏi cho bạn...
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {phase === "answering" || phase === "result" ? (
        <div className="space-y-4">
          {phase === "result" ? (
            <Card
              className={cn(
                "border-primary/30 bg-gradient-to-br from-primary/10 via-background to-accent/20",
              )}
            >
              <CardContent className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <span
                    className={cn(
                      "flex size-24 items-center justify-center rounded-full ring-4 shadow-md",
                      colors.bg,
                      colors.ring,
                    )}
                  >
                    <span
                      className={cn(
                        "text-3xl font-bold tabular-nums",
                        colors.text,
                      )}
                    >
                      {score}
                    </span>
                  </span>
                  <div>
                    <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Gauge className="size-4" />
                      Chỉ số hạnh phúc tổng thể
                    </p>
                    <p
                      className={cn(
                        "text-xl font-semibold leading-tight",
                        colors.text,
                      )}
                    >
                      {colors.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Trung bình{" "}
                      {(
                        numericAnswers.reduce((a, n) => a + n, 0) /
                        numericAnswers.length
                      ).toFixed(2)}
                      /5 điểm trên {questions.length} câu.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handleSave}
                    disabled={savedThisSession}
                    variant={savedThisSession ? "outline" : "default"}
                  >
                    <BookmarkPlus className="size-4" />
                    {savedThisSession ? "Đã lưu" : "Lưu kết quả"}
                  </Button>
                  <Button onClick={handleReset} variant="outline">
                    <RefreshCw className="size-4" />
                    Bắt đầu lại
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {questions.map((q, qIdx) => {
            const picked = answers[qIdx];
            const isResult = phase === "result";
            return (
              <Card key={qIdx}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-start gap-2 text-base">
                    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {qIdx + 1}
                    </span>
                    <span className="flex-1 leading-snug">{q}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="grid gap-2 sm:grid-cols-5"
                    role="radiogroup"
                    aria-label={`Câu ${qIdx + 1}`}
                  >
                    {LIKERT_LABELS.map((label, i) => {
                      const value = i + 1;
                      const checked = picked === value;
                      return (
                        <label
                          key={value}
                          className={cn(
                            "flex cursor-pointer flex-col items-center gap-1 rounded-md border bg-card px-2 py-2 text-center text-xs transition-colors",
                            "hover:bg-accent/40",
                            checked
                              ? "border-primary/60 bg-primary/5 ring-2 ring-primary/30"
                              : "border-input",
                            isResult && "cursor-default",
                          )}
                        >
                          <input
                            type="radio"
                            name={`q-${qIdx}`}
                            value={value}
                            checked={checked}
                            disabled={isResult}
                            onChange={() => handlePick(qIdx, value)}
                            className="sr-only"
                          />
                          <span className="text-base font-semibold tabular-nums">
                            {value}
                          </span>
                          <span className="leading-tight text-muted-foreground">
                            {label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
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
                <Gauge className="size-4" />
                Xem kết quả
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="size-4 text-primary" />
            Nhật ký tự đánh giá
            {hydrated ? (
              <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {history.length}
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hydrated ? (
            <p className="text-sm text-muted-foreground">Đang tải nhật ký...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Chưa có kết quả nào được lưu trên thiết bị này.
            </p>
          ) : (
            <ul className="space-y-2">
              {history.map((item) => {
                const c = scoreColors(item.overallScore);
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 rounded-md border bg-card p-3"
                  >
                    <span
                      className={cn(
                        "flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums ring-2",
                        c.bg,
                        c.ring,
                        c.text,
                      )}
                    >
                      {item.overallScore}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm font-semibold", c.text)}>
                        {c.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTakenAt(item.takenAt)} · {item.questions.length}{" "}
                        câu
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item.id)}
                      aria-label="Xoá kết quả"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
