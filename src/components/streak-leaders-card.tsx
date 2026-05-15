import Link from "next/link";
import { Flame } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { ROLE_LABELS } from "@/lib/utils";
import { getTopStreaks } from "@/lib/streak-queries";

/**
 * Admin-side mini-card listing top 5 employees by current streak.
 * Renders nothing when there are no active streaks.
 */
export async function StreakLeadersCard() {
  const leaders = await getTopStreaks(5);
  if (leaders.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="size-5 text-amber-500" />
          Streak nhân viên
        </CardTitle>
        <CardDescription>
          Top {leaders.length} nhân viên đang duy trì chuỗi ngày đi làm liên tục
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y rounded-xl border bg-card">
          {leaders.map((l, i) => {
            const hot = l.current >= 7;
            return (
              <li
                key={l.employeeId}
                data-employee-id={l.employeeId}
                className="flex items-center gap-3 px-3 py-2"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold tabular-nums text-muted-foreground">
                  {i + 1}
                </span>
                <Link
                  href={`/employees/${l.employeeId}`}
                  className="flex flex-1 items-center gap-3 hover:opacity-80"
                >
                  <Avatar
                    src={l.avatarUrl}
                    fallback={l.name}
                    alt={l.name}
                    role={l.role}
                    size={36}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{l.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {ROLE_LABELS[l.role] ?? l.role} · kỷ lục {l.longest} ngày
                    </p>
                  </div>
                  <span
                    className={
                      hot
                        ? "inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold tabular-nums text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                        : "inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-bold tabular-nums text-muted-foreground"
                    }
                  >
                    <Flame
                      className={
                        hot
                          ? "size-3.5 text-amber-500"
                          : "size-3.5 text-muted-foreground"
                      }
                      aria-hidden
                    />
                    {l.current}
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
