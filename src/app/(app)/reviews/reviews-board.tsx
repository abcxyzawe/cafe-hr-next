"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ReviewsTrendChart } from "@/components/reviews-trend-chart";
import {
  REVIEWS_EVENT,
  SOURCE_LABEL,
  STORAGE_KEY,
  addReview,
  getDailyAverages,
  getReviews,
  removeReview,
  type Review,
  type ReviewSource,
} from "@/lib/reviews-state";

const COMMENT_MAX = 50;

const SOURCE_OPTIONS: ReadonlyArray<ReviewSource> = ["in-store", "google", "fb"];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const day = out.getDay(); // 0 = Sunday
  const diff = (day + 6) % 7; // make Monday = 0
  out.setDate(out.getDate() - diff);
  return out;
}

type AvgChip = {
  label: string;
  className: string;
};

function avgChip(avg: number, count: number): AvgChip {
  if (count === 0) {
    return {
      label: "—",
      className:
        "bg-muted text-muted-foreground ring-1 ring-border",
    };
  }
  if (avg < 4.0) {
    return {
      label: avg.toFixed(2),
      className:
        "bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/30",
    };
  }
  if (avg < 4.5) {
    return {
      label: avg.toFixed(2),
      className:
        "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/30",
    };
  }
  return {
    label: avg.toFixed(2),
    className:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30",
  };
}

function StarRow({ rating }: { rating: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${rating} sao`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "size-4",
            n <= rating
              ? "fill-amber-500 text-amber-500"
              : "fill-transparent text-muted-foreground/40",
          )}
        />
      ))}
    </div>
  );
}

function StarPicker({
  value,
  onChange,
  disabled,
}: {
  value: 1 | 2 | 3 | 4 | 5;
  onChange: (v: 1 | 2 | 3 | 4 | 5) => void;
  disabled?: boolean;
}) {
  const stars: ReadonlyArray<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5];
  return (
    <div className="inline-flex items-center gap-1" role="radiogroup" aria-label="Chọn số sao">
      {stars.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} sao`}
          disabled={disabled}
          onClick={() => onChange(n)}
          className={cn(
            "rounded-md p-1 transition-colors hover:bg-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
            disabled && "opacity-50",
          )}
        >
          <Star
            className={cn(
              "size-7 transition-transform",
              n <= value
                ? "fill-amber-500 text-amber-500"
                : "fill-transparent text-muted-foreground/40",
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function ReviewsBoard() {
  const [list, setList] = useState<Review[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [comment, setComment] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [source, setSource] = useState<ReviewSource>("in-store");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setList(getReviews());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const reread = () => setList(getReviews());
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STORAGE_KEY) reread();
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<{ key?: string }>).detail;
      if (!detail || !detail.key || detail.key === STORAGE_KEY) reread();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(REVIEWS_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(REVIEWS_EVENT, onCustom);
    };
  }, [hydrated]);

  const todayList = useMemo(() => {
    if (!hydrated) return [];
    const now = new Date();
    return list
      .filter((r) => {
        const d = new Date(r.createdAt);
        if (Number.isNaN(d.getTime())) return false;
        return isSameLocalDay(d, now);
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [list, hydrated]);

  const todayAvg = useMemo(() => {
    if (todayList.length === 0) return 0;
    const sum = todayList.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / todayList.length) * 100) / 100;
  }, [todayList]);

  const weekCount = useMemo(() => {
    if (!hydrated) return 0;
    const start = startOfWeek(new Date()).getTime();
    return list.reduce((acc, r) => {
      const t = new Date(r.createdAt).getTime();
      if (Number.isNaN(t)) return acc;
      return t >= start ? acc + 1 : acc;
    }, 0);
  }, [list, hydrated]);

  const trendPoints = useMemo(() => {
    if (!hydrated) return [];
    return getDailyAverages(7);
  }, [list, hydrated]);

  const chip = avgChip(todayAvg, todayList.length);

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (submitting) return;
      setSubmitting(true);
      try {
        addReview({
          rating,
          comment: comment.slice(0, COMMENT_MAX),
          customerName,
          source,
        });
        setComment("");
        setCustomerName("");
        setRating(5);
        setSource("in-store");
      } finally {
        setSubmitting(false);
      }
    },
    [rating, comment, customerName, source, submitting],
  );

  const handleRemove = useCallback((id: string) => {
    removeReview(id);
  }, []);

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <section className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Đánh giá hôm nay
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{todayList.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Trung bình hôm nay
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold",
                  chip.className,
                )}
              >
                <Star className="size-3.5 fill-current" />
                {chip.label}
              </span>
              <span className="text-xs text-muted-foreground">
                / 5.00
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Tuần này
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{weekCount}</div>
          </CardContent>
        </Card>
      </section>

      {/* Add form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ghi nhận đánh giá mới</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Số sao</Label>
              <StarPicker
                value={rating}
                onChange={setRating}
                disabled={submitting}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="rv-comment">
                  Bình luận{" "}
                  <span className="text-xs text-muted-foreground">
                    (≤ {COMMENT_MAX} ký tự, tuỳ chọn)
                  </span>
                </Label>
                <Input
                  id="rv-comment"
                  value={comment}
                  onChange={(e) =>
                    setComment(e.target.value.slice(0, COMMENT_MAX))
                  }
                  maxLength={COMMENT_MAX}
                  placeholder="Cà phê thơm, phục vụ nhiệt tình..."
                  disabled={submitting}
                />
                <p className="text-[11px] text-muted-foreground text-right">
                  {comment.length}/{COMMENT_MAX}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rv-name">Tên khách (tuỳ chọn)</Label>
                <Input
                  id="rv-name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  maxLength={60}
                  placeholder="Anh Minh, chị Lan..."
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rv-source">Nguồn</Label>
                <Select
                  id="rv-source"
                  value={source}
                  onChange={(e) => setSource(e.target.value as ReviewSource)}
                  disabled={submitting}
                >
                  {SOURCE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {SOURCE_LABEL[s]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>
                Lưu
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Trend chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Xu hướng 7 ngày</CardTitle>
        </CardHeader>
        <CardContent>
          <ReviewsTrendChart points={trendPoints} />
        </CardContent>
      </Card>

      {/* Today's list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Đánh giá hôm nay ({todayList.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayList.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Chưa có đánh giá nào cho hôm nay. Hãy ghi nhận ngay khi khách
              chia sẻ cảm nhận!
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {todayList.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-start justify-between gap-3 py-3"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StarRow rating={r.rating} />
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {SOURCE_LABEL[r.source]}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatTime(r.createdAt)}
                      </span>
                      {r.customerName ? (
                        <span className="text-[11px] text-muted-foreground">
                          · {r.customerName}
                        </span>
                      ) : null}
                    </div>
                    {r.comment ? (
                      <p className="break-words text-sm text-foreground">
                        {r.comment}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemove(r.id)}
                    aria-label="Xoá đánh giá"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
