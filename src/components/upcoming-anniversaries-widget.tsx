import Link from "next/link";
import { Award } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROLE_LABELS, formatDate, cn } from "@/lib/utils";
import type { UpcomingAnniversary } from "@/lib/anniversaries";
import { GiveKudosDialog } from "@/components/give-kudos-dialog";

function ordinalYears(n: number): string {
  if (n === 5) return "Tròn 5 năm 🎉";
  if (n === 10) return "Tròn 10 năm 🏆";
  return `Tròn ${n} năm`;
}

function countdownClass(daysUntil: number): string {
  if (daysUntil <= 7) {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200";
  }
  if (daysUntil <= 14) {
    return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200";
  }
  return "bg-muted text-muted-foreground";
}

export function UpcomingAnniversariesWidget({
  items,
  isAdmin,
}: {
  items: UpcomingAnniversary[];
  isAdmin: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <div className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
          <Award className="size-5" />
        </div>
        <div>
          <CardTitle>Kỷ niệm sắp tới</CardTitle>
          <CardDescription>
            {items.length} nhân viên có kỷ niệm ngày vào làm trong 30 ngày tới
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {items.map((p) => (
            <li key={p.id} className="flex items-center gap-3">
              <Link
                href={`/employees/${p.id}`}
                data-employee-id={p.id}
                className="-mx-2 flex flex-1 items-center gap-3 rounded-md px-2 py-1 hover:bg-accent"
              >
                <Avatar
                  src={p.avatarUrl}
                  alt={p.name}
                  fallback={p.name}
                  size={40}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {ROLE_LABELS[p.role] ?? p.role} ·{" "}
                    {formatDate(p.upcomingDate)}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className="border-amber-400/40 bg-amber-500/15 text-amber-800 dark:text-amber-200"
                >
                  {ordinalYears(p.yearsCount)}
                </Badge>
              </Link>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                  countdownClass(p.daysAhead),
                )}
              >
                Còn {p.daysAhead} ngày
              </span>
              {isAdmin && (
                <GiveKudosDialog
                  employeeId={p.id}
                  employeeName={p.name}
                />
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
