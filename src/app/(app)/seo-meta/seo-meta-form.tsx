"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Loader2, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateSeoMetaAction } from "./generate-action";
import {
  INITIAL_SEO_META_STATE,
  type SeoMetaState,
} from "./seo-meta-types";

type FieldKey = "seoTitle" | "metaDescription" | "keywords" | "ogTitle" | "landingH1";

type FieldSpec = {
  key: FieldKey;
  label: string;
  hint: string;
  min: number;
  max: number;
  // soft target — counter still goes amber when within slack but past target
  target?: number;
};

const FIELDS: ReadonlyArray<FieldSpec> = [
  {
    key: "seoTitle",
    label: "SEO Title",
    hint: "Tiêu đề SERP của Google",
    min: 10,
    max: 60,
  },
  {
    key: "metaDescription",
    label: "Meta Description",
    hint: "Đoạn mô tả dưới SERP",
    min: 140,
    max: 160,
    target: 160,
  },
  {
    key: "keywords",
    label: "Keywords (5)",
    hint: "Từ khoá cho meta tag",
    min: 0,
    max: 0,
  },
  {
    key: "ogTitle",
    label: "Open Graph Title",
    hint: "Khi share lên Facebook / Zalo",
    min: 10,
    max: 70,
  },
  {
    key: "landingH1",
    label: "Landing Page H1",
    hint: "Tiêu đề lớn trên trang",
    min: 5,
    max: 80,
  },
];

function counterClass(len: number, min: number, max: number): string {
  if (len < min || len > max) {
    return "bg-destructive/15 text-destructive";
  }
  // amber when within last 10% of max
  const amberThreshold = Math.max(min, Math.floor(max * 0.9));
  if (len >= amberThreshold) {
    return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  }
  return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
}

export function SeoMetaForm() {
  const [state, formAction, pending] = useActionState<SeoMetaState, FormData>(
    generateSeoMetaAction,
    INITIAL_SEO_META_STATE,
  );

  const [cafeName, setCafeName] = useState<string>(
    INITIAL_SEO_META_STATE.cafeName,
  );
  const [usps, setUsps] = useState<string>(INITIAL_SEO_META_STATE.uspsRaw);
  const [copiedKey, setCopiedKey] = useState<FieldKey | null>(null);
  const lastErrorRef = useRef<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync echoed values when a fresh result arrives.
  useEffect(() => {
    if (state.result !== null) {
      setCafeName(state.cafeName);
      setUsps(state.uspsRaw);
    }
  }, [state.result, state.cafeName, state.uspsRaw]);

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

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleCopy = async (key: FieldKey, text: string, label: string) => {
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error("Clipboard API không khả dụng");
      }
      setCopiedKey(key);
      toast.success(`Đã sao chép ${label}`);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedKey(null), 1600);
    } catch {
      toast.error("Không thể sao chép. Vui lòng thử thủ công.");
    }
  };

  const result = state.result;
  const hasResult = result !== null;

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="seo-cafe-name" className="text-sm font-medium">
            Tên quán <span className="text-destructive">*</span>
          </Label>
          <Input
            id="seo-cafe-name"
            name="cafeName"
            value={cafeName}
            onChange={(e) => setCafeName(e.target.value)}
            placeholder="ví dụ: Trầm Cafe & Workspace"
            disabled={pending}
            maxLength={60}
            required
            minLength={2}
          />
          <p className="text-[11px] text-muted-foreground">
            {cafeName.length}/60 ký tự
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="seo-usps" className="text-sm font-medium">
            USP / điểm khác biệt{" "}
            <span className="font-normal text-muted-foreground">
              (1-3 điểm, cách nhau bằng dấu phẩy)
            </span>
          </Label>
          <Input
            id="seo-usps"
            name="usps"
            value={usps}
            onChange={(e) => setUsps(e.target.value)}
            placeholder="ví dụ: specialty coffee, không gian làm việc, brunch cuối tuần"
            disabled={pending}
            maxLength={400}
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button type="submit" disabled={pending || cafeName.trim().length < 2}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : hasResult ? (
              <RefreshCw className="size-4" />
            ) : (
              <Search className="size-4" />
            )}
            {pending
              ? "Đang tạo..."
              : hasResult
                ? "Tạo lại SEO"
                : "Tạo SEO"}
          </Button>
        </div>
      </form>

      {pending && !hasResult ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang viết bộ metadata SEO cho quán bạn...
        </div>
      ) : null}

      {hasResult && result ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Search className="size-3" />
              Kết quả SEO meta
            </div>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              5 trường
            </span>
          </div>

          <ul className="space-y-3">
            {FIELDS.map((field) => {
              const isCopied = copiedKey === field.key;
              const isKeywords = field.key === "keywords";
              const value: string = isKeywords
                ? result.keywords.join(", ")
                : field.key === "seoTitle"
                  ? result.seoTitle
                  : field.key === "metaDescription"
                    ? result.metaDescription
                    : field.key === "ogTitle"
                      ? result.ogTitle
                      : result.landingH1;
              const len = value.length;

              return (
                <li
                  key={field.key}
                  className="flex flex-col gap-3 rounded-lg border bg-card/60 p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-semibold leading-tight">
                        {field.label}
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        {field.hint}
                      </p>
                    </div>
                    {!isKeywords ? (
                      <span
                        className={
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums " +
                          counterClass(len, field.min, field.max)
                        }
                      >
                        {len} / {field.max} ký tự
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary tabular-nums">
                        {result.keywords.length} keyword
                      </span>
                    )}
                  </div>

                  {isKeywords ? (
                    <div className="flex flex-wrap gap-1.5">
                      {result.keywords.map((kw, i) => (
                        <span
                          key={`${i}-${kw}`}
                          className="inline-flex items-center rounded-md border bg-background px-2 py-1 text-xs font-medium"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p
                      className={
                        "rounded-md border bg-background px-3 py-2 text-sm leading-relaxed " +
                        (field.key === "landingH1"
                          ? "text-base font-semibold"
                          : "")
                      }
                    >
                      {value}
                    </p>
                  )}

                  <div className="flex items-center justify-end border-t pt-3">
                    <Button
                      type="button"
                      size="sm"
                      variant={isCopied ? "secondary" : "outline"}
                      onClick={() => handleCopy(field.key, value, field.label)}
                    >
                      {isCopied ? (
                        <Check className="size-4" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                      {isCopied ? "Đã chép" : "Sao chép"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
