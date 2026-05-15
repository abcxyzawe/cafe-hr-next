import Link from "next/link";
import { Star, ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FeedbackStats } from "@/lib/customer-feedback-stats";

/**
 * Render 5 stars with fractional fill based on `value` (0..5).
 * Each star fills proportionally — anything ≥ 0.5 within a star
 * shows as a half-fill (clipped from the left).
 */
function StarRow({ value, sizeClass = "size-7" }: { value: number; sizeClass?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value.toFixed(1)} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((n) => {
        // Fraction of THIS star that should be filled (0..1)
        const frac = Math.max(0, Math.min(1, value - (n - 1)));
        const pct = Math.round(frac * 100);
        return (
          <span key={n} className={cn("relative inline-block", sizeClass)}>
            {/* Empty base star */}
            <Star className={cn(sizeClass, "fill-transparent text-muted-foreground/30")} />
            {/* Filled overlay clipped by width */}
            {pct > 0 && (
              <span
                className="pointer-events-none absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: `${pct}%` }}
                aria-hidden
              >
                <Star className={cn(sizeClass, "fill-amber-400 text-amber-400")} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

export function CustomerFeedbackCard({ stats }: { stats: FeedbackStats }) {
  if (stats.total === 0) return null;

  const { avgRating, distribution, total } = stats;
  const max = Math.max(...distribution, 1);
  // Round avg to nearest 0.5 for star display
  const avgHalf = Math.round(avgRating * 2) / 2;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="size-5 text-amber-500" />
          Đánh giá khách hàng (30 ngày)
        </CardTitle>
        <CardDescription>
          Tổng hợp {total} đánh giá từ khách ghé quán trong 30 ngày qua
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Big average rating */}
        <div className="flex flex-col items-center gap-2 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex flex-col items-center gap-1">
            <p className="text-4xl font-bold leading-none tabular-nums">
              {avgRating.toFixed(1)}
              <span className="ml-1 text-base font-normal text-muted-foreground">
                / 5
              </span>
            </p>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {total} lượt đánh giá
            </p>
          </div>
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <StarRow value={avgHalf} sizeClass="size-7" />
          </div>
        </div>

        {/* Distribution bars: 5★ → 1★ */}
        <ul className="space-y-1.5">
          {distribution.map((count, idx) => {
            const stars = 5 - idx;
            const pct = (count / max) * 100;
            return (
              <li
                key={stars}
                className="flex items-center gap-3 text-sm"
              >
                <span className="flex w-10 shrink-0 items-center gap-0.5 tabular-nums text-muted-foreground">
                  {stars}
                  <Star className="size-3.5 fill-amber-400 text-amber-400" />
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-amber-400/80"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {count}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="flex justify-end">
          <Button asChild variant="ghost" size="sm">
            <Link href="/settings/feedback?category=customer">
              Xem tất cả <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
