"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Briefcase,
  Download,
  Frown,
  Gift,
  Heart,
  Loader2,
  Package,
  RefreshCw,
  ShieldCheck,
  Smile,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateValuePropAction } from "./generate-action";
import {
  INITIAL_VALUE_PROP_STATE,
  PRODUCT_MAX,
  PRODUCT_MIN,
  SEGMENT_MAX,
  SEGMENT_MIN,
  type ValuePropState,
} from "./value-prop-types";

const TEXTAREA_CLASS =
  "flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50";

function buildMarkdown(state: ValuePropState): string {
  const canvas = state.canvas;
  if (!canvas) return "";
  const lines: string[] = [];
  lines.push("# Value Proposition Canvas");
  lines.push("");
  lines.push(`- **Phân khúc khách hàng:** ${state.values.segment.trim()}`);
  lines.push(`- **Sản phẩm/Dịch vụ:** ${state.values.product.trim()}`);
  if (state.generatedAt !== null) {
    const d = new Date(state.generatedAt);
    lines.push(`- **Tạo lúc:** ${d.toLocaleString("vi-VN")}`);
  }
  lines.push("");
  lines.push("## Hồ sơ khách hàng");
  lines.push("");
  lines.push("### Công việc của khách (Customer Jobs)");
  canvas.customerProfile.jobs.forEach((j, i) => {
    lines.push(`${i + 1}. ${j}`);
  });
  lines.push("");
  lines.push("### Nỗi đau (Pains)");
  canvas.customerProfile.pains.forEach((p, i) => {
    lines.push(`${i + 1}. ${p}`);
  });
  lines.push("");
  lines.push("### Niềm vui (Gains)");
  canvas.customerProfile.gains.forEach((g, i) => {
    lines.push(`${i + 1}. ${g}`);
  });
  lines.push("");
  lines.push("## Bản đồ giá trị");
  lines.push("");
  lines.push("### Sản phẩm & Dịch vụ (Products & Services)");
  canvas.valueMap.products.forEach((p, i) => {
    lines.push(`${i + 1}. ${p}`);
  });
  lines.push("");
  lines.push("### Giảm đau (Pain Relievers)");
  canvas.valueMap.painRelievers.forEach((p, i) => {
    lines.push(`${i + 1}. ${p}`);
  });
  lines.push("");
  lines.push("### Tạo niềm vui (Gain Creators)");
  canvas.valueMap.gainCreators.forEach((g, i) => {
    lines.push(`${i + 1}. ${g}`);
  });
  lines.push("");
  return lines.join("\n");
}

type SectionTone = "slate" | "rose" | "emerald" | "sky" | "amber" | "violet";

const TONE_CLASS: Record<SectionTone, string> = {
  slate:
    "border-slate-200/70 bg-slate-50/70 dark:border-slate-800/60 dark:bg-slate-950/30",
  rose: "border-rose-200/70 bg-rose-50/70 dark:border-rose-900/60 dark:bg-rose-950/30",
  emerald:
    "border-emerald-200/70 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/30",
  sky: "border-sky-200/70 bg-sky-50/70 dark:border-sky-900/60 dark:bg-sky-950/30",
  amber:
    "border-amber-200/70 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/30",
  violet:
    "border-violet-200/70 bg-violet-50/70 dark:border-violet-900/60 dark:bg-violet-950/30",
};

const TONE_LABEL_CLASS: Record<SectionTone, string> = {
  slate: "text-slate-700 dark:text-slate-300",
  rose: "text-rose-700 dark:text-rose-400",
  emerald: "text-emerald-700 dark:text-emerald-400",
  sky: "text-sky-700 dark:text-sky-400",
  amber: "text-amber-700 dark:text-amber-400",
  violet: "text-violet-700 dark:text-violet-400",
};

type CanvasSectionProps = {
  title: string;
  subtitle: string;
  tone: SectionTone;
  items: string[];
  icon: React.ReactNode;
};

