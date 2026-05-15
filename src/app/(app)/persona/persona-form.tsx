"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Download,
  Loader2,
  RefreshCw,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { generatePersonasAction } from "./generate-action";
import {
  INITIAL_PERSONA_STATE,
  PERSONA_LOCATIONS,
  PERSONA_PRICE_TIERS,
  PERSONA_VIBES,
  personaLocationLabel,
  personaPriceTierLabel,
  personaVibeLabel,
  type PersonaLocation,
  type PersonaPriceTier,
  type PersonaState,
  type PersonaVibe,
} from "./persona-types";
import type { CustomerPersona } from "@/lib/xai";

function downloadMarkdown(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildMarkdown(state: PersonaState): string {
  const personas = state.personas ?? [];
  const lines: string[] = [];
  lines.push(`# Customer Personas`);
  lines.push("");
  lines.push(`- Vibe: ${personaVibeLabel(state.vibe)}`);
  lines.push(`- Địa điểm: ${personaLocationLabel(state.location)}`);
  lines.push(`- Phân khúc giá: ${personaPriceTierLabel(state.priceTier)}`);
  lines.push("");

  personas.forEach((p, idx) => {
    lines.push(`## ${idx + 1}. ${p.name}`);
    lines.push("");
    lines.push(`- **Độ tuổi:** ${p.ageRange}`);
    lines.push(`- **Nghề nghiệp:** ${p.occupation}`);
    lines.push(`- **Tần suất ghé quán:** ${p.visitFrequency}`);
    lines.push(`- **Đồ uống yêu thích:** ${p.preferredDrink}`);
    lines.push(`- **Mục đích đến quán:** ${p.visitPurpose}`);
    lines.push("");
    lines.push(`**Pain points:**`);
    p.painPoints.forEach((pp) => lines.push(`- ${pp}`));
    lines.push("");
    lines.push(`**Marketing angle:** ${p.marketingAngle}`);
    lines.push("");
  });

  return lines.join("\n");
}

export function PersonaForm() {
  const [state, formAction, pending] = useActionState<PersonaState, FormData>(
    generatePersonasAction,
    INITIAL_PERSONA_STATE,
  );

  const [vibe, setVibe] = useState<PersonaVibe>(INITIAL_PERSONA_STATE.vibe);
  const [location, setLocation] = useState<PersonaLocation>(
    INITIAL_PERSONA_STATE.location,
  );
  const [priceTier, setPriceTier] = useState<PersonaPriceTier>(
    INITIAL_PERSONA_STATE.priceTier,
  );
  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (state.personas !== null) {
      setVibe(state.vibe);
      setLocation(state.location);
      setPriceTier(state.priceTier);
    }
  }, [state.personas, state.vibe, state.location, state.priceTier]);

  useEffect(() => {
    if (state.error && state.error !== lastErrorRef.current) {
      lastErrorRef.current = state.error;
      toast.error(state.error);
    }
    if (!state.error) {
      lastErrorRef.current = null;
    }
  }, [state.error]);

  const personas = state.personas;
  const hasResults = personas !== null && personas.length > 0;

  const handleDownload = useCallback(() => {
    if (!hasResults) return;
    const md = buildMarkdown(state);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadMarkdown(
      `personas-${state.vibe}-${state.priceTier}-${stamp}.md`,
      md,
    );
    toast.success("Đã tải file Markdown");
  }, [hasResults, state]);

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Vibe quán</Label>
          <div
            role="radiogroup"
            aria-label="Vibe quán"
            className="grid grid-cols-2 gap-2 sm:grid-cols-3"
          >
            {PERSONA_VIBES.map((opt) => {
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
          <Label htmlFor="persona-location" className="text-sm font-medium">
            Loại địa điểm
          </Label>
          <Select
            id="persona-location"
            name="location"
            value={location}
            onChange={(e) => {
              const v = e.target.value;
              const match = PERSONA_LOCATIONS.find((x) => x.value === v);
              if (match) setLocation(match.value);
            }}
            disabled={pending}
          >
            {PERSONA_LOCATIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Phân khúc giá</Label>
          <div
            role="radiogroup"
            aria-label="Phân khúc giá"
            className="grid grid-cols-3 gap-2"
          >
            {PERSONA_PRICE_TIERS.map((opt) => {
              const selected = priceTier === opt.value;
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
                    name="priceTier"
                    value={opt.value}
                    checked={selected}
                    onChange={() => setPriceTier(opt.value)}
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

        <div className="flex flex-wrap items-center justify-end gap-2">
          {hasResults ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleDownload}
              disabled={pending}
            >
              <Download className="size-4" />
              Tải markdown
            </Button>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : hasResults ? (
              <RefreshCw className="size-4" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {pending
              ? "Đang phân tích..."
              : hasResults
                ? "Tạo lại 3 persona"
                : "Tạo 3 persona"}
          </Button>
        </div>
      </form>

      {pending && !hasResults ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang phác hoạ 3 chân dung khách hàng...
        </div>
      ) : null}

      {hasResults ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <UserRound className="size-3" />
              {personaVibeLabel(state.vibe)} · {personaLocationLabel(state.location)} ·{" "}
              {personaPriceTierLabel(state.priceTier)}
            </div>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {personas.length} persona
            </span>
          </div>

          <ul className="grid gap-4 lg:grid-cols-3">
            {personas.map((p, idx) => (
              <PersonaCard key={`${p.name}-${idx}`} persona={p} index={idx} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

type PersonaCardProps = {
  persona: CustomerPersona;
  index: number;
};

function PersonaCard({ persona, index }: PersonaCardProps) {
  return (
    <li className="flex flex-col gap-3 rounded-lg border bg-card/60 p-4 shadow-sm">
      <header className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold leading-snug">
            {persona.name}
          </h3>
          <p className="text-xs text-muted-foreground">
            {persona.ageRange} tuổi · {persona.occupation}
          </p>
        </div>
      </header>

      <dl className="grid grid-cols-1 gap-2 text-sm">
        <PersonaField label="Tần suất ghé quán" value={persona.visitFrequency} />
        <PersonaField label="Đồ uống yêu thích" value={persona.preferredDrink} />
        <PersonaField label="Mục đích đến quán" value={persona.visitPurpose} />
      </dl>

      <div className="space-y-1.5">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Pain points
        </div>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
          {persona.painPoints.map((pp, pi) => (
            <li key={pi}>{pp}</li>
          ))}
        </ul>
      </div>

      <div className="mt-auto rounded-md border border-primary/30 bg-primary/10 p-3 text-sm leading-relaxed">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
          Marketing angle
        </div>
        <p className="italic text-foreground/90">{persona.marketingAngle}</p>
      </div>
    </li>
  );
}

type PersonaFieldProps = {
  label: string;
  value: string;
};

function PersonaField({ label, value }: PersonaFieldProps) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-1 text-sm">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-foreground/90">{value}</dd>
    </div>
  );
}
