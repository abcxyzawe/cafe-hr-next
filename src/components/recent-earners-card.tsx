import Link from "next/link";
import { Trophy } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { getRecentBadgeEarners } from "@/lib/achievement-queries";
import { AchievementBadge } from "./achievement-badge";

export async function RecentEarnersCard({ limit = 6 }: { limit?: number }) {
  let earners: Awaited<ReturnType<typeof getRecentBadgeEarners>> = [];
  try {
    earners = await getRecentBadgeEarners(limit);
  } catch {
    earners = [];
  }
  if (earners.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="size-5 text-amber-500" />
          Vừa đạt huy hiệu
        </CardTitle>
        <CardDescription>
          Top nhân viên đang sở hữu nhiều huy hiệu nhất
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y rounded-xl border bg-card">
          {earners.map((e) => (
            <li
              key={e.employeeId}
              data-employee-id={e.employeeId}
              className="flex items-center gap-3 px-3 py-2"
            >
              <Link
                href={`/employees/${e.employeeId}`}
                className="flex flex-1 items-center gap-3 hover:opacity-80"
              >
                <Avatar
                  src={e.avatarUrl}
                  fallback={e.name}
                  alt={e.name}
                  size={36}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {e.earned.length} huy hiệu
                  </p>
                </div>
                <AchievementBadge
                  badgeKey={e.newest}
                  earned
                  size="sm"
                />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
