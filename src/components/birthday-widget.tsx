import Link from "next/link";
import { Cake, Gift } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABELS, formatDate } from "@/lib/utils";
import type { UpcomingBirthday } from "@/lib/birthday";

export function BirthdayWidget({ items }: { items: UpcomingBirthday[] }) {
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <div className="flex size-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
          <Cake className="size-5" />
        </div>
        <div>
          <CardTitle>Sinh nhật sắp tới</CardTitle>
          <CardDescription>
            {items.length} nhân viên có sinh nhật trong 30 ngày tới
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {items.map((b) => (
            <li key={b.id} className="flex items-center gap-3">
              <Link href={`/employees/${b.id}`} className="flex flex-1 items-center gap-3 -mx-2 rounded-md px-2 py-1 hover:bg-accent">
                <Avatar src={b.avatarUrl} alt={b.name} fallback={b.name} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{b.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABELS[b.role] ?? b.role} ·{" "}
                    {formatDate(b.upcomingDate)} (tròn {b.turningAge} tuổi)
                  </p>
                </div>
              </Link>
              <BirthdayBadge daysUntil={b.daysUntil} />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function BirthdayBadge({ daysUntil }: { daysUntil: number }) {
  if (daysUntil === 0) {
    return (
      <Badge variant="default" className="gap-1 bg-rose-500 text-white">
        <Gift className="size-3" />
        Hôm nay!
      </Badge>
    );
  }
  if (daysUntil <= 7) {
    return (
      <Badge variant="warning" className="gap-1">
        <Gift className="size-3" />
        {daysUntil} ngày nữa
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">
      {daysUntil} ngày nữa
    </Badge>
  );
}
