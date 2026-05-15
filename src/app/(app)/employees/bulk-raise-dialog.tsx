"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { TrendingUp, Send, Loader2, Percent, DollarSign } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatVND } from "@/lib/utils";
import { bulkRaiseHourlyRate, type BulkRaiseMode } from "./actions";

type Selected = {
  id: number;
  name: string;
  hourlyRate: number;
};

export function BulkRaiseDialog({
  selected,
  onDone,
}: {
  selected: Selected[];
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<BulkRaiseMode>("percent");
  const [value, setValue] = useState<number>(5);
  const [pending, startTransition] = useTransition();

  // Live preview
  const preview = useMemo(() => {
    return selected.map((s) => {
      const computed =
        mode === "percent" ? s.hourlyRate * (1 + value / 100) : s.hourlyRate + value;
      const newRate = Math.max(0, Math.round(computed));
      return { ...s, newRate, delta: newRate - s.hourlyRate };
    });
  }, [selected, mode, value]);

  const totalDelta = preview.reduce((acc, p) => acc + p.delta, 0);
  const changedCount = preview.filter((p) => p.delta !== 0).length;
  const valueValid =
    Number.isFinite(value) &&
    (mode === "percent" ? value >= -50 && value <= 100 : value >= -1_000_000 && value <= 1_000_000);

  function submit() {
    if (selected.length === 0) {
      toast.error("Chưa chọn nhân viên nào");
      return;
    }
    if (!valueValid) {
      toast.error("Giá trị không hợp lệ");
      return;
    }
    startTransition(async () => {
      const res = await bulkRaiseHourlyRate(
        selected.map((s) => s.id),
        mode,
        value,
      );
      if (res.ok) {
        if (res.updated === 0) {
          toast.info("Không có thay đổi nào (giá trị đã trùng)");
        } else {
          toast.success(`Đã cập nhật lương cho ${res.updated} nhân viên`);
        }
        setOpen(false);
        onDone?.();
      } else {
        toast.error(res.error || "Không cập nhật được");
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={selected.length === 0}
      >
        <TrendingUp className="size-4" />
        Tăng lương ({selected.length})
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg" onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="size-5 text-primary" />
              Tăng lương hàng loạt
            </DialogTitle>
            <DialogDescription>
              Cập nhật lương/giờ của {selected.length} nhân viên đã chọn. Mỗi
              thay đổi sẽ được ghi vào lịch sử lương.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Mode toggle */}
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Kiểu tăng
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                <ModeButton
                  active={mode === "percent"}
                  onClick={() => {
                    setMode("percent");
                    setValue(5);
                  }}
                  icon={Percent}
                  label="Theo phần trăm"
                  hint="vd +5% hoặc -3%"
                />
                <ModeButton
                  active={mode === "amount"}
                  onClick={() => {
                    setMode("amount");
                    setValue(5_000);
                  }}
                  icon={DollarSign}
                  label="Cộng số tiền"
                  hint="vd +5.000 VND"
                />
              </div>
            </div>

            {/* Value input */}
            <div className="space-y-1">
              <Label htmlFor="raise-value">
                {mode === "percent" ? "Phần trăm" : "Số tiền (VND)"}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="raise-value"
                  type="number"
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  step={mode === "percent" ? 0.5 : 1000}
                  min={mode === "percent" ? -50 : -1_000_000}
                  max={mode === "percent" ? 100 : 1_000_000}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">
                  {mode === "percent" ? "%" : "VND"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {mode === "percent"
                  ? "Cho phép -50% đến +100%"
                  : "Cho phép ±1.000.000 VND"}
              </p>
            </div>

            {/* Preview */}
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-semibold uppercase tracking-wider text-muted-foreground">
                  Xem trước
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {changedCount} thay đổi · tổng{" "}
                  <span
                    className={cn(
                      "font-bold",
                      totalDelta > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : totalDelta < 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-muted-foreground",
                    )}
                  >
                    {totalDelta > 0 ? "+" : ""}
                    {formatVND(totalDelta)}
                  </span>
                </span>
              </div>
              <ul className="max-h-48 space-y-1 overflow-y-auto pr-1 text-xs">
                {preview.slice(0, 12).map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded px-2 py-1 hover:bg-card"
                  >
                    <span className="truncate font-medium">{p.name}</span>
                    <span className="flex items-center gap-1 tabular-nums whitespace-nowrap">
                      <span className="text-muted-foreground">
                        {formatVND(p.hourlyRate)}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span
                        className={cn(
                          "font-bold",
                          p.delta > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : p.delta < 0
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-foreground",
                        )}
                      >
                        {formatVND(p.newRate)}
                      </span>
                      {p.delta !== 0 && (
                        <span
                          className={cn(
                            "text-[10px] font-semibold tabular-nums",
                            p.delta > 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400",
                          )}
                        >
                          ({p.delta > 0 ? "+" : ""}
                          {formatVND(p.delta)})
                        </span>
                      )}
                    </span>
                  </li>
                ))}
                {preview.length > 12 && (
                  <li className="px-2 py-1 text-[10px] italic text-muted-foreground">
                    +{preview.length - 12} người khác...
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Huỷ
            </Button>
            <Button
              type="button"
              onClick={submit}
              disabled={pending || !valueValid || changedCount === 0}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Áp dụng cho {changedCount} người
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ModeButton({
  active,
  onClick,
  icon: Icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-start gap-2 rounded-md border p-2.5 text-left transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary bg-primary/10"
          : "bg-card hover:bg-accent",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight">{label}</p>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </div>
    </button>
  );
}
