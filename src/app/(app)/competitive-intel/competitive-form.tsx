"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Download,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Swords,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { analyzeCompetitiveAction } from "./analyze-action";
import {
  INITIAL_COMPETITIVE_STATE,
  MAX_COMPETITORS,
  MIN_COMPETITORS,
  type CompetitiveState,
  type CompetitorInput,
} from "./competitive-types";
import type { CompetitiveLandscapeResult } from "@/lib/xai";

const TEXTAREA_CLASS =
  "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50";

function buildMarkdown(
  ownName: string,
  ownUsp: string,
  competitors: CompetitorInput[],
  result: CompetitiveLandscapeResult,
): string {
  const lines: string[] = [];
  lines.push("# Phân tích cạnh tranh");
  lines.push("");
  lines.push(`## Quán: ${ownName.trim() || "(chưa đặt tên)"}`);
  lines.push("");
  lines.push(`**USP:** ${ownUsp.trim()}`);
  lines.push("");
  lines.push("## Đối thủ");
  lines.push("");
  competitors.forEach((c, i) => {
    lines.push(`${i + 1}. **${c.name.trim()}** — ${c.notes.trim()}`);
  });
  lines.push("");
  lines.push("## Điểm khác biệt");
  lines.push("");
  lines.push(result.differentiation);
  lines.push("");
  lines.push("## 3 Cơ hội");
  lines.push("");
  result.opportunities.forEach((o, i) => {
    lines.push(`${i + 1}. ${o}`);
  });
  lines.push("");
  lines.push("## 3 Rủi ro cần cảnh giác");
  lines.push("");
  result.risks.forEach((r, i) => {
    lines.push(`${i + 1}. ${r}`);
  });
  lines.push("");
  return lines.join("\n");
}

