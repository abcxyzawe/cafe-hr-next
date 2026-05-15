import { redirect } from "next/navigation";
import Link from "next/link";
import { Quote, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { QuoteStarButton } from "./quote-star-button";
import { SavedFilterToggle } from "./saved-filter-toggle";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

function parsePage(value: string | undefined): number {
  if (!value) return 1;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

function vnDate(d: Date): string {
  return d.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sess = await getSession();
  if (!sess) redirect("/login");
  if (sess.role !== "admin") redirect("/");

  const sp = await searchParams;
  const page = parsePage(sp.page);

  const [quotes, total] = await Promise.all([
    prisma.dailyQuote.findMany({
      orderBy: { date: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.dailyQuote.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Quote className="size-5 text-primary" />
            Câu nói mỗi ngày
          </CardTitle>
          <CardDescription>
            Lưu trữ {total} câu nói động lực đã được sinh tự động qua thời gian.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <SavedFilterToggle />
        </CardContent>
      </Card>

      {quotes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Chưa có câu nói nào được lưu. Quay lại sau khi hệ thống tự sinh câu
            đầu tiên.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {quotes.map((q) => {
            const iso = new Date(q.date).toISOString().slice(0, 10);
            const isToday = iso === todayIso;
            return (
              <li key={q.id} data-quote-id={q.id}>
                <Card
                  className={
                    isToday
                      ? "border-primary/40 bg-primary/5"
                      : undefined
                  }
                >
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="capitalize tabular-nums">
                        {vnDate(new Date(q.date))}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isToday && (
                          <Badge variant="default" className="gap-1">
                            <Sparkles className="size-3" />
                            Hôm nay
                          </Badge>
                        )}
                        <span className="rounded-full border bg-muted px-1.5 py-0.5 text-[10px] font-mono">
                          {q.model}
                        </span>
                        <QuoteStarButton quoteId={q.id} />
                      </div>
                    </div>
                    <p className="text-base leading-relaxed text-foreground">
                      <Quote
                        className="mr-1.5 inline size-3 -translate-y-1 text-primary/60"
                        aria-hidden
                      />
                      {q.content}
                    </p>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 pt-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            disabled={page <= 1}
          >
            <Link href={page <= 1 ? "#" : `/quotes?page=${page - 1}`}>
              <ChevronLeft className="size-4" />
              Trước
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground tabular-nums">
            Trang {page} / {totalPages} · {total} câu
          </p>
          <Button
            asChild
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
          >
            <Link href={page >= totalPages ? "#" : `/quotes?page=${page + 1}`}>
              Sau
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
