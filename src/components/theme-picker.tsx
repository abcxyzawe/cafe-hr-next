"use client";

import { useTransition } from "react";
import { Check, Palette } from "lucide-react";
import { toast } from "sonner";
import { PALETTES, type PaletteId } from "@/lib/palette";
import { setPalette } from "@/lib/palette-action";
import { cn } from "@/lib/utils";

type Props = {
  current: PaletteId;
  onPicked?: () => void;
};

export function ThemePicker({ current, onPicked }: Props) {
  const [pending, startTransition] = useTransition();

  function pick(id: PaletteId) {
    if (id === current) {
      onPicked?.();
      return;
    }
    startTransition(async () => {
      await setPalette(id);
      const p = PALETTES.find((x) => x.id === id);
      toast.success(`Đã chuyển sang bảng màu ${p?.name ?? id}`);
      onPicked?.();
    });
  }

  return (
    <div>
      <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Palette className="size-3" />
        Bảng màu
      </div>
      <div className="grid grid-cols-6 gap-1.5 px-3 pb-2">
        {PALETTES.map((p) => {
          const active = p.id === current;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => pick(p.id)}
              disabled={pending}
              title={`${p.name} — ${p.hint}`}
              aria-label={p.name}
              aria-pressed={active}
              className={cn(
                "group relative flex aspect-square items-center justify-center rounded-md border transition-all",
                "hover:scale-110 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "ring-2 ring-ring ring-offset-2 ring-offset-popover" : "",
                pending && "opacity-60",
              )}
              style={{
                backgroundColor: `hsl(${p.light.primary})`,
              }}
            >
              {active && <Check className="size-3 text-white drop-shadow" strokeWidth={3} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
