"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ClipboardList, Star, BarChart3 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  type SurveyDefinition,
  type SurveyQuestion,
  type SurveyResponse,
  SURVEY_EVENT,
  appendResponse,
  getSurveyData,
} from "@/lib/survey-state";

type AnswerMap = Record<string, string | number | string[]>;

type FillerProps = {
  surveyId: string;
  isAdmin: boolean;
};

export function SurveyFiller({ surveyId, isAdmin }: FillerProps) {
  const [definition, setDefinition] = useState<SurveyDefinition | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);

  const refresh = useCallback(() => {
    const data = getSurveyData(surveyId);
    if (data) {
      setDefinition(data.definition);
      setResponses(data.responses);
    } else {
      setDefinition(null);
      setResponses([]);
    }
    setLoaded(true);
  }, [surveyId]);

  useEffect(() => {
    refresh();
    const handler = (): void => refresh();
    window.addEventListener(SURVEY_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(SURVEY_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, [refresh]);

  const setAnswer = (qid: string, value: string | number | string[]): void => {
    setAnswers((cur) => ({ ...cur, [qid]: value }));
    setErrors((cur) => {
      if (!cur[qid]) return cur;
      const next = { ...cur };
      delete next[qid];
      return next;
    });
  };

  const validate = (def: SurveyDefinition): boolean => {
    const errs: Record<string, string> = {};
    for (const q of def.questions) {
      if (!q.required) continue;
      const a = answers[q.id];
      if (q.type === "text") {
        if (typeof a !== "string" || a.trim().length === 0) {
          errs[q.id] = "Vui lòng nhập câu trả lời.";
        }
      } else if (q.type === "rating") {
        if (typeof a !== "number" || a < 1 || a > 5) {
          errs[q.id] = "Vui lòng chọn số sao.";
        }
      } else {
        if (typeof a !== "string" || a.length === 0) {
          errs[q.id] = "Vui lòng chọn một mục.";
        }
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (!definition) return;
    if (!validate(definition)) return;
    const result = appendResponse(definition.id, { answers });
    if (result) {
      setSubmitted(true);
      setAnswers({});
    }
  };

  if (!loaded) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Đang tải khảo sát...
        </CardContent>
      </Card>
    );
  }

  if (!definition) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="size-5 text-muted-foreground" />
            Khảo sát không tồn tại
          </CardTitle>
          <CardDescription>
            Khảo sát không tồn tại trên thiết bị này. Có thể liên kết đã hết hạn
            hoặc dữ liệu khảo sát chưa được đồng bộ về thiết bị này.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Quay về trang chủ
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (submitted) {
    return (
      <Card className="border-emerald-500/40 bg-emerald-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="size-5" />
            Cảm ơn bạn!
          </CardTitle>
          <CardDescription>
            Phản hồi của bạn đã được ghi nhận.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSubmitted(false)}
          >
            Gửi phản hồi khác
          </Button>
          {isAdmin && (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setSubmitted(false);
                setShowResults(true);
              }}
            >
              <BarChart3 className="size-3.5" />
              Xem kết quả
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="size-5 text-sky-500" />
            {definition.title}
          </CardTitle>
          {definition.description && (
            <CardDescription>{definition.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {definition.questions.map((q, idx) => (
              <QuestionField
                key={q.id}
                index={idx + 1}
                question={q}
                value={answers[q.id]}
                error={errors[q.id]}
                onChange={(v) => setAnswer(q.id, v)}
              />
            ))}
            {definition.questions.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">
                Khảo sát chưa có câu hỏi.
              </p>
            ) : (
              <Button type="submit" className="w-full sm:w-auto">
                Gửi phản hồi
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="size-4 text-violet-500" />
                Kết quả (chỉ admin)
              </CardTitle>
              <CardDescription className="text-xs">
                Tổng {responses.length} phản hồi.
              </CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowResults((v) => !v)}
            >
              {showResults ? "Ẩn" : "Xem kết quả"}
            </Button>
          </CardHeader>
          {showResults && (
            <CardContent>
              <ResultsSummary
                definition={definition}
                responses={responses}
              />
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}

type QuestionFieldProps = {
  index: number;
  question: SurveyQuestion;
  value: string | number | string[] | undefined;
  error: string | undefined;
  onChange: (value: string | number | string[]) => void;
};

function QuestionField({
  index,
  question,
  value,
  error,
  onChange,
}: QuestionFieldProps) {
  const id = `q-${question.id}`;
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">
        <span className="mr-1 text-muted-foreground tabular-nums">
          {index}.
        </span>
        {question.prompt}
        {question.required && (
          <span className="ml-1 text-destructive" aria-hidden>
            *
          </span>
        )}
      </label>

      {question.type === "text" && (
        <textarea
          id={id}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          aria-invalid={error ? true : undefined}
        />
      )}

      {question.type === "rating" && (
        <RatingPicker
          value={typeof value === "number" ? value : 0}
          onChange={onChange}
        />
      )}

      {question.type === "choice" && (
        <div className="space-y-1.5">
          {(question.choices ?? []).map((choice) => {
            const checked = value === choice;
            return (
              <label
                key={choice}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                  checked
                    ? "border-primary bg-primary/10"
                    : "border-input hover:bg-accent",
                )}
              >
                <input
                  type="radio"
                  name={id}
                  value={choice}
                  checked={checked}
                  onChange={() => onChange(choice)}
                  className="size-4"
                />
                <span>{choice}</span>
              </label>
            );
          })}
          {(question.choices ?? []).length === 0 && (
            <p className="text-xs italic text-muted-foreground">
              Câu hỏi chưa có lựa chọn.
            </p>
          )}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function RatingPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-1" role="radiogroup">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= value;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} sao`}
            onClick={() => onChange(n)}
            className={cn(
              "rounded-md p-1 transition-colors",
              active
                ? "text-amber-500"
                : "text-muted-foreground hover:text-amber-400",
            )}
          >
            <Star
              className={cn("size-7", active && "fill-current")}
            />
          </button>
        );
      })}
      {value > 0 && (
        <span className="ml-2 text-sm text-muted-foreground tabular-nums">
          {value}/5
        </span>
      )}
    </div>
  );
}

type RatingSummary = {
  type: "rating";
  count: number;
  avg: number | null;
};

type ChoiceSummary = {
  type: "choice";
  counts: Record<string, number>;
  total: number;
};

type TextSummary = {
  type: "text";
  count: number;
  samples: string[];
};

type SummaryEntry = RatingSummary | ChoiceSummary | TextSummary;

function summarize(
  question: SurveyQuestion,
  responses: SurveyResponse[],
): SummaryEntry {
  if (question.type === "rating") {
    let sum = 0;
    let count = 0;
    for (const r of responses) {
      const a = r.answers[question.id];
      if (typeof a === "number" && Number.isFinite(a)) {
        sum += a;
        count += 1;
      }
    }
    return {
      type: "rating",
      count,
      avg: count === 0 ? null : sum / count,
    };
  }
  if (question.type === "choice") {
    const counts: Record<string, number> = {};
    for (const c of question.choices ?? []) counts[c] = 0;
    let total = 0;
    for (const r of responses) {
      const a = r.answers[question.id];
      if (typeof a === "string") {
        counts[a] = (counts[a] ?? 0) + 1;
        total += 1;
      }
    }
    return { type: "choice", counts, total };
  }
  const samples: string[] = [];
  let count = 0;
  for (const r of responses) {
    const a = r.answers[question.id];
    if (typeof a === "string" && a.trim().length > 0) {
      count += 1;
      if (samples.length < 5) samples.push(a);
    }
  }
  return { type: "text", count, samples };
}

function ResultsSummary({
  definition,
  responses,
}: {
  definition: SurveyDefinition;
  responses: SurveyResponse[];
}) {
  const summaries = useMemo(
    () =>
      definition.questions.map((q) => ({
        question: q,
        summary: summarize(q, responses),
      })),
    [definition, responses],
  );

  if (responses.length === 0) {
    return (
      <p className="text-sm italic text-muted-foreground">
        Chưa có phản hồi nào.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {summaries.map(({ question, summary }, idx) => (
        <div key={question.id} className="rounded-lg border p-3">
          <p className="text-sm font-medium">
            <span className="mr-1 text-muted-foreground tabular-nums">
              {idx + 1}.
            </span>
            {question.prompt}
          </p>
          <div className="mt-2">
            {summary.type === "rating" && (
              <div className="flex items-center gap-2 text-sm">
                <Star className="size-4 fill-current text-amber-500" />
                <span className="font-semibold tabular-nums">
                  {summary.avg === null ? "—" : summary.avg.toFixed(2)}
                </span>
                <span className="text-xs text-muted-foreground">
                  / 5 ({summary.count} phản hồi)
                </span>
              </div>
            )}
            {summary.type === "choice" && (
              <ul className="space-y-1.5">
                {Object.entries(summary.counts).map(([label, n]) => {
                  const pct =
                    summary.total === 0
                      ? 0
                      : Math.round((n / summary.total) * 100);
                  return (
                    <li key={label} className="space-y-0.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate">{label}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {n} · {pct}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {summary.type === "text" && (
              <div className="space-y-1.5">
                <Badge variant="secondary" className="text-[10px]">
                  {summary.count} câu trả lời
                </Badge>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {summary.samples.map((s, i) => (
                    <li
                      key={i}
                      className="rounded bg-muted px-2 py-1 line-clamp-3"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
