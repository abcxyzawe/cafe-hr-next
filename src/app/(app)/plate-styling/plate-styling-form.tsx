"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Download,
  Loader2,
  Printer,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generatePlateStylingAction } from "./generate-action";
import {
  BACKGROUND_OPTIONS,
  DISH_NAME_MAX,
  DISH_NAME_MIN,
  GARNISHES_MAX,
  INITIAL_PLATE_STYLING_STATE,
  MOOD_OPTIONS,
  PLATE_SHAPE_OPTIONS,
  type PlateStylingState,
} from "./types";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export function PlateStylingForm() {
  const [state, formAction, pending] = useActionState<
    PlateStylingState,
    FormData
  >(generatePlateStylingAction, INITIAL_PLATE_STYLING_STATE);

  const lastErrorRef = useRef<string | null>(null);
  const lastGenRef = useRef<number | null>(null);

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
    if (
      state.generatedAt &&
      state.result &&
      state.generatedAt !== lastGenRef.current
    ) {
      lastGenRef.current = state.generatedAt;
      toast.success("Đã tạo concept trình bày món.");
    }
  }, [state.generatedAt, state.result]);

  const formRef = useRef<HTMLFormElement | null>(null);
  const result = state.result;
  const hasResult = result !== null;
  const imageSrc = result
    ? `data:image/png;base64,${result.imageBase64}`
    : null;

  function handleDownload(): void {
    if (!imageSrc) return;
    try {
      const nameSlug = slugify(state.dishName) || "mon";
      const moodSlug = slugify(state.mood) || "concept";
      const a = document.createElement("a");
      a.href = imageSrc;
      a.download = `plate-${nameSlug}-${moodSlug}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Đang tải ảnh concept...");
    } catch {
      toast.error("Không thể tải ảnh. Vui lòng thử lại.");
    }
  }

  function handlePrint(): void {
    if (typeof window === "undefined") return;
    window.print();
  }

  return (
    <div className="space-y-6">
      <form ref={formRef} action={formAction} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="dishName">
            Tên món ({DISH_NAME_MIN}-{DISH_NAME_MAX} ký tự)
          </Label>
          <Input
            id="dishName"
            name="dishName"
            required
            minLength={DISH_NAME_MIN}
            maxLength={DISH_NAME_MAX}
            defaultValue={state.dishName}
            placeholder="VD: Bánh mì thịt nướng, Bún chả Hà Nội, Cà phê sữa đá"
            disabled={pending}
          />
        </div>

        <fieldset className="space-y-2" disabled={pending}>
          <legend className="text-sm font-medium">Kiểu đĩa</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {PLATE_SHAPE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-md border bg-card/50 px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent/30 has-[:checked]:border-primary has-[:checked]:bg-primary/10"
              >
                <input
                  type="radio"
                  name="plateShape"
                  value={opt.value}
                  defaultChecked={opt.value === state.plateShape}
                  className="size-4"
                  required
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2" disabled={pending}>
          <legend className="text-sm font-medium">Phong cách trình bày</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {MOOD_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-md border bg-card/50 px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent/30 has-[:checked]:border-primary has-[:checked]:bg-primary/10"
              >
                <input
                  type="radio"
                  name="mood"
                  value={opt.value}
                  defaultChecked={opt.value === state.mood}
                  className="size-4"
                  required
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2" disabled={pending}>
          <legend className="text-sm font-medium">Nền chụp</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {BACKGROUND_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-md border bg-card/50 px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent/30 has-[:checked]:border-primary has-[:checked]:bg-primary/10"
              >
                <input
                  type="radio"
                  name="background"
                  value={opt.value}
                  defaultChecked={opt.value === state.background}
                  className="size-4"
                  required
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="garnishes">
            Trang trí{" "}
            <span className="text-muted-foreground">
              (tuỳ chọn, tối đa {GARNISHES_MAX} ký tự)
            </span>
          </Label>
          <textarea
            id="garnishes"
            name="garnishes"
            maxLength={GARNISHES_MAX}
            defaultValue={state.garnishes}
            placeholder="VD: lá bạc hà, hoa edible, lát ớt đỏ, mè rang"
            rows={2}
            disabled={pending}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

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
              ? "Đang vẽ ~10s..."
              : hasResult
                ? "Tạo lại"
                : "Tạo concept"}
          </Button>
        </div>
      </form>

      {pending ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang dựng concept trình bày món 1024x1024. Quá trình mất khoảng
          10 giây...
        </div>
      ) : null}

      {hasResult && result && imageSrc ? (
        <section className="space-y-4">
          <div
            id="plate-print-area"
            className="mx-auto w-full max-w-xl overflow-hidden rounded-2xl border bg-card shadow-md"
          >
            <div className="relative aspect-square w-full bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt={`Concept trình bày món ${state.dishName}`}
                className="block size-full object-cover"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 print:hidden">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleDownload}
            >
              <Download className="size-4" />
              Tải ảnh
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handlePrint}
            >
              <Printer className="size-4" />
              In
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => {
                formRef.current?.requestSubmit();
              }}
            >
              <RefreshCw className="size-4" />
              Tạo lại
            </Button>
          </div>
        </section>
      ) : null}

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #plate-print-area, #plate-print-area * { visibility: visible !important; }
          #plate-print-area {
            position: fixed !important;
            inset: 0 !important;
            margin: auto !important;
            width: 90vw !important;
            max-width: 600px !important;
          }
        }
      `}</style>
    </div>
  );
}
