"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2, Sparkles, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generatePairingsAction } from "./generate-action";
import {
  INITIAL_PAIRINGS_STATE,
  PAIRING_MOODS,
  type PairingsState,
} from "./pairings-types";
import type { PairingPriceTier } from "@/lib/xai";

const PRICE_TIER_LABEL: Record<PairingPriceTier, string> = {
  budget: "Bình dân",
  mid: "Trung cấp",
  premium: "Cao cấp",
};

const PRICE_TIER_CHIP: Record<PairingPriceTier, string> = {
  budget:
    "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30",
  mid:
    "bg-amber-100 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30",
  premium:
    "bg-rose-100 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30",
};

function buildMarkdown(state: PairingsState): string {
  const lines: string[] = [];
  lines.push(`# Gợi ý món kèm cho "${state.drinkName}"`);
  const moodLabel =
    PAIRING_MOODS.find((m) => m.value === state.mood)?.label ?? state.mood;
  lines.push(`**Tâm trạng khách:** ${moodLabel}`);
  if (state.generatedAt) {
    lines.push(
      `**Tạo lúc:** ${new Date(state.generatedAt).toLocaleString("vi-VN")}`,
    );
  }
  lines.push("");
  state.pairings?.forEach((p, i) => {
    lines.push(`## ${i + 1}. ${p.name}`);
    lines.push(`- **Mức giá:** ${PRICE_TIER_LABEL[p.priceTier]}`);
    lines.push(`- **Lý do:** ${p.reasoning}`);
    lines.push("");
  });
  return lines.join("\n");
}

export function PairingsForm() {
  const [state, formAction, pending] = useActionState<PairingsState, FormData>(
    generatePairingsAction,
    INITIAL_PAIRINGS_STATE,
  );

  const [drinkName, setDrinkName] = useState<string>(
    INITIAL_PAIRINGS_STATE.drinkName,
  );
  const [mood, setMood] = useState<PairingsState["mood"]>(
    INITIAL_PAIRINGS_STATE.mood,
  );
  const lastErrorRef = useRef<string | null>(null);

  // Sync server-echoed inputs when a fresh result arrives.
  useEffect(() => {
    if (state.pairings !== null) {
      setDrinkName(state.drinkName);
      setMood(state.mood);
    }
  }, [state.pairings, state.drinkName, state.mood]);

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

  const pairings = state.pairings;
  const hasResults = pairings !== null && pairings.length > 0;

  const charCount = drinkName.trim().length;
  const drinkValid = charCount >= 2 && charCount <= 60;

  const exportFileName = useMemo(() => {
    const slug = state.drinkName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40);
    return `pairings-${slug || "drink"}.md`;
  }, [state.drinkName]);

  const handleExport = () => {
    if (!hasResults) return;
    const md = buildMarkdown(state);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Đã tải Markdown");
  };

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pairings-drink-name" className="text-sm font-medium">
            Tên đồ uống
          </Label>
          <Input
            id="pairings-drink-name"
            name="drinkName"
            value={drinkName}
            onChange={(e) => setDrinkName(e.target.value)}
            placeholder="VD: Cà phê sữa đá, Latte vanilla, Trà đào cam sả..."
            minLength={2}
            maxLength={60}
            required
            disabled={pending}
          />
          <p className="text-[11px] text-muted-foreground">
            {charCount}/60 ký tự (yêu cầu 2-60).
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Tâm trạng khách</Label>
          <div
            role="radiogroup"
            aria-label="Tâm trạng khách"
            className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4"
          >
            {PAIRING_MOODS.map((opt) => {
              const selected = mood === opt.value;
              return (
                <label
                  key={opt.value}
                  className={
                    "flex cursor-pointer flex-col gap-0.5 rounded-md border px-3 py-2 text-sm transition-colors " +
                    (selected
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-input bg-background hover:bg-accent hover:text-accent-foreground")
                  }
                >
                  <input
                    type="radio"
                    name="mood"
                    value={opt.value}
                    checked={selected}
                    onChange={() => setMood(opt.value)}
                    disabled={pending}
                    className="sr-only"
                  />
                  <span className="font-medium">{opt.label}</span>
                  <span
                    className={
                      "text-[11px] " +
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

        <div className="flex flex-wrap items-center justify-end gap-2">
          {hasResults ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleExport}
              disabled={pending}
            >
              <Download className="size-4" />
              Tải Markdown
            </Button>
          ) : null}
          <Button type="submit" disabled={pending || !drinkValid}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {pending ? "Đang gợi ý..." : "Gợi ý 3 món kèm"}
          </Button>
        </div>
      </form>

      {pending && !hasResults ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang chọn 3 món kèm phù hợp nhất...
        </div>
      ) : null}

      {hasResults ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <UtensilsCrossed className="size-3" />
              3 gợi ý món kèm cho &quot;{state.drinkName}&quot;
            </div>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {pairings.length} món
            </span>
          </div>

          <ul className="grid gap-3 sm:grid-cols-3">
            {pairings.map((p, i) => (
              <li
                key={`${i}-${p.name}`}
                className="flex flex-col gap-3 rounded-lg border bg-card/60 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-semibold leading-snug">
                    {p.name}
                  </h3>
                  <span
                    className={
                      "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold " +
                      PRICE_TIER_CHIP[p.priceTier]
                    }
                  >
                    {PRICE_TIER_LABEL[p.priceTier]}
                  </span>
                </div>
                <p className="text-sm italic leading-relaxed text-muted-foreground">
                  {p.reasoning}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
