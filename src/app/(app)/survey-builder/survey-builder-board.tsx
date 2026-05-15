"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Copy,
  Pencil,
  Plus,
  Trash2,
  X,
  Save,
  ListChecks,
  Link2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QrCode } from "@/components/qr-code";
import {
  type QuestionType,
  type SurveyDefinition,
  type SurveyQuestion,
  SURVEY_EVENT,
  deleteSurvey,
  getSurveyData,
  listSurveys,
  saveSurveyDefinition,
  shortId,
} from "@/lib/survey-state";

type DraftQuestion = {
  id: string;
  type: QuestionType;
  prompt: string;
  required: boolean;
  choicesText: string;
};

type Draft = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  questions: DraftQuestion[];
};

function questionToDraft(q: SurveyQuestion): DraftQuestion {
  return {
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    required: q.required,
    choicesText: q.choices ? q.choices.join("\n") : "",
  };
}

function definitionToDraft(def: SurveyDefinition): Draft {
  return {
    id: def.id,
    title: def.title,
    description: def.description,
    createdAt: def.createdAt,
    questions: def.questions.map(questionToDraft),
  };
}

function emptyDraft(): Draft {
  return {
    id: shortId(),
    title: "",
    description: "",
    createdAt: new Date().toISOString(),
    questions: [
      {
        id: shortId(),
        type: "rating",
        prompt: "",
        required: true,
        choicesText: "",
      },
    ],
  };
}

function draftToDefinition(d: Draft): SurveyDefinition {
  const questions: SurveyQuestion[] = d.questions
    .filter((q) => q.prompt.trim().length > 0)
    .map((q) => {
      const out: SurveyQuestion = {
        id: q.id,
        type: q.type,
        prompt: q.prompt.trim(),
        required: q.required,
      };
      if (q.type === "choice") {
        out.choices = q.choicesText
          .split("\n")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      }
      return out;
    });
  return {
    id: d.id,
    title: d.title.trim() || "Khảo sát không tên",
    description: d.description.trim(),
    createdAt: d.createdAt,
    questions,
  };
}

function questionTypeLabel(t: QuestionType): string {
  switch (t) {
    case "text":
      return "Văn bản";
    case "rating":
      return "Đánh giá 1-5 sao";
    case "choice":
      return "Lựa chọn";
  }
}

