"use client";

import { useState, useTransition } from "react";
import {
  Coffee,
  Milk,
  Thermometer,
  Snowflake,
  Leaf,
  Sparkles,
  Loader2,
  Timer,
  Scale,
  Wrench,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Recipe } from "@/lib/recipe-catalogue";
import { getBrewingTipAction } from "./tip-action";

const ICON_MAP: Record<
  Recipe["iconName"],
  React.ComponentType<{ className?: string }>
> = {
  coffee: Coffee,
  milk: Milk,
  thermometer: Thermometer,
  snowflake: Snowflake,
  leaf: Leaf,
};

const CATEGORY_BORDER: Record<Recipe["category"], string> = {
  espresso: "border-l-amber-700",
  milk: "border-l-orange-300",
  cold: "border-l-sky-400",
  tea: "border-l-emerald-500",
};

const CATEGORY_TINT: Record<Recipe["category"], string> = {
  espresso: "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200",
  milk: "bg-orange-100 text-orange-900 dark:bg-orange-900/30 dark:text-orange-200",
  cold: "bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-200",
  tea: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200",
};

type DifficultyMeta = {
  label: string;
  variant: "success" | "warning" | "destructive";
};

const DIFFICULTY_META: Record<Recipe["difficulty"], DifficultyMeta> = {
  easy: { label: "Dễ", variant: "success" },
  medium: { label: "Trung bình", variant: "warning" },
  hard: { label: "Khó", variant: "destructive" },
};

function formatBrewTime(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.round((seconds / 3600) * 10) / 10;
    return `${h} giờ`;
  }
  if (seconds >= 60) {
    const m = Math.round(seconds / 60);
    return `${m} phút`;
  }
  return `${seconds} giây`;
}

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const Icon = ICON_MAP[recipe.iconName];
  const difficulty = DIFFICULTY_META[recipe.difficulty];

  const [isPending, startTransition] = useTransition();
  const [tip, setTip] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleAskTip() {
    setError(null);
    startTransition(async () => {
      const res = await getBrewingTipAction(recipe.id);
      if (res.ok) {
        setTip(res.tip);
      } else {
        setTip(null);
        setError(res.error);
      }
    });
  }

  return (
    <Card
      className={cn(
        "flex h-full flex-col border-l-4 transition-shadow hover:shadow-md",
        CATEGORY_BORDER[recipe.category],
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg",
                CATEGORY_TINT[recipe.category],
              )}
            >
              <Icon className="size-5" />
            </span>
            <span className="leading-tight">{recipe.name}</span>
          </CardTitle>
          <Badge variant={difficulty.variant} className="shrink-0">
            {difficulty.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5 rounded-md bg-muted/40 px-2 py-1.5">
            <Timer className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">Chiết:</span>
            <span className="font-medium tabular-nums">
              {formatBrewTime(recipe.brewTimeSeconds)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-md bg-muted/40 px-2 py-1.5">
            <Scale className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">Tỉ lệ:</span>
            <span className="font-medium">{recipe.ratio}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Wrench className="size-3.5 shrink-0 text-muted-foreground" />
          {recipe.equipment.map((eq) => (
            <span
              key={eq}
              className="rounded-full border border-input bg-background px-2 py-0.5 text-[11px] font-medium text-foreground"
            >
              {eq}
            </span>
          ))}
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Các bước pha chế
          </p>
          <ol className="space-y-1.5 text-sm">
            {recipe.steps.map((step, i) => (
              <li key={i} className="flex gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                  {i + 1}
                </span>
                <span className="leading-snug text-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-auto space-y-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAskTip}
            disabled={isPending}
            className="w-full"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {tip ? "Lấy mẹo khác" : "Mẹo của AI"}
          </Button>

          {isPending ? (
            <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin text-primary" />
              Head barista đang gõ phím...
            </div>
          ) : error ? (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : tip ? (
            <div className="space-y-1 rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                <Sparkles className="size-3" />
                Mẹo của head barista
              </div>
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                {tip}
              </p>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
