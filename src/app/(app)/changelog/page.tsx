import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUp,
  Bug,
  Sparkles,
  TrendingUp,
  Calendar,
  Rocket,
  SearchX,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import {
  CHANGELOG,
  type ChangelogKind,
  type ChangelogItem,
  type ChangelogEntry,
} from "@/lib/changelog-data";
import { ChangelogFilters } from "./changelog-filters";
import { UnreadDot } from "./unread-dot";

export const dynamic = "force-dynamic";

const KIND_LABELS: Record<ChangelogKind, string> = {
  feature: "Tính năng mới",
  improvement: "Cải tiến",
  fix: "Sửa lỗi",
};

const KIND_ACCENTS: Record<
  ChangelogKind,
  { dot: string; chip: string; icon: string }
> = {
  feature: {
    dot: "bg-emerald-500",
    chip:
      "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    icon:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  improvement: {
    dot: "bg-sky-500",
    chip:
      "border-transparent bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
    icon:
      "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  },
  fix: {
    dot: "bg-amber-500",
    chip:
      "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    icon:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
};

function KindIcon({
  kind,
  className,
}: {
  kind: ChangelogKind;
  className?: string;
}) {
  switch (kind) {
    case "feature":
      return <Sparkles className={className} />;
    case "improvement":
      return <TrendingUp className={className} />;
    case "fix":
      return <Bug className={className} />;
  }
}

function entryYear(entry: ChangelogEntry): number {
  // Date strings are `YYYY-MM-DD` per the schema; safe to slice.
  return Number.parseInt(entry.date.slice(0, 4), 10);
}

function entrySearchText(entry: ChangelogEntry): string {
  const parts: string[] = [entry.version];
  for (const item of entry.highlights) {
    parts.push(item.title);
    parts.push(item.description);
  }
  return parts.join(" \u00b7 ");
}

export default async function ChangelogPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");

  const latest = CHANGELOG[0];
  const years = Array.from(
    new Set(CHANGELOG.map((e) => entryYear(e)).filter((n) => Number.isFinite(n))),
  ).sort((a, b) => b - a);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Hero header */}
      <header className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-accent/30 to-background p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
              <Rocket className="size-3" />
              Changelog
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Có gì mới?
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
              Lịch sử cập nhật của Cafe HR — mỗi phiên bản là một bước để bạn
              quản lý quán nhẹ nhàng hơn một chút.
            </p>
          </div>
          {latest ? (
            <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
              <Badge className="text-xs">Phiên bản mới nhất · {latest.version}</Badge>
              <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="size-3.5" />
                {formatDate(latest.date)}
              </div>
            </div>
          ) : null}
        </div>
      </header>

      {latest ? (
        <ChangelogFilters
          years={years}
          latestVersion={latest.version}
        />
      ) : null}

      {/* Empty-state shown by client filter when nothing matches. */}
      <div
        data-changelog-empty
        className="hidden rounded-2xl border border-dashed bg-card/40 p-8 text-center text-sm text-muted-foreground"
      >
        <SearchX className="mx-auto mb-2 size-6 text-muted-foreground/70" />
        Không tìm thấy phiên bản nào khớp với bộ lọc hiện tại.
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line connecting versions */}
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-[15px] top-2 w-px bg-gradient-to-b from-border via-border to-transparent sm:left-[19px]"
        />

        <ol className="space-y-10">
          {CHANGELOG.map((entry, idx) => {
            const year = entryYear(entry);
            return (
              <li key={entry.version} className="relative">
                <article
                  data-changelog-entry
                  data-year={Number.isFinite(year) ? String(year) : ""}
                  data-text={entrySearchText(entry)}
                  className="relative pl-10 sm:pl-14"
                >
                  {/* Timeline dot */}
                  <div className="absolute left-0 top-1.5 flex size-8 items-center justify-center rounded-full border bg-background shadow-sm sm:size-10">
                    <div
                      className={`size-3 rounded-full ${
                        idx === 0 ? "bg-primary animate-pulse" : "bg-muted-foreground/30"
                      }`}
                    />
                  </div>

                  {/* Version chip row */}
                  <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span className="inline-flex items-baseline gap-2 rounded-lg border bg-card px-3 py-1.5 text-base font-bold tracking-tight shadow-sm">
                      <span className="text-primary">{entry.version}</span>
                      <span className="text-muted-foreground/50">·</span>
                      <span className="text-sm font-medium tabular-nums text-muted-foreground">
                        {formatDate(entry.date)}
                      </span>
                    </span>
                    {idx === 0 ? (
                      <Badge variant="success" className="text-[10px] uppercase tracking-wider">
                        Mới nhất
                      </Badge>
                    ) : null}
                    <UnreadDot version={entry.version} />
                  </div>

                  {/* Entries card */}
                  <Card className="overflow-hidden">
                    <CardHeader className="border-b bg-muted/20 py-3">
                      <CardTitle className="flex items-center justify-between text-sm font-medium">
                        <span className="text-muted-foreground">
                          {entry.highlights.length} thay đổi đáng chú ý
                        </span>
                        <KindLegend items={entry.highlights} />
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ul className="divide-y">
                        {entry.highlights.map((item, i) => (
                          <ChangelogRow key={`${entry.version}-${i}`} item={item} />
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </article>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="flex flex-col items-center gap-3 pt-4 text-center">
        <p className="text-xs text-muted-foreground">
          Có góp ý? Nhắn admin trong cài đặt — bản tiếp theo có thể là của bạn.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="#top">
            <ArrowUp className="size-4" />
            Đến đầu trang
          </Link>
        </Button>
      </div>
    </div>
  );
}

function ChangelogRow({ item }: { item: ChangelogItem }) {
  const accent = KIND_ACCENTS[item.kind];
  return (
    <li className="flex gap-3 px-4 py-3 transition-colors hover:bg-accent/30 sm:px-5 sm:py-4">
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${accent.icon}`}
      >
        <KindIcon kind={item.kind} className="size-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-semibold leading-tight">{item.title}</p>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${accent.chip}`}
          >
            {KIND_LABELS[item.kind]}
          </span>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {item.description}
        </p>
      </div>
    </li>
  );
}

function KindLegend({ items }: { items: ChangelogItem[] }) {
  const counts = items.reduce<Record<ChangelogKind, number>>(
    (acc, item) => {
      acc[item.kind] += 1;
      return acc;
    },
    { feature: 0, improvement: 0, fix: 0 },
  );
  const order: ChangelogKind[] = ["feature", "improvement", "fix"];
  return (
    <span className="flex items-center gap-2 text-[11px] font-normal text-muted-foreground">
      {order
        .filter((k) => counts[k] > 0)
        .map((k) => (
          <span key={k} className="inline-flex items-center gap-1">
            <span className={`size-1.5 rounded-full ${KIND_ACCENTS[k].dot}`} />
            <span className="tabular-nums">{counts[k]}</span>
          </span>
        ))}
    </span>
  );
}
