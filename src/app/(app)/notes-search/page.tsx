import Link from "next/link";
import { redirect } from "next/navigation";
import { Search, StickyNote, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, ROLE_LABELS } from "@/lib/utils";
import { highlightMatch } from "../audit/highlight";
import {
  RecentSearchesChips,
  RecentSearchesTracker,
} from "./recent-searches";
import { EmployeeHoverPreview } from "@/components/employee-hover-preview";

export const dynamic = "force-dynamic";

const SNIPPET_LENGTH = 200;
const RESULT_LIMIT = 100;
const MIN_QUERY_LENGTH = 2;

type SearchParams = { q?: string };

function buildSnippet(content: string, query: string, max: number): string {
  const trimmedContent = content.replace(/\s+/g, " ").trim();
  if (trimmedContent.length <= max) return trimmedContent;
  const idx = trimmedContent.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return trimmedContent.slice(0, max) + "…";
  // Center the snippet around the match
  const half = Math.floor(max / 2);
  const start = Math.max(0, idx - half);
  const end = Math.min(trimmedContent.length, start + max);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < trimmedContent.length ? "…" : "";
  return prefix + trimmedContent.slice(start, end) + suffix;
}

export default async function NotesSearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sess = await getSession();
  if (!sess) redirect("/login");

  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const isValidQuery = q.length >= MIN_QUERY_LENGTH;

  type NoteRow = {
    id: number;
    content: string;
    authorName: string;
    createdAt: Date;
    employee: {
      id: number;
      name: string;
      avatarUrl: string | null;
      role: "barista" | "server" | "cashier" | "manager";
    };
  };

  let results: NoteRow[] = [];
  let error: string | null = null;

  if (isValidQuery) {
    try {
      results = await prisma.employeeNote.findMany({
        where: { content: { contains: q, mode: "insensitive" } },
        orderBy: { createdAt: "desc" },
        take: RESULT_LIMIT,
        select: {
          id: true,
          content: true,
          authorName: true,
          createdAt: true,
          employee: {
            select: { id: true, name: true, avatarUrl: true, role: true },
          },
        },
      });
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <StickyNote className="size-5 text-primary" />
            <div>
              <CardTitle>Tìm trong ghi chú</CardTitle>
              <CardDescription>
                Tìm kiếm toàn văn trong nội dung ghi chú nhân viên.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form
            method="GET"
            action="/notes-search"
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <Label htmlFor="notes-q" className="mb-1.5 block text-xs">
                Từ khoá
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="notes-q"
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder="Tìm kiếm trong nội dung ghi chú..."
                  minLength={MIN_QUERY_LENGTH}
                  className="pl-8"
                />
              </div>
            </div>
            <Button type="submit" size="sm">
              <Search className="size-4" />
              Tìm
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            Nhập tối thiểu {MIN_QUERY_LENGTH} ký tự. Hiển thị tối đa{" "}
            {RESULT_LIMIT} kết quả gần nhất.
          </p>
          <RecentSearchesChips />
        </CardContent>
      </Card>

      {isValidQuery && <RecentSearchesTracker query={q} />}

      {!isValidQuery ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <StickyNote className="size-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">
              {q.length === 0
                ? "Nhập từ khoá để bắt đầu tìm kiếm"
                : `Cần ít nhất ${MIN_QUERY_LENGTH} ký tự`}
            </p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Tìm kiếm trong toàn bộ ghi chú đã lưu. Kết quả sẽ hiển thị đoạn
              văn khớp cùng với liên kết tới hồ sơ nhân viên.
            </p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      ) : results.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Search className="size-10 text-muted-foreground/40" />
            <p className="text-sm">
              Không có ghi chú nào chứa &quot;{q}&quot;
            </p>
            <p className="text-xs text-muted-foreground">
              Thử từ khoá khác hoặc rút ngắn từ khoá.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{results.length}</Badge>
            <span>
              ghi chú khớp{" "}
              {results.length >= RESULT_LIMIT && (
                <span className="text-xs">(giới hạn {RESULT_LIMIT})</span>
              )}
            </span>
          </div>
          <ul className="space-y-3">
            {results.map((n) => {
              const snippet = buildSnippet(n.content, q, SNIPPET_LENGTH);
              return (
                <li
                  key={n.id}
                  className="group rounded-lg border bg-card/40 p-4 transition-colors hover:bg-card/70"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={n.employee.avatarUrl}
                      alt={n.employee.name}
                      fallback={n.employee.name}
                      size={32}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
                        <EmployeeHoverPreview employeeId={n.employee.id}>
                          <Link
                            href={`/employees/${n.employee.id}`}
                            className="font-semibold hover:underline"
                          >
                            {n.employee.name}
                          </Link>
                        </EmployeeHoverPreview>
                        <Badge variant="outline" className="text-[10px]">
                          {ROLE_LABELS[n.employee.role] ?? n.employee.role}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Ghi chú bởi {n.authorName} ·{" "}
                        {formatDateTime(n.createdAt)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
                    {highlightMatch(snippet, q)}
                  </p>
                  <div className="mt-3 flex justify-end">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/employees/${n.employee.id}`}>
                        Mở hồ sơ
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
