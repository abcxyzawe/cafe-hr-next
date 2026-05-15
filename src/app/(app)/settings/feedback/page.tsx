import Link from "next/link";
import { redirect } from "next/navigation";
import {
  MessageSquareHeart,
  Bug,
  Lightbulb,
  ThumbsUp,
  MessageCircle,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Link2,
  Star,
  Coffee,
  Phone,
  Download,
} from "lucide-react";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime, cn } from "@/lib/utils";
import {
  readCustomerMetadata,
  sentimentFromRating,
  SENTIMENT_META,
  summarizeRatings,
} from "@/lib/feedback-helpers";
import { HandledToggle } from "./handled-toggle";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

type UserCategory = "bug" | "feature" | "praise" | "other";
type Category = UserCategory | "customer";
const USER_CATEGORIES: ReadonlyArray<UserCategory> = [
  "bug",
  "feature",
  "praise",
  "other",
];
const CATEGORIES: ReadonlyArray<Category> = [
  ...USER_CATEGORIES,
  "customer",
];

const CATEGORY_META: Record<
  Category,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    tone: string;
    chipTone: string;
  }
> = {
  bug: {
    label: "Báo lỗi",
    icon: Bug,
    tone: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-900/50",
    chipTone: "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300",
  },
  feature: {
    label: "Đề xuất",
    icon: Lightbulb,
    tone: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-900/50",
    chipTone: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
  },
  praise: {
    label: "Lời khen",
    icon: ThumbsUp,
    tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50",
    chipTone:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300",
  },
  other: {
    label: "Khác",
    icon: MessageCircle,
    tone: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 border-sky-200 dark:border-sky-900/50",
    chipTone: "bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300",
  },
  customer: {
    label: "Khách hàng",
    icon: Coffee,
    tone: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-900/50",
    chipTone:
      "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300",
  },
};

type SearchParams = {
  category?: string;
  q?: string;
  page?: string;
};

function isUserCategory(v: string | undefined): v is UserCategory {
  return (
    typeof v === "string" &&
    (USER_CATEGORIES as ReadonlyArray<string>).includes(v)
  );
}
function isCategory(v: string | undefined): v is Category {
  return (
    typeof v === "string" && (CATEGORIES as ReadonlyArray<string>).includes(v)
  );
}

function parsePage(value: string | undefined): number {
  if (!value) return 1;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

function buildHref(
  params: Record<string, string | number | undefined>,
): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "" || v === null) continue;
    q.set(k, String(v));
  }
  const qs = q.toString();
  return qs ? `/settings/feedback?${qs}` : "/settings/feedback";
}

function readUserMetadata(raw: Prisma.JsonValue | null): {
  category: UserCategory | null;
  message: string | null;
  pageUrl: string | null;
} {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { category: null, message: null, pageUrl: null };
  }
  const obj = raw as { [k: string]: Prisma.JsonValue | undefined };
  const rawCategory = obj.category;
  const rawMessage = obj.message;
  const rawPageUrl = obj.pageUrl;
  return {
    category: isUserCategory(
      typeof rawCategory === "string" ? rawCategory : undefined,
    )
      ? (rawCategory as UserCategory)
      : null,
    message: typeof rawMessage === "string" ? rawMessage : null,
    pageUrl: typeof rawPageUrl === "string" ? rawPageUrl : null,
  };
}

