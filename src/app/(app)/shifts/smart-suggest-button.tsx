"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  Loader2,
  Check,
  X,
  Trash2,
  Sunrise,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { fetchSuggestions, applySuggestions } from "./suggest-actions";

type Suggestion = {
  employeeId: number;
  employeeName: string;
  date: string;
  shiftType: "morning" | "afternoon" | "evening";
  rationale: string;
};

const SHIFT_LABELS = {
  morning: "Sáng",
  afternoon: "Chiều",
  evening: "Tối",
};

const SHIFT_ICONS = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Moon,
};

const SHIFT_COLORS = {
  morning: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  afternoon: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  evening: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
};

const WEEKDAY = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export function SmartSuggestButton({ weekStart }: { weekStart: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [removed, setRemoved] = useState<Set<number>>(new Set());
  const [source, setSource] = useState<"grok" | "fallback" | null>(null);
  const [context, setContext] = useState("");
  const [applying, startApply] = useTransition();

  function openDialog() {
    setOpen(true);
    setSuggestions([]);
    setRemoved(new Set());
    setSource(null);
  }

  async function runFetch() {
    setLoading(true);
    setSuggestions([]);
    setRemoved(new Set());
    setSource(null);
    try {
      const res = await fetchSuggestions(weekStart, context);
      if (res.ok && res.suggestions) {
        setSuggestions(res.suggestions);
        setSource(res.source ?? null);
        if (res.suggestions.length === 0) {
          toast.info("Không có ca nào được đề xuất");
        }
      } else {
        toast.error(res.error || "Không tạo được đề xuất");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setLoading(false);
    }
  }

  function toggleRemove(idx: number) {
    setRemoved((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function apply() {
    const final = suggestions.filter((_, i) => !removed.has(i));
    if (final.length === 0) {
      toast.error("Không còn ca nào để áp dụng");
      return;
    }
    startApply(async () => {
      const res = await applySuggestions(final);
      if (res.ok) {
        toast.success(
          `Đã tạo ${res.created} ca${res.skipped > 0 ? ` (bỏ qua ${res.skipped} ca trùng)` : ""}`,
        );
        setOpen(false);
      } else {
        toast.error(res.error || "Không áp dụng được");
      }
    });
  }

  // Group suggestions by date for grid display
  const byDate = new Map<string, Suggestion[]>();
  for (const s of suggestions) {
    if (!byDate.has(s.date)) byDate.set(s.date, []);
    byDate.get(s.date)!.push(s);
  }
  const dates = Array.from(byDate.keys()).sort();
  const finalCount = suggestions.length - removed.size;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={openDialog}
        className="gap-1.5"
      >
        <Sparkles className="size-4 text-primary" />
        Gợi ý lịch tuần
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)} className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              Đề xuất lịch tuần
            </DialogTitle>
            <DialogDescription>
              {loading
                ? "Đang phân tích pattern 4 tuần qua..."
                : suggestions.length === 0
                  ? "Nhập ghi chú (part-time, ai bận ngày nào, yêu cầu riêng) rồi bấm Tạo đề xuất. AI sẽ tự động đọc ngày nghỉ phép từ DB."
                  : source === "grok"
                    ? "Phân tích từ pattern thực tế + ngày nghỉ phép + ghi chú của bạn. Bỏ ca không phù hợp trước khi áp dụng."
                    : "Đề xuất tự động luân phiên (do dịch vụ AI tạm không khả dụng)."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label
              htmlFor="suggest-context"
              className="text-sm font-medium"
            >
              Ghi chú cho AI (tuỳ chọn)
            </label>
            <textarea
              id="suggest-context"
              value={context}
              onChange={(e) => setContext(e.target.value.slice(0, 2000))}
              disabled={loading}
              placeholder={
                "Ví dụ:\n- Lan part-time, chỉ rảnh sáng T2-T4\n- Minh bận T7 sau 17h\n- Tuần này cần 2 barista ca tối\n- Ưu tiên Hà ca sáng vì ở gần"
              }
              rows={5}
              className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm leading-relaxed shadow-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{context.length}/2000</span>
              <Button
                size="sm"
                onClick={runFetch}
                disabled={loading}
                className="gap-1.5"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {suggestions.length === 0 ? "Tạo đề xuất" : "Tạo lại"}
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Tính toán đề xuất, đợi 5-10 giây...
              </p>
            </div>
          ) : suggestions.length === 0 ? null : (
            <>
              <div className="max-h-[55vh] overflow-y-auto">
                <div className="grid gap-3">
                  {dates.map((date) => {
                    const d = new Date(date);
                    const items = byDate.get(date)!;
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <div key={date}>
                        <div className="mb-1.5 flex items-baseline gap-2">
                          <span
                            className={cn(
                              "text-xs font-semibold uppercase tracking-wide",
                              isWeekend
                                ? "text-rose-500"
                                : "text-muted-foreground",
                            )}
                          >
                            {WEEKDAY[d.getDay()]}
                          </span>
                          <span className="text-sm font-semibold">
                            {d.getDate()}/{d.getMonth() + 1}
                          </span>
                        </div>
                        <div className="grid gap-1.5">
                          {items.map((s) => {
                            const idx = suggestions.indexOf(s);
                            const isRemoved = removed.has(idx);
                            const Icon = SHIFT_ICONS[s.shiftType];
                            return (
                              <div
                                key={idx}
                                className={cn(
                                  "flex items-center gap-2 rounded-md border bg-card/50 px-3 py-2 text-sm transition-opacity",
                                  isRemoved && "opacity-40 line-through",
                                )}
                              >
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "gap-1 border-0",
                                    SHIFT_COLORS[s.shiftType],
                                  )}
                                >
                                  <Icon className="size-3" />
                                  {SHIFT_LABELS[s.shiftType]}
                                </Badge>
                                <span className="min-w-0 flex-1 truncate font-medium">
                                  {s.employeeName}
                                </span>
                                {s.rationale && (
                                  <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                                    · {s.rationale}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => toggleRemove(idx)}
                                  className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                                  title={isRemoved ? "Bật lại" : "Bỏ ca này"}
                                >
                                  {isRemoved ? (
                                    <Check className="size-3.5 text-emerald-600" />
                                  ) : (
                                    <Trash2 className="size-3.5 text-destructive" />
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 border-t pt-3">
                <p className="text-xs text-muted-foreground">
                  Sẽ tạo <strong>{finalCount}</strong> ca · ca trùng đã có sẽ bị
                  bỏ qua tự động
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setOpen(false)}>
                    <X className="size-4" />
                    Huỷ
                  </Button>
                  <Button
                    onClick={apply}
                    disabled={applying || finalCount === 0}
                  >
                    {applying ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    Áp dụng ({finalCount} ca)
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
