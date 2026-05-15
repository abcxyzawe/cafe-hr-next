"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Download, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { generateInteriorAction } from "./generate-action";
import {
  BUDGET_OPTIONS,
  INITIAL_INTERIOR_STATE,
  SPACE_OPTIONS,
  STYLE_OPTIONS,
  type InteriorState,
} from "./interior-types";
import type { InteriorConceptsResult } from "@/lib/xai";

function buildMarkdown(
  style: string,
  budget: string,
  spaceSize: string,
  result: InteriorConceptsResult,
): string {
  const styleLabel =
    STYLE_OPTIONS.find((o) => o.value === style)?.label ?? style;
  const budgetLabel =
    BUDGET_OPTIONS.find((o) => o.value === budget)?.label ?? budget;
  const spaceLabel =
    SPACE_OPTIONS.find((o) => o.value === spaceSize)?.label ?? spaceSize;

  const lines: string[] = [];
  lines.push("# Gợi ý concept nội thất quán cà phê");
  lines.push("");
  lines.push(`- **Phong cách:** ${styleLabel}`);
  lines.push(`- **Ngân sách:** ${budgetLabel}`);
  lines.push(`- **Diện tích:** ${spaceLabel}`);
  lines.push("");
  result.concepts.forEach((c, i) => {
    lines.push(`## ${i + 1}. ${c.name}`);
    lines.push("");
    lines.push(`**Dự trù:** ${c.budgetBand}`);
    lines.push("");
    lines.push(c.description);
    lines.push("");
    lines.push("**Yếu tố then chốt:**");
    c.keyElements.forEach((k) => lines.push(`- ${k}`));
    lines.push("");
    lines.push("**Bảng màu:**");
    c.palette.forEach((p) => lines.push(`- ${p.name} \`${p.hex}\``));
    lines.push("");
  });
  return lines.join("\n");
}

export function InteriorForm() {
  const [state, formAction, pending] = useActionState<InteriorState, FormData>(
    generateInteriorAction,
    INITIAL_INTERIOR_STATE,
  );

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

  const result = state.result;
  const hasResult = result !== null;

  const handleDownload = () => {
    if (!result) return;
    try {
      const md = buildMarkdown(
        state.style,
        state.budget,
        state.spaceSize,
        result,
      );
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `concept-noi-that-${stamp}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Đã tải file Markdown.");
    } catch {
      toast.error("Không thể tải file. Vui lòng thử lại.");
    }
  };

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-5">
        <fieldset className="space-y-2" disabled={pending}>
          <legend className="text-sm font-medium">Phong cách định hướng</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {STYLE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-md border bg-card/50 px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent/30 has-[:checked]:border-primary has-[:checked]:bg-primary/10"
              >
                <input
                  type="radio"
                  name="style"
                  value={opt.value}
                  defaultChecked={opt.value === state.style}
                  className="size-4"
                  required
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2" disabled={pending}>
          <legend className="text-sm font-medium">Ngân sách</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {BUDGET_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-md border bg-card/50 px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent/30 has-[:checked]:border-primary has-[:checked]:bg-primary/10"
              >
                <input
                  type="radio"
                  name="budget"
                  value={opt.value}
                  defaultChecked={opt.value === state.budget}
                  className="size-4"
                  required
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2" disabled={pending}>
          <legend className="text-sm font-medium">Diện tích</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {SPACE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-md border bg-card/50 px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent/30 has-[:checked]:border-primary has-[:checked]:bg-primary/10"
              >
                <input
                  type="radio"
                  name="spaceSize"
                  value={opt.value}
                  defaultChecked={opt.value === state.spaceSize}
                  className="size-4"
                  required
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex items-center justify-end gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : hasResult ? (
              <RefreshCw className="size-4" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {pending
              ? "Đang sinh concept..."
              : hasResult
                ? "Tạo lại 4 concept"
                : "Tạo 4 concept"}
          </Button>
        </div>
      </form>

      {pending && !hasResult ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang phác thảo 4 không gian khác biệt cho quán bạn...
        </div>
      ) : null}

      {hasResult && result ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="size-3" />
              4 concept đề xuất
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

          <div className="grid gap-4 sm:grid-cols-2">
            {result.concepts.map((c, i) => (
              <article
                key={`${i}-${c.name}`}
                className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm"
              >
                <header className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-semibold leading-tight">
                    {c.name}
                  </h3>
                  <Badge variant="secondary" className="shrink-0">
                    {c.budgetBand}
                  </Badge>
                </header>

                <p className="text-sm leading-relaxed text-muted-foreground">
                  {c.description}
                </p>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Yếu tố then chốt
                  </div>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {c.keyElements.map((k, j) => (
                      <li key={j}>{k}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Bảng màu
                  </div>
                  <div className="flex gap-3">
                    {c.palette.map((p, j) => (
                      <div
                        key={`${j}-${p.hex}`}
                        className="flex flex-col items-center gap-1 text-center"
                      >
                        <div
                          className="size-10 rounded-md border shadow-sm"
                          style={{ backgroundColor: p.hex }}
                          aria-label={`${p.name} ${p.hex}`}
                        />
                        <div className="text-[11px] font-medium leading-tight">
                          {p.name}
                        </div>
                        <div className="text-[10px] font-mono uppercase text-muted-foreground">
                          {p.hex}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
