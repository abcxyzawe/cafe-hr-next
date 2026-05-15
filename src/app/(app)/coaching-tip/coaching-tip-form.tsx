"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  ClipboardCopy,
  Download,
  Lightbulb,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { generateCoachingTipAction } from "./generate-action";
import {
  COACHING_FOCUS_OPTIONS,
  INITIAL_COACHING_TIP_STATE,
  type CoachingTipEmployee,
  type CoachingTipState,
} from "./coaching-tip-types";

type Props = {
  employees: ReadonlyArray<CoachingTipEmployee>;
};

function buildMarkdown(state: CoachingTipState): string {
  const focusLabel =
    COACHING_FOCUS_OPTIONS.find((o) => o.value === state.focus)?.label ??
    state.focus;
  const dateStr = new Date(state.generatedAt ?? Date.now())
    .toISOString()
    .slice(0, 10);
  return [
    `# Lời khuyên coaching cho ${state.employeeName}`,
    "",
    `- **Vị trí:** ${state.employeeRole}`,
    `- **Chủ đề:** ${focusLabel}`,
    `- **Ngày tạo:** ${dateStr}`,
    "",
    "## Lời khuyên",
    "",
    state.tip ?? "",
    "",
  ].join("\n");
}

export function CoachingTipForm({ employees }: Props) {
  const [state, formAction, pending] = useActionState<
    CoachingTipState,
    FormData
  >(generateCoachingTipAction, INITIAL_COACHING_TIP_STATE);

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

  const hasResult = state.tip !== null && !pending;
  const noEmployees = employees.length === 0;

  const handleCopy = async () => {
    if (!state.tip) return;
    try {
      await navigator.clipboard.writeText(state.tip);
      toast.success("Đã sao chép lời khuyên.");
    } catch {
      toast.error("Không sao chép được. Vui lòng thử lại.");
    }
  };

  const handleDownload = () => {
    if (!state.tip || !state.employeeName) return;
    try {
      const md = buildMarkdown(state);
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = state.employeeName
        .normalize("NFKD")
        .replace(/[^\w-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase()
        .slice(0, 40) || "nhanvien";
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `coaching-${safeName}-${state.focus}-${stamp}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Đã tải file Markdown.");
    } catch {
      toast.error("Không tải được file. Vui lòng thử lại.");
    }
  };

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-5">
        <fieldset className="space-y-2" disabled={pending || noEmployees}>
          <Label htmlFor="coaching-employee" className="text-sm font-medium">
            Nhân viên
          </Label>
          <Select
            id="coaching-employee"
            name="employeeId"
            defaultValue={
              state.employeeId !== null ? String(state.employeeId) : ""
            }
            required
          >
            <option value="" disabled>
              -- Chọn nhân viên --
            </option>
            {employees.map((emp) => (
              <option key={emp.id} value={String(emp.id)}>
                {emp.name} — {emp.role}
              </option>
            ))}
          </Select>
          {noEmployees ? (
            <p className="text-xs text-muted-foreground">
              Chưa có nhân viên nào trong hệ thống.
            </p>
          ) : null}
        </fieldset>

        <fieldset className="space-y-2" disabled={pending}>
          <legend className="text-sm font-medium">Lĩnh vực coaching</legend>
          <div
            role="radiogroup"
            aria-label="Lĩnh vực coaching"
            className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5"
          >
            {COACHING_FOCUS_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer flex-col gap-0.5 rounded-md border bg-card/50 px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent/30 has-[:checked]:border-primary has-[:checked]:bg-primary/10"
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="focus"
                    value={opt.value}
                    defaultChecked={opt.value === state.focus}
                    className="size-4"
                    required
                  />
                  <span className="font-medium">{opt.label}</span>
                </span>
                <span className="pl-6 text-[11px] text-muted-foreground">
                  {opt.hint}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex items-center justify-end gap-2">
          <Button type="submit" disabled={pending || noEmployees}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : hasResult ? (
              <RefreshCw className="size-4" />
            ) : (
              <Lightbulb className="size-4" />
            )}
            {pending
              ? "Đang soạn..."
              : hasResult
                ? "Tạo lại lời khuyên"
                : "Tạo lời khuyên"}
          </Button>
        </div>
      </form>

      {pending ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang soạn lời khuyên coaching cá nhân hoá...
        </div>
      ) : null}

      {hasResult && state.tip ? (
        <section className="space-y-3 rounded-lg border bg-amber-50/60 p-4 shadow-sm dark:bg-amber-500/5">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-0.5">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                <Sparkles className="size-3" />
                Lời khuyên dành cho
              </div>
              <h2 className="text-lg font-semibold leading-tight">
                {state.employeeName}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  · {state.employeeRole}
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Chủ đề:{" "}
                {COACHING_FOCUS_OPTIONS.find((o) => o.value === state.focus)
                  ?.label ?? state.focus}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCopy}
              >
                <ClipboardCopy className="size-4" />
                Sao chép
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleDownload}
              >
                <Download className="size-4" />
                Tải .md
              </Button>
            </div>
          </header>

          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {state.tip}
          </p>
        </section>
      ) : null}
    </div>
  );
}
