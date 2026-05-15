import { TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatVND, formatDate } from "@/lib/utils";
import type { SalaryChange } from "@/lib/salary-history";

export function SalaryHistoryCard({
  items,
  currentRate,
}: {
  items: SalaryChange[];
  currentRate: number;
}) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-5" />
            Lịch sử lương
          </CardTitle>
          <CardDescription>
            Theo dõi thay đổi mức lương theo thời gian
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Badge variant="secondary" className="text-sm">
              Hiện tại: {formatVND(currentRate)}/giờ
            </Badge>
            <p className="text-sm text-muted-foreground">
              Chưa có thay đổi lương nào ghi nhận
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // items are ordered DESC (newest first). Earliest recorded "old" rate:
  const earliest = items[items.length - 1];
  const earliestRate = earliest.oldRate;
  const totalDeltaPct =
    earliestRate > 0
      ? Math.round(((currentRate - earliestRate) / earliestRate) * 1000) / 10
      : 0;
  const totalLabel =
    totalDeltaPct > 0
      ? `tăng ${totalDeltaPct}% so với lần đầu`
      : totalDeltaPct < 0
        ? `giảm ${Math.abs(totalDeltaPct)}% so với lần đầu`
        : "không đổi so với lần đầu";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="size-5" />
          Lịch sử lương
        </CardTitle>
        <CardDescription>
          {items.length} lần thay đổi · cập nhật mới nhất ở trên cùng
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border bg-muted/40 p-4">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Hiện tại
          </span>
          <span className="text-2xl font-bold">
            {formatVND(currentRate)}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              /giờ
            </span>
          </span>
          <span
            className={
              "text-xs font-medium " +
              (totalDeltaPct > 0
                ? "text-emerald-700 dark:text-emerald-400"
                : totalDeltaPct < 0
                  ? "text-rose-700 dark:text-rose-400"
                  : "text-muted-foreground")
            }
          >
            {totalLabel}
          </span>
        </div>

        <ol className="relative space-y-4 border-l-2 border-border pl-4">
          {items.map((item) => {
            const isRaise = item.newRate > item.oldRate;
            const deltaSign = item.deltaPct > 0 ? "+" : "";
            return (
              <li key={item.id} className="relative">
                <span
                  className={
                    "absolute -left-[22px] mt-1.5 size-3 rounded-full border-2 border-background " +
                    (isRaise ? "bg-emerald-500" : "bg-rose-500")
                  }
                />
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(item.changedAt)}
                  </span>
                  <Badge
                    variant={isRaise ? "success" : "destructive"}
                    className="font-mono"
                  >
                    {formatVND(item.oldRate)} → {formatVND(item.newRate)}
                  </Badge>
                  <span
                    className={
                      "text-sm font-semibold " +
                      (isRaise
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-rose-700 dark:text-rose-400")
                    }
                  >
                    {deltaSign}
                    {item.deltaPct}%
                  </span>
                  {item.changedBy && (
                    <span className="text-xs text-muted-foreground">
                      bởi {item.changedBy}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