export default async function FeedbackAdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sess = await getSession();
  if (!sess) redirect("/login");
  if (sess.role !== "admin") redirect("/");

  const sp = await searchParams;
  const category: Category | null = isCategory(sp.category) ? sp.category : null;
  const q = sp.q?.trim() ?? "";
  const page = parsePage(sp.page);

  // Base where: include both user and customer feedback
  const baseActionFilter: Prisma.ActivityLogWhereInput = {
    action: { in: ["user.feedback", "customer.feedback"] },
  };

  let where: Prisma.ActivityLogWhereInput = { ...baseActionFilter };
  if (category === "customer") {
    where = { action: "customer.feedback" };
  } else if (category !== null) {
    where = {
      action: "user.feedback",
      metadata: {
        path: ["category"],
        equals: category,
      },
    };
  }
  if (q) {
    where.summary = { contains: q, mode: "insensitive" };
  }

  const logsQuery = Prisma.validator<Prisma.ActivityLogDefaultArgs>()({
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });
  type LogItem = Prisma.ActivityLogGetPayload<typeof logsQuery>;

  let logs: LogItem[] = [];
  let total = 0;
  const counts: Record<Category, number> = {
    bug: 0,
    feature: 0,
    praise: 0,
    other: 0,
    customer: 0,
  };
  let totalAll = 0;
  let error: string | null = null;
  const customerRatings: number[] = [];

  try {
    const [items, count, allMetas] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
        include: logsQuery.include,
      }),
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where: baseActionFilter,
        select: { id: true, action: true, metadata: true },
      }),
    ]);
    logs = items;
    total = count;
    totalAll = allMetas.length;
    for (const m of allMetas) {
      if (m.action === "customer.feedback") {
        counts.customer += 1;
        const cmd = readCustomerMetadata(m.metadata);
        if (cmd.rating !== null) customerRatings.push(cmd.rating);
      } else {
        const md = readUserMetadata(m.metadata);
        if (md.category) counts[md.category] += 1;
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const ratingSummary = summarizeRatings(customerRatings);
  const maxBucket = Math.max(
    1,
    ratingSummary.distribution[1],
    ratingSummary.distribution[2],
    ratingSummary.distribution[3],
    ratingSummary.distribution[4],
    ratingSummary.distribution[5],
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = category !== null || q !== "";
  const baseFilterParams: Record<string, string | number | undefined> = {
    category: category ?? undefined,
    q: q || undefined,
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <MessageSquareHeart className="size-5 text-primary" />
              <div>
                <CardTitle>Phản hồi từ người dùng & khách hàng</CardTitle>
                <CardDescription>
                  Tổng hợp báo lỗi, đề xuất, lời khen từ nhân viên và đánh giá
                  từ khách ghé quán — tổng cộng {totalAll} phản hồi.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <a href="/api/feedback/csv">
                  <Download className="size-4" />
                  Xuất CSV
                </a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/settings">
                  <ChevronLeft className="size-4" />
                  Về cài đặt
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildHref({ q: q || undefined })}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                category === null
                  ? "border-primary bg-primary/10 text-foreground"
                  : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Inbox className="size-3.5" />
              Tất cả
              <span className="ml-1 rounded-full bg-background/60 px-1.5 text-[10px] tabular-nums">
                {totalAll}
              </span>
            </Link>
            {CATEGORIES.map((c) => {
              const meta = CATEGORY_META[c];
              const Icon = meta.icon;
              const active = category === c;
              return (
                <Link
                  key={c}
                  href={buildHref({ category: c, q: q || undefined })}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-foreground"
                      : cn(meta.chipTone, "border-transparent hover:opacity-90"),
                  )}
                >
                  <Icon className="size-3.5" />
                  {meta.label}
                  <span className="ml-1 rounded-full bg-background/60 px-1.5 text-[10px] tabular-nums">
                    {counts[c]}
                  </span>
                </Link>
              );
            })}
          </div>

          <form
            method="GET"
            action="/settings/feedback"
            className="grid gap-3 md:grid-cols-4"
          >
            <div className="md:col-span-2">
              <Label htmlFor="fb-q" className="mb-1.5 block text-xs">
                Tìm trong nội dung
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="fb-q"
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder="VD: lỗi đăng nhập, gợi ý..."
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="fb-category" className="mb-1.5 block text-xs">
                Loại phản hồi
              </Label>
              <select
                id="fb-category"
                name="category"
                defaultValue={category ?? ""}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm [&>option]:bg-background [&>option]:text-foreground"
              >
                <option value="">Tất cả</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_META[c].label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" size="sm">
                <Search className="size-4" />
                Tìm
              </Button>
              {hasFilters && (
                <Button asChild type="button" variant="outline" size="sm">
                  <Link href="/settings/feedback">
                    <X className="size-4" />
                    Xoá lọc
                  </Link>
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Star className="size-5 fill-amber-400 text-amber-400" />
            <div>
              <CardTitle>Đánh giá khách hàng</CardTitle>
              <CardDescription>
                Tóm tắt từ {ratingSummary.total} đánh giá có sao trên trang
                /feedback công khai.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {ratingSummary.total === 0 ? (
            <p className="text-sm text-muted-foreground">
              Chưa có đánh giá nào từ khách hàng — chia sẻ link{" "}
              <Link
                href="/feedback"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                /feedback
              </Link>{" "}
              để bắt đầu thu thập.
            </p>
          ) : (
            <div className="grid gap-6 md:grid-cols-[minmax(0,220px)_1fr]">
              <div className="flex flex-col items-center justify-center rounded-lg border bg-muted/30 p-4 text-center">
                <div className="text-4xl font-bold tabular-nums">
                  {ratingSummary.average.toFixed(1)}
                </div>
                <div className="mt-1 flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const filled = n <= Math.round(ratingSummary.average);
                    return (
                      <Star
                        key={n}
                        className={cn(
                          "size-4",
                          filled
                            ? "fill-amber-400 text-amber-400"
                            : "fill-transparent text-muted-foreground/30",
                        )}
                      />
                    );
                  })}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {ratingSummary.total} đánh giá
                </div>
              </div>
              <div className="space-y-1.5">
                {([5, 4, 3, 2, 1] as const).map((star) => {
                  const count = ratingSummary.distribution[star];
                  const pct =
                    ratingSummary.total === 0
                      ? 0
                      : (count / ratingSummary.total) * 100;
                  const widthPct = (count / maxBucket) * 100;
                  return (
                    <div
                      key={star}
                      className="flex items-center gap-2 text-xs"
                    >
                      <span className="inline-flex w-6 items-center gap-0.5 tabular-nums">
                        {star}
                        <Star className="size-3 fill-amber-400 text-amber-400" />
                      </span>
                      <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-amber-400/80"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                      <span className="w-16 text-right text-muted-foreground tabular-nums">
                        {count} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <CardTitle>
              Kết quả{" "}
              <Badge variant="secondary" className="ml-1">
                {total}
              </Badge>
            </CardTitle>
            <CardDescription>
              {total === 0
                ? "Không có phản hồi nào khớp"
                : `Trang ${page} / ${totalPages} · hiển thị ${logs.length} / ${total} phản hồi`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={buildHref({ ...baseFilterParams, page: page - 1 })}
                >
                  <ChevronLeft className="size-4" />
                  Trước
                </Link>
              </Button>
            ) : (
              <Button type="button" disabled variant="outline" size="sm">
                <ChevronLeft className="size-4" />
                Trước
              </Button>
            )}
            {page < totalPages ? (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={buildHref({ ...baseFilterParams, page: page + 1 })}
                >
                  Sau
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
            ) : (
              <Button type="button" disabled variant="outline" size="sm">
                Sau
                <ChevronRight className="size-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <MessageSquareHeart className="size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {hasFilters
                  ? "Không có phản hồi khớp bộ lọc — thử mở rộng tiêu chí."
                  : "Chưa nhận được phản hồi nào — hãy mời nhân viên đóng góp ý kiến!"}
              </p>
              {hasFilters && (
                <Button asChild variant="outline" size="sm">
                  <Link href="/settings/feedback">
                    <X className="size-4" />
                    Xoá bộ lọc
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <ul className="space-y-3">
              {logs.map((l) => {
                const isCustomer = l.action === "customer.feedback";
                if (isCustomer) {
                  const cmd = readCustomerMetadata(l.metadata);
                  const meta = CATEGORY_META.customer;
                  const Icon = meta.icon;
                  const displayName = cmd.name ?? "Khách ẩn danh";
                  const sentiment = sentimentFromRating(cmd.rating);
                  const sentimentMeta = sentiment
                    ? SENTIMENT_META[sentiment]
                    : null;
                  return (
                    <li
                      key={l.id}
                      className="rounded-lg border bg-card p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <div
                            className={cn(
                              "flex size-9 shrink-0 items-center justify-center rounded-full border",
                              meta.tone,
                            )}
                          >
                            <Icon className="size-4" />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "border-transparent",
                                  meta.chipTone,
                                )}
                              >
                                {meta.label}
                              </Badge>
                              {sentimentMeta && (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "border-transparent",
                                    sentimentMeta.chipClass,
                                  )}
                                >
                                  {sentimentMeta.label}
                                </Badge>
                              )}
                              <div className="flex items-center gap-2">
                                <Avatar fallback={displayName} size={20} />
                                <span className="text-sm font-medium">
                                  {displayName}
                                </span>
                              </div>
                              {cmd.rating !== null && (
                                <span className="inline-flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map((n) => (
                                    <Star
                                      key={n}
                                      className={cn(
                                        "size-3.5",
                                        n <= (cmd.rating ?? 0)
                                          ? "fill-amber-400 text-amber-400"
                                          : "fill-transparent text-muted-foreground/30",
                                      )}
                                    />
                                  ))}
                                  <span className="ml-1 text-[11px] font-medium tabular-nums text-muted-foreground">
                                    {cmd.rating}/5
                                  </span>
                                </span>
                              )}
                            </div>
                            {cmd.contact && (
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <Phone className="size-3" />
                                <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
                                  {cmd.contact}
                                </code>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {formatDateTime(l.createdAt)}
                          </span>
                          <HandledToggle id={l.id} />
                        </div>
                      </div>
                      <pre className="mt-3 whitespace-pre-wrap break-words rounded-md bg-muted/40 p-3 font-sans text-sm text-foreground">
                        {cmd.comment ?? l.summary}
                      </pre>
                    </li>
                  );
                }

                const md = readUserMetadata(l.metadata);
                const cat = md.category;
                const meta = cat ? CATEGORY_META[cat] : null;
                const Icon = meta?.icon ?? MessageCircle;
                return (
                  <li
                    key={l.id}
                    className="rounded-lg border bg-card p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-full border",
                            meta?.tone ??
                              "bg-muted text-muted-foreground border-transparent",
                          )}
                        >
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                "border-transparent",
                                meta?.chipTone ?? "bg-muted text-muted-foreground",
                              )}
                            >
                              {meta?.label ?? "Không rõ"}
                            </Badge>
                            {l.user ? (
                              <div className="flex items-center gap-2">
                                <Avatar fallback={l.user.name} size={20} />
                                <span className="text-sm font-medium">
                                  {l.user.name}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  ·{" "}
                                  {l.user.role === "admin" ? "Admin" : "Staff"}{" "}
                                  · {l.user.email}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Hệ thống
                              </span>
                            )}
                          </div>
                          {md.pageUrl && (
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <Link2 className="size-3" />
                              <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
                                {md.pageUrl}
                              </code>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {formatDateTime(l.createdAt)}
                        </span>
                        <HandledToggle id={l.id} />
                      </div>
                    </div>
                    <pre className="mt-3 whitespace-pre-wrap break-words rounded-md bg-muted/40 p-3 font-sans text-sm text-foreground">
                      {md.message ?? l.summary}
                    </pre>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
