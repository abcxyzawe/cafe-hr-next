"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Compass,
  Download,
  Heart,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateVisionStatementAction } from "./generate-action";
import {
  INITIAL_VISION_STATEMENT_STATE,
  type VisionStatementState,
} from "./vision-statement-types";
import type { VisionStatementResult } from "@/lib/xai";

function buildMarkdown(result: VisionStatementResult): string {
  const lines: string[] = [];
  lines.push("# Tuyên ngôn thương hiệu");
  lines.push("");
  lines.push("## Tầm nhìn");
  lines.push("");
  lines.push(`> ${result.vision}`);
  lines.push("");
  lines.push("## Sứ mệnh");
  lines.push("");
  lines.push(result.mission);
  lines.push("");
  lines.push("## Giá trị cốt lõi");
  lines.push("");
  result.values.forEach((v, i) => {
    lines.push(`${i + 1}. **${v.name}** — ${v.description}`);
  });
  lines.push("");
  return lines.join("\n");
}

export function VisionStatementForm() {
  const [state, formAction, pending] = useActionState<
    VisionStatementState,
    FormData
  >(generateVisionStatementAction, INITIAL_VISION_STATEMENT_STATE);

  const [years, setYears] = useState<string>(
    String(INITIAL_VISION_STATEMENT_STATE.yearsInBusiness),
  );
  const [targetCustomer, setTargetCustomer] = useState<string>(
    INITIAL_VISION_STATEMENT_STATE.targetCustomer,
  );
  const [usp, setUsp] = useState<string>(INITIAL_VISION_STATEMENT_STATE.usp);
  const lastErrorRef = useRef<string | null>(null);

  // Sync echoed values from server when a fresh result arrives.
  useEffect(() => {
    if (state.result !== null) {
      setYears(String(state.yearsInBusiness));
      setTargetCustomer(state.targetCustomer);
      setUsp(state.usp);
    }
  }, [state.result, state.yearsInBusiness, state.targetCustomer, state.usp]);

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

  const handleDownload = () => {
    const result = state.result;
    if (!result) return;
    try {
      const md = buildMarkdown(result);
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `tuyen-ngon-thuong-hieu-${stamp}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Đã tải file Markdown.");
    } catch {
      toast.error("Không thể tải file. Vui lòng thử lại.");
    }
  };

  const result = state.result;
  const hasResult = result !== null;

  const trimmedTarget = targetCustomer.trim();
  const trimmedUsp = usp.trim();
  const yearsNum = Number(years);
  const yearsValid =
    Number.isFinite(yearsNum) &&
    Math.round(yearsNum) >= 1 &&
    Math.round(yearsNum) <= 50;
  const formValid =
    yearsValid &&
    trimmedTarget.length >= 5 &&
    trimmedTarget.length <= 200 &&
    trimmedUsp.length >= 5 &&
    trimmedUsp.length <= 200;

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label
            htmlFor="vision-years"
            className="text-sm font-medium"
          >
            Số năm hoạt động <span className="text-destructive">*</span>
          </Label>
          <Input
            id="vision-years"
            name="yearsInBusiness"
            type="number"
            inputMode="numeric"
            min={1}
            max={50}
            step={1}
            value={years}
            onChange={(e) => setYears(e.target.value)}
            placeholder="ví dụ: 3"
            disabled={pending}
            required
            className="max-w-[160px]"
          />
          <p className="text-[11px] text-muted-foreground">
            Từ 1 đến 50 năm.
          </p>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="vision-target"
            className="text-sm font-medium"
          >
            Khách hàng mục tiêu{" "}
            <span className="text-destructive">*</span>
          </Label>
          <textarea
            id="vision-target"
            name="targetCustomer"
            value={targetCustomer}
            onChange={(e) => setTargetCustomer(e.target.value)}
            placeholder="ví dụ: nhân viên văn phòng 25-35 tuổi cần không gian làm việc yên tĩnh"
            disabled={pending}
            required
            minLength={5}
            maxLength={200}
            rows={3}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {trimmedTarget.length}/200 ký tự (tối thiểu 5)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="vision-usp" className="text-sm font-medium">
            USP / điểm khác biệt cốt lõi{" "}
            <span className="text-destructive">*</span>
          </Label>
          <textarea
            id="vision-usp"
            name="usp"
            value={usp}
            onChange={(e) => setUsp(e.target.value)}
            placeholder="ví dụ: cà phê specialty rang xay tại quán, không gian co-working, brunch cuối tuần"
            disabled={pending}
            required
            minLength={5}
            maxLength={200}
            rows={3}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {trimmedUsp.length}/200 ký tự (tối thiểu 5)
          </p>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button type="submit" disabled={pending || !formValid}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : hasResult ? (
              <RefreshCw className="size-4" />
            ) : (
              <Wand2 className="size-4" />
            )}
            {pending
              ? "Đang soạn..."
              : hasResult
                ? "Tạo lại tuyên ngôn"
                : "Tạo tuyên ngôn"}
          </Button>
        </div>
      </form>

      {pending && !hasResult ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang chắt lọc tinh thần thương hiệu của bạn...
        </div>
      ) : null}

      {hasResult && result ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="size-3" />
              Tuyên ngôn thương hiệu
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
              <Compass className="size-3.5" />
              Tầm nhìn
            </div>
            <blockquote className="text-xl font-semibold italic leading-snug text-foreground sm:text-2xl">
              “{result.vision}”
            </blockquote>
          </div>

          <div className="rounded-2xl border bg-card/60 p-5 shadow-sm sm:p-6">
            <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Target className="size-3.5" />
              Sứ mệnh
            </div>
            <p className="text-base leading-relaxed text-foreground sm:text-lg">
              {result.mission}
            </p>
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Heart className="size-3.5" />5 Giá trị cốt lõi
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {result.values.map((v, i) => (
                <li
                  key={`${i}-${v.name}`}
                  className="flex flex-col gap-2 rounded-xl border bg-card/60 p-4 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    <h3 className="text-base font-semibold leading-tight">
                      {v.name}
                    </h3>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {v.description}
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
