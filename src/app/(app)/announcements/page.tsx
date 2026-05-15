import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Megaphone,
  ChevronLeft,
  ChevronRight,
  Search,
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PER_PAGE = 50;

type Severity = "info" | "success" | "warning" | "destructive";

const SEVERITY_VALUES: readonly Severity[] = [
  "info",
  "success",
  "warning",
  "destructive",
] as const;

function isSeverity(value: string | undefined): value is Severity {
  return (
    value === "info" ||
    value === "success" ||
    value === "warning" ||
    value === "destructive"
  );
}

const SEVERITY_LABEL: Record<Severity, string> = {
  info: "Thông tin",
  success: "Tích cực",
  warning: "Cảnh báo",
  destructive: "Khẩn cấp",
};

type SeverityStyle = {
  border: string;
  iconBg: string;
  badge: "default" | "secondary" | "success" | "warning" | "destructive" | "outline";
  Icon: React.ComponentType<{ className?: string }>;
};

const SEVERITY_STYLE: Record<Severity, SeverityStyle> = {
  info: {
    border: "border-l-sky-500",
    iconBg: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
    badge: "secondary",
    Icon: Info,
  },
  success: {
    border: "border-l-emerald-500",
    iconBg:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    badge: "success",
    Icon: CheckCircle2,
  },
  warning: {
    border: "border-l-amber-500",
    iconBg: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    badge: "warning",
    Icon: AlertTriangle,
  },
  destructive: {
    border: "border-l-rose-500",
    iconBg: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    badge: "destructive",
    Icon: AlertOctagon,
  },
};

type SearchParams = {
  q?: string;
  severity?: string;
  page?: string;
};

function parsePage(value: string | undefined): number {
  if (!value) return 1;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

function buildHref(
  params: Record<string, string | number | undefined>,
): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `/announcements?${qs}` : "/announcements";
}

type AnnouncementMetadata = {
  message?: string;
  severity?: Severity;
  senderName?: string;
};

function readMetadata(value: Prisma.JsonValue | null): AnnouncementMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const m = value as Record<string, unknown>;
  const out: AnnouncementMetadata = {};
  if (typeof m.message === "string") out.message = m.message;
  if (typeof m.severity === "string" && isSeverity(m.severity)) {
    out.severity = m.severity;
  }
  if (typeof m.senderName === "string") out.senderName = m.senderName;
  return out;
}

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sess = await getSession();
  if (!sess) redirect("/login");

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const severity: Severity | "" = isSeverity(sp.severity) ? sp.severity : "";
  const page = parsePage(sp.page);

  const where: Prisma.ActivityLogWhereInput = {
    action: "announcement.broadcast",
  };
  if (q) {
    where.summary = { contains: q, mode: "insensitive" };
  }
  if (severity) {
    where.metadata = {
      path: ["severity"],
      equals: severity,
    };
  }

  const [total, items] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PER_PAGE,
      skip: (page - 1) * PER_PAGE,
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="size-5" />
            Lịch sử thông báo
          </CardTitle>
          <CardDescription>
            {total === 0
              ? "Chưa có thông báo nào được gửi"
              : `Tổng cộng ${total.toLocaleString("vi-VN")} thông báo${
                  severity || q ? " (theo bộ lọc hiện tại)" : ""
                } · trang ${page}/${totalPages}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            method="get"
            action="/announcements"
            className="flex flex-col gap-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={buildHref({ q: q || undefined })}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  severity === ""
                    ? "border-foreground bg-foreground text-background"
                    : "border-input bg-background hover:bg-accent",
                )}
              >
                Tất cả
              </Link>
              {SEVERITY_VALUES.map((s) => {
                const active = severity === s;
                const style = SEVERITY_STYLE[s];
                return (
                  <Link
                    key={s}
                    href={buildHref({ severity: s, q: q || undefined })}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-input bg-background hover:bg-accent",
                    )}
                  >
                    <style.Icon className="size-3" />
                    {SEVERITY_LABEL[s]}
                  </Link>
                );
              })}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {severity !== "" && (
                <input type="hidden" name="severity" value={severity} />
              )}
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder="Tìm theo nội dung thông báo..."
                  className="pl-8"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button type="submit" variant="default">
                  Lọc
                </Button>
                {(q || severity) && (
                  <Button asChild variant="ghost">
                    <Link href="/announcements">Xoá lọc</Link>
                  </Button>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Megaphone}
              title="Không có thông báo nào"
              description={
                q || severity
                  ? "Thử bỏ bớt bộ lọc để xem thêm kết quả"
                  : "Khi quản trị viên gửi thông báo, chúng sẽ xuất hiện tại đây"
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const meta = readMetadata(item.metadata);
            const sev: Severity = meta.severity ?? "info";
            const style = SEVERITY_STYLE[sev];
            const body = meta.message ?? item.summary;
            const senderName =
              meta.senderName ?? item.user?.name ?? "Quản trị viên";
            return (
              <Card
                key={item.id}
                className={cn("border-l-4", style.border)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full",
                        style.iconBg,
                      )}
                    >
                      <style.Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={style.badge}>
                          {SEVERITY_LABEL[sev]}
                        </Badge>
                      </div>
                      <p className="whitespace-pre-wrap break-words text-base font-medium leading-snug text-foreground">
                        {body}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        bởi {senderName} · {formatDateTime(item.createdAt)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {(hasPrev || hasNext) && (
        <div className="flex items-center justify-between">
          <Button
            asChild
            variant="outline"
            size="sm"
            disabled={!hasPrev}
            className={cn(!hasPrev && "pointer-events-none opacity-50")}
          >
            <Link
              href={buildHref({
                q: q || undefined,
                severity: severity || undefined,
                page: page > 2 ? page - 1 : undefined,
              })}
            >
              <ChevronLeft className="size-4" />
              Trước
            </Link>
          </Button>
          <span className="text-xs text-muted-foreground">
            Trang {page} / {totalPages}
          </span>
          <Button
            asChild
            variant="outline"
            size="sm"
            disabled={!hasNext}
            className={cn(!hasNext && "pointer-events-none opacity-50")}
          >
            <Link
              href={buildHref({
                q: q || undefined,
                severity: severity || undefined,
                page: page + 1,
              })}
            >
              Sau
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
