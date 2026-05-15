import { redirect } from "next/navigation";
import {
  Sparkles,
  MessageSquare,
  Users,
  Star,
  Inbox,
  ThumbsUp,
  AlertTriangle,
  Tag,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSession } from "@/lib/auth";
import {
  gatherFeedbackFacts,
  getCachedReport,
  type FeedbackFacts,
} from "@/lib/feedback-compiler-data";
import { RefreshFeedbackReportButton } from "./refresh-button";

export const dynamic = "force-dynamic";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatDate(d: Date): string {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function formatGeneratedAt(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())} ${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
}

type SampleParts = {
  source: "khách" | "nhân viên" | "khác";
  body: string;
  tag: string | null;
};

function splitSample(line: string): SampleParts {
  const sourceMatch = /^(khách|nhân viên):\s*/.exec(line);
  let source: SampleParts["source"] = "khác";
  let rest = line;
  if (sourceMatch) {
    source = sourceMatch[1] as SampleParts["source"];
    rest = line.slice(sourceMatch[0].length);
  }
  const tagMatch = /\s\[([^\]]+)\]\s*$/.exec(rest);
  let tag: string | null = null;
  let body = rest;
  if (tagMatch) {
    tag = tagMatch[1];
    body = rest.slice(0, tagMatch.index).trim();
  }
  return { source, body, tag };
}

type StatTile = {
  key: string;
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
};

function buildTiles(facts: FeedbackFacts): StatTile[] {
  return [
    {
      key: "customer",
      label: "Phản hồi khách",
      value: facts.customerCount.toLocaleString("vi-VN"),
      icon: MessageSquare,
      accent:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    },
    {
      key: "user",
      label: "Phản hồi nhân viên",
      value: facts.userCount.toLocaleString("vi-VN"),
      icon: Users,
      accent: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
    },
    {
      key: "rating",
      label: "Điểm trung bình",
      value:
        facts.avgRating === null ? "—" : `${facts.avgRating.toFixed(2)} / 5`,
      icon: Star,
      accent:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    },
    {
      key: "samples",
      label: "Mẫu tin nhắn",
      value: facts.sampleMessages.length.toLocaleString("vi-VN"),
      icon: Inbox,
      accent:
        "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    },
  ];
}

export default async function FeedbackCompilerPage() {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") redirect("/");

  const now = new Date();
  let facts: FeedbackFacts | null = null;
  let factsError: string | null = null;
  try {
    facts = await gatherFeedbackFacts();
  } catch (e) {
    factsError = e instanceof Error ? e.message : String(e);
  }

  const cached = getCachedReport(dayKey(now));
  const tiles = facts ? buildTiles(facts) : [];
  const topSamples = facts ? facts.sampleMessages.slice(0, 5) : [];

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
                <Sparkles className="size-5" />
              </span>
              <div>
                <CardTitle className="text-2xl md:text-3xl">
                  Tổng hợp phản hồi 7 ngày
                </CardTitle>
                <CardDescription>
                  {facts
                    ? `Cửa sổ ${formatDate(facts.windowStart)} – ${formatDate(facts.windowEnd)} · gộp phản hồi khách + nhân viên`
                    : "Đang đọc dữ liệu phản hồi…"}
                </CardDescription>
              </div>
            </div>
            <RefreshFeedbackReportButton hasReport={cached !== null} />
          </div>
        </CardHeader>
      </Card>

      {factsError ? (
        <Card>
          <CardContent className="p-6 text-sm text-destructive">
            {factsError}
          </CardContent>
        </Card>
      ) : facts ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {tiles.map((t) => {
              const Icon = t.icon;
              return (
                <Card key={t.key}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <span
                      className={`inline-flex size-10 shrink-0 items-center justify-center rounded-md ${t.accent}`}
                    >
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{t.label}</p>
                      <p className="truncate text-lg font-semibold">{t.value}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {Object.keys(facts.byCategory).length > 0 ? (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Tag className="size-4 text-muted-foreground" />
                  <CardTitle className="text-base">
                    Phản hồi nhân viên theo nhóm
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {Object.entries(facts.byCategory).map(([cat, count]) => (
                  <Badge key={cat} variant="secondary">
                    {cat} · {count.toLocaleString("vi-VN")}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Inbox className="size-5 text-muted-foreground" />
                  <div>
                    <CardTitle>Mẫu phản hồi gần đây</CardTitle>
                    <CardDescription>
                      5 tin nhắn mới nhất đã ẩn thông tin liên hệ
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {topSamples.length === 0 ? (
                  <p className="rounded-md border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                    Không có tin nhắn nào trong 7 ngày qua.
                  </p>
                ) : (
                  topSamples.map((line, idx) => {
                    const parts = splitSample(line);
                    const isCustomer = parts.source === "khách";
                    return (
                      <div
                        key={idx}
                        className="rounded-md border bg-muted/30 p-3 text-sm"
                      >
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <Badge
                            variant={isCustomer ? "default" : "secondary"}
                            className="capitalize"
                          >
                            {parts.source}
                          </Badge>
                          {parts.tag ? (
                            <Badge
                              variant={
                                isCustomer && parts.tag.startsWith("★")
                                  ? "warning"
                                  : "outline"
                              }
                            >
                              {parts.tag}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="leading-relaxed">{parts.body}</p>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="size-5 text-amber-500" />
                  <div>
                    <CardTitle>AI tổng hợp</CardTitle>
                    <CardDescription>
                      {cached
                        ? `Tạo lúc ${formatGeneratedAt(cached.generatedAt)}`
                        : "Bấm Tổng hợp với AI để Grok phân tích các con số"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {cached ? (
                  <>
                    <section className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm dark:border-sky-900/40 dark:bg-sky-900/20">
                      <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
                        <Tag className="size-3.5" />
                        Chủ đề chính
                      </h3>
                      <ul className="list-disc space-y-1 pl-5 leading-relaxed">
                        {cached.themes.map((t, i) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                    </section>
                    <section className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900/40 dark:bg-emerald-900/20">
                      <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                        <ThumbsUp className="size-3.5" />
                        Điểm tích cực
                      </h3>
                      <ul className="list-disc space-y-1 pl-5 leading-relaxed">
                        {cached.positives.map((t, i) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                    </section>
                    <section className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm dark:border-rose-900/40 dark:bg-rose-900/20">
                      <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">
                        <AlertTriangle className="size-3.5" />
                        Cần lưu ý
                      </h3>
                      <ul className="list-disc space-y-1 pl-5 leading-relaxed">
                        {cached.concerns.map((t, i) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                    </section>
                  </>
                ) : (
                  <p className="rounded-md border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                    Chưa có bản tổng hợp cho hôm nay. Bấm &ldquo;Tổng hợp với
                    AI&rdquo; phía trên để Grok đưa ra 3 chủ đề chính, 3 điểm
                    tích cực và 3 lưu ý dựa trên dữ liệu bên trái.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
