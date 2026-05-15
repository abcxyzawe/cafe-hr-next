"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { PALETTES, type Palette, type PaletteId } from "@/lib/palette";
import { setPalette } from "@/lib/palette-action";
import { cn } from "@/lib/utils";

type PreviewMode = "light" | "dark";

type Props = {
  currentPaletteId: PaletteId;
};

export function ThemeTiles({ currentPaletteId }: Props) {
  const [mode, setMode] = useState<PreviewMode>("light");
  const [pendingId, setPendingId] = useState<PaletteId | null>(null);
  const [, startTransition] = useTransition();

  function pick(id: PaletteId) {
    if (id === currentPaletteId || pendingId !== null) return;
    setPendingId(id);
    startTransition(async () => {
      try {
        await setPalette(id);
        const p = PALETTES.find((x) => x.id === id);
        toast.success(`Đã chuyển sang bảng màu ${p?.name ?? id}`);
      } catch {
        toast.error("Không đổi được bảng màu");
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Xem trước theo chế độ:
        </p>
        <div
          role="group"
          aria-label="Chế độ xem trước"
          className="inline-flex rounded-full border bg-muted/40 p-0.5 text-xs"
        >
          <ModePill
            active={mode === "light"}
            onClick={() => setMode("light")}
            label="Sáng"
            icon={<Sun className="size-3" />}
          />
          <ModePill
            active={mode === "dark"}
            onClick={() => setMode("dark")}
            label="Tối"
            icon={<Moon className="size-3" />}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PALETTES.map((p) => (
          <Tile
            key={p.id}
            palette={p}
            mode={mode}
            selected={p.id === currentPaletteId}
            pending={pendingId === p.id}
            disabled={pendingId !== null && pendingId !== p.id}
            onPick={pick}
          />
        ))}
      </div>
    </div>
  );
}

function ModePill({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

type TileProps = {
  palette: Palette;
  mode: PreviewMode;
  selected: boolean;
  pending: boolean;
  disabled: boolean;
  onPick: (id: PaletteId) => void;
};

function Tile({ palette, mode, selected, pending, disabled, onPick }: TileProps) {
  const tokens = palette[mode];
  const isDark = mode === "dark";
  const surface = isDark ? "hsl(220 15% 14%)" : "hsl(0 0% 100%)";
  const surfaceFg = isDark ? "hsl(0 0% 96%)" : "hsl(220 15% 14%)";
  const surfaceMuted = isDark ? "hsl(220 10% 60%)" : "hsl(220 10% 45%)";
  const cardBorder = isDark ? "hsl(220 10% 28%)" : "hsl(220 15% 88%)";

  return (
    <button
      type="button"
      onClick={() => onPick(palette.id)}
      disabled={disabled || pending}
      aria-pressed={selected}
      aria-label={`Chọn bảng màu ${palette.name}`}
      title={`${palette.name} — ${palette.hint}`}
      className={cn(
        "group relative flex flex-col gap-3 overflow-hidden rounded-xl border bg-card p-3 text-left transition-all",
        "hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
          : "hover:border-foreground/20",
        (disabled || pending) && "opacity-60",
      )}
    >
      {selected && (
        <span className="absolute right-2 top-2 z-10 inline-flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
          <Check className="size-3.5" strokeWidth={3} />
        </span>
      )}

      {pending && (
        <span className="absolute inset-0 z-20 flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
          <Loader2 className="size-5 animate-spin text-foreground" />
        </span>
      )}

      {/* Mock surface preview */}
      <div
        className="rounded-lg border p-3"
        style={{ backgroundColor: surface, borderColor: cardBorder }}
      >
        <div className="flex items-start gap-3">
          {/* Swatches column */}
          <div className="flex flex-col gap-1.5">
            <Swatch color={`hsl(${tokens.primary})`} title="primary" />
            <Swatch color={`hsl(${tokens.accent})`} title="accent" />
            <Swatch color={`hsl(${tokens.ring})`} title="ring" />
            <Swatch color={`hsl(${tokens.chart1})`} title="chart-1" />
          </div>

          {/* Mini mock UI */}
          <div className="flex flex-1 flex-col gap-2">
            <div
              className="inline-flex h-5 w-[60px] items-center justify-center rounded text-[9px] font-medium"
              style={{
                backgroundColor: `hsl(${tokens.primary})`,
                color: `hsl(${tokens.primaryFg})`,
              }}
            >
              Nút
            </div>
            <div
              className="h-[40px] w-[80px] rounded-md border"
              style={{
                borderColor: `hsl(${tokens.ring})`,
                backgroundColor: `hsl(${tokens.accent})`,
              }}
            />
            <div className="space-y-1">
              <div
                className="h-1.5 w-16 rounded-full"
                style={{ backgroundColor: surfaceFg, opacity: 0.85 }}
              />
              <div
                className="h-1.5 w-10 rounded-full"
                style={{ backgroundColor: surfaceMuted }}
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold">{palette.name}</div>
        <div className="text-xs text-muted-foreground">{palette.hint}</div>
      </div>
    </button>
  );
}

function Swatch({ color, title }: { color: string; title: string }) {
  return (
    <span
      title={title}
      aria-hidden
      className="block size-4 rounded-full border border-black/10 shadow-inner"
      style={{ backgroundColor: color }}
    />
  );
}