export function SurveyBuilderBoard() {
  const [surveys, setSurveys] = useState<SurveyDefinition[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [origin, setOrigin] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setSurveys(listSurveys());
  }, []);

  useEffect(() => {
    setOrigin(window.location.origin);
    refresh();
    const handler = (): void => refresh();
    window.addEventListener(SURVEY_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(SURVEY_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, [refresh]);

  const surveyResponseCounts = useMemo<Record<string, number>>(() => {
    const out: Record<string, number> = {};
    for (const s of surveys) {
      const data = getSurveyData(s.id);
      out[s.id] = data?.responses.length ?? 0;
    }
    return out;
  }, [surveys]);

  const handleNew = (): void => setDraft(emptyDraft());

  const handleEdit = (id: string): void => {
    const data = getSurveyData(id);
    if (data) setDraft(definitionToDraft(data.definition));
  };

  const handleDelete = (id: string): void => {
    if (!window.confirm("Xoá khảo sát này? Các phản hồi cũng sẽ bị xoá.")) {
      return;
    }
    deleteSurvey(id);
    refresh();
  };

  const handleSave = (): void => {
    if (!draft) return;
    const def = draftToDefinition(draft);
    if (def.questions.length === 0) {
      window.alert("Cần ít nhất 1 câu hỏi có nội dung.");
      return;
    }
    saveSurveyDefinition(def);
    setDraft(null);
    refresh();
  };

  const handleCopyLink = async (id: string): Promise<void> => {
    const url = `${origin}/survey/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      window.setTimeout(() => {
        setCopiedId((cur) => (cur === id ? null : cur));
      }, 1500);
    } catch {
      window.prompt("Sao chép liên kết:", url);
    }
  };

  const updateDraft = (mutator: (d: Draft) => Draft): void => {
    setDraft((cur) => (cur ? mutator(cur) : cur));
  };

  const updateQuestion = (
    qid: string,
    mutator: (q: DraftQuestion) => DraftQuestion,
  ): void => {
    updateDraft((d) => ({
      ...d,
      questions: d.questions.map((q) => (q.id === qid ? mutator(q) : q)),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {surveys.length === 0
            ? "Chưa có khảo sát nào."
            : `Tổng cộng ${surveys.length} khảo sát.`}
        </div>
        <Button onClick={handleNew} size="sm">
          <Plus className="size-3.5" />
          Tạo khảo sát mới
        </Button>
      </div>

      {surveys.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <ListChecks className="size-8 text-muted-foreground/60" />
            Bấm &ldquo;Tạo khảo sát mới&rdquo; để bắt đầu.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {surveys.map((s) => {
            const url = origin ? `${origin}/survey/${s.id}` : `/survey/${s.id}`;
            const responseCount = surveyResponseCounts[s.id] ?? 0;
            return (
              <Card key={s.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                  <div className="min-w-0 flex-1 space-y-1">
                    <CardTitle className="truncate text-base">
                      {s.title}
                    </CardTitle>
                    {s.description && (
                      <CardDescription className="line-clamp-2 text-xs">
                        {s.description}
                      </CardDescription>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                      <Badge variant="secondary">{s.questions.length} câu</Badge>
                      <Badge variant="outline">{responseCount} phản hồi</Badge>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(s.id)}
                      aria-label="Chỉnh sửa"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(s.id)}
                      aria-label="Xoá"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex shrink-0 justify-center sm:justify-start">
                    <QrCode data={url} size={120} framed={false} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Link2 className="size-3.5 text-muted-foreground" />
                      <code className="truncate rounded bg-muted px-1.5 py-0.5 text-[11px]">
                        {url}
                      </code>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          void handleCopyLink(s.id);
                        }}
                      >
                        <Copy className="size-3.5" />
                        {copiedId === s.id ? "Đã sao chép" : "Sao chép link"}
                      </Button>
                      <a
                        href={`/survey/${s.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
                      >
                        Mở khảo sát
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent
          className="max-w-2xl max-h-[85vh] overflow-y-auto"
          onClose={() => setDraft(null)}
        >
          <DialogHeader>
            <DialogTitle>
              {draft && surveys.some((s) => s.id === draft.id)
                ? "Chỉnh sửa khảo sát"
                : "Tạo khảo sát mới"}
            </DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="survey-title">Tiêu đề</Label>
                <Input
                  id="survey-title"
                  value={draft.title}
                  onChange={(e) =>
                    updateDraft((d) => ({ ...d, title: e.target.value }))
                  }
                  placeholder="VD: Khảo sát chất lượng dịch vụ"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="survey-desc">Mô tả</Label>
                <textarea
                  id="survey-desc"
                  value={draft.description}
                  onChange={(e) =>
                    updateDraft((d) => ({ ...d, description: e.target.value }))
                  }
                  placeholder="Mô tả ngắn gọn cho khách hàng (tuỳ chọn)"
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Câu hỏi</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updateDraft((d) => ({
                        ...d,
                        questions: [
                          ...d.questions,
                          {
                            id: shortId(),
                            type: "text",
                            prompt: "",
                            required: false,
                            choicesText: "",
                          },
                        ],
                      }))
                    }
                  >
                    <Plus className="size-3.5" />
                    Thêm câu hỏi
                  </Button>
                </div>

                <div className="space-y-3">
                  {draft.questions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="rounded-lg border bg-muted/30 p-3 space-y-2"
                    >
                      <div className="flex items-start gap-2">
                        <span className="mt-1 text-xs font-semibold text-muted-foreground tabular-nums">
                          #{idx + 1}
                        </span>
                        <div className="flex-1 space-y-2">
                          <Input
                            value={q.prompt}
                            onChange={(e) =>
                              updateQuestion(q.id, (cur) => ({
                                ...cur,
                                prompt: e.target.value,
                              }))
                            }
                            placeholder="Nội dung câu hỏi"
                          />
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <Select
                              value={q.type}
                              onChange={(e) => {
                                const t = e.target.value as QuestionType;
                                updateQuestion(q.id, (cur) => ({
                                  ...cur,
                                  type: t,
                                }));
                              }}
                            >
                              <option value="text">{questionTypeLabel("text")}</option>
                              <option value="rating">
                                {questionTypeLabel("rating")}
                              </option>
                              <option value="choice">
                                {questionTypeLabel("choice")}
                              </option>
                            </Select>
                            <label className="inline-flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={q.required}
                                onChange={(e) =>
                                  updateQuestion(q.id, (cur) => ({
                                    ...cur,
                                    required: e.target.checked,
                                  }))
                                }
                                className="size-4 rounded border-input"
                              />
                              Bắt buộc
                            </label>
                          </div>
                          {q.type === "choice" && (
                            <textarea
                              value={q.choicesText}
                              onChange={(e) =>
                                updateQuestion(q.id, (cur) => ({
                                  ...cur,
                                  choicesText: e.target.value,
                                }))
                              }
                              placeholder="Mỗi dòng là một lựa chọn"
                              rows={3}
                              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                            />
                          )}
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            updateDraft((d) => ({
                              ...d,
                              questions: d.questions.filter(
                                (item) => item.id !== q.id,
                              ),
                            }))
                          }
                          aria-label="Xoá câu hỏi"
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {draft.questions.length === 0 && (
                    <p className="text-xs italic text-muted-foreground">
                      Chưa có câu hỏi nào. Bấm &ldquo;Thêm câu hỏi&rdquo;.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDraft(null)}
                >
                  Huỷ
                </Button>
                <Button type="button" onClick={handleSave}>
                  <Save className="size-3.5" />
                  Lưu khảo sát
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
