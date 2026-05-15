import Link from "next/link";
import { Star, Heart } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

export type KudosItem = {
  id: number;
  emoji: string;
  message: string;
  senderName: string;
  createdAt: Date;
};

export function KudosSection({
  items,
  count,
  employeeId,
}: {
  items: KudosItem[];
  count: number;
  employeeId: number;
}) {
  const showSeeAll = count > items.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="size-5 text-rose-500" />
          Lời khen ({count}) <Star className="size-4 text-amber-500" />
        </CardTitle>
        <CardDescription>
          Những lời động viên dành cho nhân viên này
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed bg-muted/30 px-4 py-8 text-center">
            <Heart className="size-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">Chưa có lời khen nào — hãy là người đầu tiên!</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((k) => (
              <li
                key={k.id}
                className="flex items-start gap-3 rounded-lg border bg-card/40 p-3"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-3xl">
                  <span aria-hidden>{k.emoji}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap text-sm leading-snug">{k.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{k.senderName}</span>
                    {" "}lúc{" "}
                    {formatDateTime(k.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {showSeeAll && (
          <div className="mt-4 flex justify-end">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/audit?action=kudos&entityId=${employeeId}`}>
                Xem tất cả ({count})
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
