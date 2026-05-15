import Link from "next/link";
import { Award } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { ROLE_LABELS, formatDate, cn } from "@/lib/utils";
import type { TenureMilestone } from "@/lib/tenure";

const MAX_ITEMS = 8;

export function TenureMilestonesCard({ items }: { items: TenureMilestone[] }) {
  if (items.length === 0) return null;
  const visible = items.slice(0, MAX_ITEMS);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="size-5 text-amber-500" />
          Sắp tới mốc thâm niên
        </CardTitle>
        <CardDescription>
          {visible.length} nhân viên sắp đạt mốc 1/2/3/5/10 năm trong 30 ngày tới
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y rounded-xl border bg-card">
          {visible.map((m) => {
            const milestone = m.yearsAt >= 5;
            return (
              <li
                key={`${m.id}-${m.yearsAt}`}
                data-employee-id={m.id}
                className="flex items-center gap-3 px-3 py-2"
              >
                <Link
                  href={`/employees/${m.id}`}
                  className="flex flex-1 items-center gap-3 hover:opacity-80"
                >
                  <Avatar
                    src={m.avatarUrl}
                    fallback={m.name}
                    alt={m.name}
                    role={m.role}
                    size={36}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {ROLE_LABELS[m.role] ?? m.role} ·{" "}
                      {formatDate(m.anniversaryDate)} · còn {m.daysUntil} ngày
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
                      milestone
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                        : "bg-primary/10 text-primary",
                    )}
                  >
                    {m.yearsAt} năm
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
