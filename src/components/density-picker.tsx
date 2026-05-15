"use client";

import { useTransition } from "react";
import { Rows3, AlignJustify } from "lucide-react";
import { toast } from "sonner";
import { setDensity } from "@/lib/density-action";
import type { Density } from "@/lib/density";
import { cn } from "@/lib/utils";

type Props = {
  current: Density;
  onPicked?: () => void;
};

const OPTIONS: { id: Density; label: string }[] = [
  { id: "comfortable", label: "Thoải mái" },
  { id: "compact", label: "Gọn" },
];

export function DensityPicker({ current, onPicked }: Props) {
  const [pending, startTransition] = useTransition();

  function pick(id: Density) {
    if (id === current) {
      onPicked?.();
      return;
    }
    startTransition(async () => {
      await setDensity(id);
      toast.success(
        id === "compact" ? "Đã chuyển sang mật độ Gọn" : "Đã chuyển sang mật độ Thoải mái",
      );
      onPicked?.();
    });
  }

  return (
    <div>
      <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Rows3 className="size-3" />
        Mật độ
      </div>
      <div className="flex gap-1.5 px-3 pb-2">
        {OPTIONS.map((o) => {
          const active = o.id === current;
          const Icon = o.id === "compact" ? AlignJustify : Rows3;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => pick(o.id)}
              disabled={pending}
              aria-pressed={active}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-accent",
                pending && "opacity-60",
              )}
            >
              <Icon className="size-3" />
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