export function CompetitiveForm() {
  const [state, formAction, pending] = useActionState<
    CompetitiveState,
    FormData
  >(analyzeCompetitiveAction, INITIAL_COMPETITIVE_STATE);

  const [ownName, setOwnName] = useState<string>(
    INITIAL_COMPETITIVE_STATE.ownName,
  );
  const [ownUsp, setOwnUsp] = useState<string>(
    INITIAL_COMPETITIVE_STATE.ownUsp,
  );
  const [competitors, setCompetitors] = useState<CompetitorInput[]>(
    INITIAL_COMPETITIVE_STATE.competitors,
  );
  const lastErrorRef = useRef<string | null>(null);

  // Sync echoed values from server when a fresh result arrives.
  useEffect(() => {
    if (state.result !== null) {
      setOwnName(state.ownName);
      setOwnUsp(state.ownUsp);
      if (state.competitors.length > 0) {
        setCompetitors(state.competitors);
      }
    }
  }, [state.result, state.ownName, state.ownUsp, state.competitors]);

  // Toast on new errors.
  useEffect(() => {
    if (state.error && state.error !== lastErrorRef.current) {
      lastErrorRef.current = state.error;
      toast.error(state.error);
    }
    if (!state.error) {
      lastErrorRef.current = null;
    }
  }, [state.error]);

  const updateCompetitor = (
    idx: number,
    field: keyof CompetitorInput,
    value: string,
  ) => {
    setCompetitors((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)),
    );
  };

  const addCompetitor = () => {
    setCompetitors((prev) =>
      prev.length >= MAX_COMPETITORS
        ? prev
        : [...prev, { name: "", notes: "" }],
    );
  };

  const removeCompetitor = (idx: number) => {
    setCompetitors((prev) =>
      prev.length <= MIN_COMPETITORS
        ? prev
        : prev.filter((_, i) => i !== idx),
    );
  };

  const handleDownload = () => {
    const result = state.result;
    if (!result) return;
    try {
      const md = buildMarkdown(ownName, ownUsp, competitors, result);
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `phan-tich-canh-tranh-${stamp}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Đã tải file Markdown.");
    } catch {
      toast.error("Không thể tải file. Vui lòng thử lại.");
    }
  };

  const trimmedOwnName = ownName.trim();
  const trimmedOwnUsp = ownUsp.trim();
  const ownNameValid =
    trimmedOwnName.length >= 5 && trimmedOwnName.length <= 200;
  const ownUspValid = trimmedOwnUsp.length >= 5 && trimmedOwnUsp.length <= 200;
  const competitorsValid =
    competitors.length >= MIN_COMPETITORS &&
    competitors.length <= MAX_COMPETITORS &&
    competitors.every((c) => {
      const n = c.name.trim();
      const note = c.notes.trim();
      return (
        n.length >= 5 &&
        n.length <= 200 &&
        note.length >= 5 &&
        note.length <= 200
      );
    });
  const formValid = ownNameValid && ownUspValid && competitorsValid;

  const result = state.result;
  const hasResult = result !== null;
  const canAddMore = competitors.length < MAX_COMPETITORS;
  const canRemove = competitors.length > MIN_COMPETITORS;

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="ci-own-name" className="text-sm font-medium">
            Tên quán của bạn <span className="text-destructive">*</span>
          </Label>
          <Input
            id="ci-own-name"
            name="ownName"
            type="text"
            value={ownName}
            onChange={(e) => setOwnName(e.target.value)}
            placeholder="ví dụ: The Hideaway Coffee"
            disabled={pending}
            required
            minLength={5}
            maxLength={200}
          />
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {trimmedOwnName.length}/200 ký tự (tối thiểu 5)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ci-own-usp" className="text-sm font-medium">
            USP / điểm khác biệt cốt lõi{" "}
            <span className="text-destructive">*</span>
          </Label>
          <textarea
            id="ci-own-usp"
            name="ownUsp"
            value={ownUsp}
            onChange={(e) => setOwnUsp(e.target.value)}
            placeholder="ví dụ: cà phê specialty rang xay tại quán, không gian co-working yên tĩnh, brunch cuối tuần"
            disabled={pending}
            required
            minLength={5}
            maxLength={200}
            rows={3}
            className={TEXTAREA_CLASS}
          />
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {trimmedOwnUsp.length}/200 ký tự (tối thiểu 5)
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-sm font-medium">
              Đối thủ ({competitors.length}/{MAX_COMPETITORS}){" "}
              <span className="text-destructive">*</span>
            </Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addCompetitor}
              disabled={pending || !canAddMore}
            >
              <Plus className="size-4" />
              Thêm đối thủ
            </Button>
          </div>

          <ul className="space-y-3">
            {competitors.map((c, idx) => {
              const trimmedName = c.name.trim();
              const trimmedNotes = c.notes.trim();
              return (
                <li
                  key={idx}
                  className="space-y-3 rounded-lg border bg-card/50 p-3 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <Swords className="size-3" />
                      Đối thủ #{idx + 1}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeCompetitor(idx)}
                      disabled={pending || !canRemove}
                    >
                      <Trash2 className="size-4" />
                      Xoá
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor={`ci-comp-name-${idx}`}
                      className="text-xs font-medium"
                    >
                      Tên đối thủ
                    </Label>
                    <Input
                      id={`ci-comp-name-${idx}`}
                      name="competitorName"
                      type="text"
                      value={c.name}
                      onChange={(e) =>
                        updateCompetitor(idx, "name", e.target.value)
                      }
                      placeholder="ví dụ: Highlands Coffee"
                      disabled={pending}
                      required
                      minLength={5}
                      maxLength={200}
                    />
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {trimmedName.length}/200 ký tự (tối thiểu 5)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor={`ci-comp-notes-${idx}`}
                      className="text-xs font-medium"
                    >
                      Định vị / ghi chú
                    </Label>
                    <textarea
                      id={`ci-comp-notes-${idx}`}
                      name="competitorNotes"
                      value={c.notes}
                      onChange={(e) =>
                        updateCompetitor(idx, "notes", e.target.value)
                      }
                      placeholder="ví dụ: chuỗi lớn, giá tầm trung, không gian rộng, mạnh về cà phê đá"
                      disabled={pending}
                      required
                      minLength={5}
                      maxLength={200}
                      rows={3}
                      className={TEXTAREA_CLASS}
                    />
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {trimmedNotes.length}/200 ký tự (tối thiểu 5)
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button type="submit" disabled={pending || !formValid}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : hasResult ? (
              <RefreshCw className="size-4" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {pending
              ? "Đang phân tích..."
              : hasResult
                ? "Phân tích lại"
                : "Phân tích"}
          </Button>
        </div>
      </form>

      {pending && !hasResult ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang đối chiếu định vị của bạn với các đối thủ...
        </div>
      ) : null}

      {hasResult && result ? (
        <section className="space-y-5">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="size-3" />
              Kết quả phân tích
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleDownload}
            >
              <Download className="size-4" />
              Tải markdown
            </Button>
          </div>

          <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-accent/20 to-background p-5 shadow-sm sm:p-6">
            <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Target className="size-3.5" />
              Điểm khác biệt
            </div>
            <p className="text-base leading-relaxed text-foreground sm:text-lg">
              {result.differentiation}
            </p>
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              <TrendingUp className="size-3.5" />3 Cơ hội đáng theo đuổi
            </div>
            <ul className="grid gap-3 sm:grid-cols-3">
              {result.opportunities.map((opp, i) => (
                <li
                  key={`opp-${i}`}
                  className="flex flex-col gap-2 rounded-xl border border-emerald-200/70 bg-emerald-50/70 p-4 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/30"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">
                      {i + 1}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                      Cơ hội
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground">
                    {opp}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-400">
              <AlertTriangle className="size-3.5" />3 Rủi ro cần cảnh giác
            </div>
            <ul className="grid gap-3 sm:grid-cols-3">
              {result.risks.map((risk, i) => (
                <li
                  key={`risk-${i}`}
                  className="flex flex-col gap-2 rounded-xl border border-rose-200/70 bg-rose-50/70 p-4 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/30"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-full bg-rose-600 text-xs font-semibold text-white">
                      {i + 1}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-400">
                      Rủi ro
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground">
                    {risk}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}