function CanvasSection({
  title,
  subtitle,
  tone,
  items,
  icon,
}: CanvasSectionProps) {
  return (
    <div className={`space-y-2 rounded-xl border p-3 shadow-sm ${TONE_CLASS[tone]}`}>
      <div
        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${TONE_LABEL_CLASS[tone]}`}
      >
        {icon}
        {title}
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {subtitle}
      </p>
      <ul className="space-y-1.5">
        {items.map((entry, i) => (
          <li
            key={`${title}-${i}`}
            className="flex gap-2 text-sm leading-relaxed text-foreground"
          >
            <span
              className={`mt-1 inline-block size-1.5 shrink-0 rounded-full bg-current ${TONE_LABEL_CLASS[tone]}`}
              aria-hidden
            />
            <span>{entry}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ValuePropForm() {
  const [state, formAction, pending] = useActionState<
    ValuePropState,
    FormData
  >(generateValuePropAction, INITIAL_VALUE_PROP_STATE);

  const [segment, setSegment] = useState<string>(
    INITIAL_VALUE_PROP_STATE.values.segment,
  );
  const [product, setProduct] = useState<string>(
    INITIAL_VALUE_PROP_STATE.values.product,
  );
  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (state.canvas !== null) {
      setSegment(state.values.segment);
      setProduct(state.values.product);
    }
  }, [state.canvas, state.values]);

  useEffect(() => {
    if (state.error && state.error !== lastErrorRef.current) {
      lastErrorRef.current = state.error;
      toast.error(state.error);
    }
    if (!state.error) {
      lastErrorRef.current = null;
    }
  }, [state.error]);

  const trimmedSegment = segment.trim();
  const trimmedProduct = product.trim();
  const segmentValid =
    trimmedSegment.length >= SEGMENT_MIN &&
    trimmedSegment.length <= SEGMENT_MAX;
  const productValid =
    trimmedProduct.length >= PRODUCT_MIN &&
    trimmedProduct.length <= PRODUCT_MAX;
  const formValid = segmentValid && productValid;

  const canvas = state.canvas;
  const hasCanvas = canvas !== null;

  function handleExport(): void {
    const md = buildMarkdown(state);
    if (!md) return;
    try {
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `value-prop-canvas-${stamp}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Đã tải file Markdown.");
    } catch {
      toast.error("Không thể tải file. Vui lòng thử lại.");
    }
  }

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="vp-segment" className="text-sm font-medium">
            Phân khúc khách hàng mục tiêu{" "}
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="vp-segment"
            name="segment"
            type="text"
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            placeholder="ví dụ: Sinh viên đại học khu vực quận 1"
            disabled={pending}
            required
            minLength={SEGMENT_MIN}
            maxLength={SEGMENT_MAX}
          />
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {trimmedSegment.length}/{SEGMENT_MAX} ký tự (tối thiểu {SEGMENT_MIN})
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="vp-product" className="text-sm font-medium">
            Mô tả sản phẩm/dịch vụ{" "}
            <span className="text-destructive">*</span>
          </Label>
          <textarea
            id="vp-product"
            name="product"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            placeholder="ví dụ: Quán cà phê specialty không gian học bài yên tĩnh, wifi mạnh, ổ cắm tại mỗi bàn, combo cà phê + bánh ngọt sinh viên giá rẻ"
            disabled={pending}
            required
            minLength={PRODUCT_MIN}
            maxLength={PRODUCT_MAX}
            rows={4}
            className={TEXTAREA_CLASS}
          />
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {trimmedProduct.length}/{PRODUCT_MAX} ký tự (tối thiểu {PRODUCT_MIN})
          </p>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button type="submit" disabled={pending || !formValid}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : hasCanvas ? (
              <RefreshCw className="size-4" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {pending
              ? "Đang tạo..."
              : hasCanvas
                ? "Tạo lại canvas"
                : "Tạo canvas"}
          </Button>
        </div>
      </form>

      {pending && !hasCanvas ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang dựng Value Proposition Canvas theo khung Strategyzer...
        </div>
      ) : null}

      {hasCanvas && canvas ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="size-3" />
              Value Proposition Canvas
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExport}
            >
              <Download className="size-4" />
              Tải markdown
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <article className="space-y-3 rounded-2xl border bg-card/60 p-4 shadow-sm sm:p-5">
              <header className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Users className="size-4" />
                </span>
                <div>
                  <h3 className="text-base font-semibold leading-tight">
                    Hồ sơ khách hàng
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Customer Profile · {state.values.segment.trim()}
                  </p>
                </div>
              </header>

              <CanvasSection
                title="Công việc"
                subtitle="Những việc/nhu cầu khách muốn hoàn thành."
                tone="slate"
                items={canvas.customerProfile.jobs}
                icon={<Briefcase className="size-3" />}
              />
              <CanvasSection
                title="Nỗi đau"
                subtitle="Khó chịu/cản trở khách thường gặp."
                tone="rose"
                items={canvas.customerProfile.pains}
                icon={<Frown className="size-3" />}
              />
              <CanvasSection
                title="Niềm vui"
                subtitle="Lợi ích/kỳ vọng khách mong muốn."
                tone="emerald"
                items={canvas.customerProfile.gains}
                icon={<Smile className="size-3" />}
              />
            </article>

            <article className="space-y-3 rounded-2xl border bg-card/60 p-4 shadow-sm sm:p-5">
              <header className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Package className="size-4" />
                </span>
                <div>
                  <h3 className="text-base font-semibold leading-tight">
                    Bản đồ giá trị
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Value Map · sản phẩm/dịch vụ của quán
                  </p>
                </div>
              </header>

              <CanvasSection
                title="Sản phẩm/Dịch vụ"
                subtitle="Sản phẩm/dịch vụ cụ thể quán cung cấp."
                tone="sky"
                items={canvas.valueMap.products}
                icon={<Package className="size-3" />}
              />
              <CanvasSection
                title="Giảm đau"
                subtitle="Cách quán xoa dịu nỗi đau của khách."
                tone="amber"
                items={canvas.valueMap.painRelievers}
                icon={<ShieldCheck className="size-3" />}
              />
              <CanvasSection
                title="Tạo niềm vui"
                subtitle="Cách quán tạo lợi ích vượt mong đợi."
                tone="violet"
                items={canvas.valueMap.gainCreators}
                icon={<Gift className="size-3" />}
              />
            </article>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] italic text-muted-foreground">
            <Heart className="size-3 text-rose-500" />
            Khớp 3 niềm vui ↔ 3 cách tạo niềm vui và 3 nỗi đau ↔ 3 cách giảm
            đau để đánh giá độ ăn khớp (fit) của value proposition.
          </div>
        </section>
      ) : null}
    </div>
  );
}
