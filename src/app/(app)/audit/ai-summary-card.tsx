"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Sparkles, RefreshCw, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type {
  AuditSummaryFacts,
  CachedAuditSummary,
} from "@/lib/audit-summary-data";
import { refreshAuditSummaryAction } from "./summary-action";

type SerializedSummary = {
  generatedAtIso: string;
  content: string;
};

type Props = {
  summary: SerializedSummary | null;
  facts: AuditSummaryFacts;
};

const ACTION_LABELS: Record<string, string> = {
  "employee.create": "Tạo nhân viên",
  "employee.update": "Sửa nhân viên",
  "employee.delete": "Xoá nhân viên",
  "employee.avatar": "Avatar AI",
  "employee.avatar.batch": "Avatar AI (loạt)",
  "shift.create": "Tạo ca",
  "shift.delete": "Xoá ca",
  "shift.update": "Sửa ca",
  "attendance.checkin": "Check-in",
  "attendance.checkout": "Check-out",
  "user.login": "Đăng nhập",
  "user.logout": "Đăng xuất",
  "user.create": "Tạo tài khoản",
  "user.password": "Đổi mật khẩu",
  "leave.create": "Đơn nghỉ",
  "leave.approve": "Duyệt nghỉ",
  "leave.reject": "Từ chối nghỉ",
  "task.create": "Tạo task",
  "task.update": "Sửa task",
  "task.complete": "Xong task",
  "audit.cleanup": "Dọn nhật ký",
};

function labelOf(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function formatGeneratedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  return `${hh}:${mm} ${dd}/${mo}`;
}

export function AiSummaryCard({ summary: initialSummary, facts }: Props) {
  const [summary, setSummary] = useState<SerializedSummary | null>(
    initialSummary,
  );
  const [pending, startTransition] = useTransition();

  const topActions = Object.entries(facts.byAction)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  function onRefresh() {
    startTransition(async () => {
      const res = await refreshAuditSummaryAction();
      if (!res.ok) {
        toast.error(res.error || "Không tạo được tóm tắt");
        return;
      }
      // The server cache is updated; we ask the server to re-render so we
      // can read the new content via revalidatePath. Locally bump optimistic
      // marker so user sees instant feedback.
      toast.success("Đã tạo tóm tắt mới");
      // Optimistic local marker — actual content comes from RSC re-render.
      setSummary((prev) =>
        prev
          ? { ...prev, generatedAtIso: new Date().toISOString() }
          : prev,
      );
    });
  }

  const paragraphs = summary
    ? summary.content
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
    : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-amber-500" />
            <div>
              <CardTitle>AI tóm tắt 7 ngày</CardTitle>
              <CardDescription>
                {summary
                  ? `Tạo lúc ${formatGeneratedAt(summary.generatedAtIso)} · ${facts.totalEvents} sự kiện`
                  : `Tổng hợp ${facts.totalEvents} sự kiện gần nhất bằng AI`}
              </CardDescription>
            </div>
          </div>
          <Button
            type="button"
            variant={summary ? "outline" : "default"}
            size="sm"
            onClick={onRefresh}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : summary ? (
              <RefreshCw className="size-4" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {summary ? "Làm mới" : "AI tóm tắt 7 ngày"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {(topActions.length > 0 || facts.topUsers.length > 0) && (
          <div className="flex flex-col gap-2 text-xs">
            {topActions.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-medium text-muted-foreground">
                  Hành động:
                </span>
                {topActions.map(([action, count]) => (
                  <Badge key={action} variant="secondary" className="font-normal">
                    {labelOf(action)} · {count}
                  </Badge>
                ))}
              </div>
            )}
            {facts.topUsers.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-medium text-muted-foreground">
                  Người hoạt động:
                </span>
                {facts.topUsers.map((u) => (
                  <Badge key={u.name} variant="outline" className="font-normal">
                    {u.name} · {u.count}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {summary ? (
          <div className="space-y-2 rounded-md border bg-muted/40 p-4 text-sm leading-relaxed">
            {paragraphs.length > 0 ? (
              paragraphs.map((p, i) => <p key={i}>{p}</p>)
            ) : (
              <p>{summary.content}</p>
            )}
          </div>
        ) : (
          <p className="rounded-md border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
            Chưa có tóm tắt. Bấm &ldquo;AI tóm tắt 7 ngày&rdquo; để Grok đọc nhật ký
            gần đây và viết một đoạn nhận xét ngắn bằng tiếng Việt.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
