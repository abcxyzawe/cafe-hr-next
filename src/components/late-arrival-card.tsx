import { Clock } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROLE_LABELS } from "@/lib/utils";
import type { LateStats } from "@/lib/late-arrivals";

type ColorClasses = {
  text: string;
  bg: string;
  ring: string;
  iconBg: string;
};

function colorFor(ratePct: number): ColorClasses {
  if (ratePct > 25) {
    return {
      text: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-950/30",
      ring: "ring-rose-200 dark:ring-rose-900/50",
      iconBg: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    };
  }
  if (ratePct >= 10) {
    return {
      text: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      ring: "ring-amber-200 dark:ring-amber-900/50",
      iconBg:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    };
  }
  return {
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    ring: "ring-emerald-200 dark:ring-emerald-900/50",
    iconBg:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  };
}

export function LateArrivalCard({ stats }: { stats: LateStats | null }) {
  if (!stats || stats.totalCheckins === 0) return null;

  const c = colorFor(stats.ratePct);
  const formatted = stats.ratePct.toFixed(1);

  return (
    <Card className={`ring-1 ${c.ring}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <span
              className={`inline-flex size-7 items-center justify-center rounded-md ${c.iconBg}`}
            >
              <Clock className="size-4" />
            </span>
            Đi muộn tuần này
          </CardTitle>
          <CardDescription>
            Trễ &gt; 10 phút so với giờ vào ca theo lịch
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className={`rounded-lg p-4 ${c.bg}`}>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold leading-none ${c.text}`}>
              {formatted}%
            </span>
            <span className="text-sm text-muted-foreground">
              {stats.lateCheckins} / {stats.totalCheckins} check-in muộn
            </span>
          </div>
        </div>

        {stats.topLate.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Hay đi muộn nhất
            </p>
            <ul className="space-y-2">
              {stats.topLate.map((row) => (
                <li
                  key={row.employeeId}
                  className="flex items-center gap-3 rounded-md border bg-card/50 p-2"
                >
                  <Avatar
                    src={row.avatarUrl}
                    alt={row.name}
                    fallback={row.name}
                    role={row.role}
                    size={32}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{row.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {ROLE_LABELS[row.role] ?? row.role}
                    </p>
                  </div>
                  <Badge variant="warning">{row.lateCount} lần</Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
