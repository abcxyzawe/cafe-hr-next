"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Loader2, RefreshCw, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateNamesAction } from "./generate-action";
import {
  CAFE_NAME_STYLES,
  CAFE_NAME_VIBES,
  INITIAL_CAFE_NAME_STATE,
  type CafeNameState,
  type CafeNameStyle,
  type CafeNameVibe,
} from "./name-types";

export function NameGeneratorForm() {
  const [state, formAction, pending] = useActionState<
    CafeNameState,
    FormData
  >(generateNamesAction, INITIAL_CAFE_NAME_STATE);

  const [vibe, setVibe] = useState<CafeNameVibe>(
    INITIAL_CAFE_NAME_STATE.vibe,
  );
  const [style, setStyle] = useState<CafeNameStyle>(
    INITIAL_CAFE_NAME_STATE.style,
  );
  const [hints, setHints] = useState<string>(INITIAL_CAFE_NAME_STATE.hintsRaw);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const lastErrorRef = useRef<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync echoed values from server when a fresh result arrives.
  useEffect(() => {
    if (state.names !== null) {
      setVibe(state.vibe);
      setStyle(state.style);
      setHints(state.hintsRaw);
    }
  }, [state.names, state.vibe, state.style, state.hintsRaw]);

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

  const handleCopy = async (idx: number, name: string, tagline: string) => {
    const text = `${name} — ${tagline}`;
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
      setCopiedIdx(idx);
      toast.success(`Đã sao chép "${name}"`);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedIdx(null), 1600);
    } catch {
      toast.error("Không thể sao chép. Vui lòng thử thủ công.");
    }
  };

  const names = state.names;
  const hasResults = names !== null && names.length > 0;

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Vibe quán</Label>
          <div
            role="radiogroup"
            aria-label="Vibe quán"
            className="grid grid-cols-2 gap-2 sm:grid-cols-4"
          >
            {CAFE_NAME_VIBES.map((opt) => {
              const selected = vibe === opt.value;
              return (
                <label
                  key={opt.value}
                  className={
                    "flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors " +
                    (selected
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-input bg-background hover:bg-accent hover:text-accent-foreground")
                  }
                >
                  <input
                    type="radio"
                    name="vibe"
                    value={opt.value}
                    checked={selected}
                    onChange={() => setVibe(opt.value)}
                    disabled={pending}
                    className="sr-only"
                  />
                  <span>{opt.label}</span>
                  <span
                    className={
                      "text-[11px] font-normal " +
                      (selected
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground")
                    }
                  >
                    {opt.hint}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Phong cách ngôn ngữ</Label>
          <div
            role="radiogroup"
            aria-label="Phong cách ngôn ngữ"
            className="grid grid-cols-1 gap-2 sm:grid-cols-3"
          >
            {CAFE_NAME_STYLES.map((opt) => {
              const selected = style === opt.value;
              return (
                <label
                  key={opt.value}
                  className={
                    "flex cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition-colors " +
                    (selected
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-input bg-background hover:bg-accent hover:text-accent-foreground")
                  }
                >
                  <input
                    type="radio"
                    name="style"
                    value={opt.value}
                    checked={selected}
                    onChange={() => setStyle(opt.value)}
                    disabled={pending}
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name-gen-hints" className="text-sm font-medium">
            Từ khoá gợi ý{" "}
            <span className="font-normal text-muted-foreground">
              (tuỳ chọn, tối đa 3 từ, cách nhau bằng dấu phẩy)
            </span>
          </Label>
          <Input
            id="name-gen-hints"
            name="hints"
            value={hints}
            onChange={(e) => setHints(e.target.value)}
            placeholder="ví dụ: trăng, sách, mộc"
            disabled={pending}
            maxLength={120}
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : hasResults ? (
              <RefreshCw className="size-4" />
            ) : (
              <Wand2 className="size-4" />
            )}
            {pending
              ? "Đang sáng tạo..."
              : hasResults
                ? "Tạo lại 8 tên"
                : "Tạo 8 tên"}
          </Button>
        </div>
      </form>

      {pending && !hasResults ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang nghĩ ra 8 cái tên độc đáo cho quán bạn...
        </div>
      ) : null}

      {hasResults ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Wand2 className="size-3" />
              8 gợi ý tên quán
            </div>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {names.length} cái tên
            </span>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            {names.map((item, i) => {
              const isCopied = copiedIdx === i;
              return (
                <li
                  key={`${i}-${item.name}`}
                  className="flex flex-col gap-3 rounded-lg border bg-card/60 p-4 shadow-sm"
                >
                  <div className="space-y-1">
                    <h3 className="text-xl font-semibold leading-tight">
                      {item.name}
                    </h3>
                    <p className="text-sm italic leading-snug text-foreground/80">
                      “{item.tagline}”
                    </p>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {item.rationale}
                  </p>
                  <div className="mt-auto flex items-center justify-end border-t pt-3">
                    <Button
                      type="button"
                      size="sm"
                      variant={isCopied ? "secondary" : "outline"}
                      onClick={() => handleCopy(i, item.name, item.tagline)}
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
