"use client";

import { useEffect, useState } from "react";
import { Activity, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HealthResponse = {
  ok: boolean;
  checks: Record<string, { ok: boolean; detail?: string }>;
  stats?: Record<string, number>;
  runtime?: {
    uptimeSeconds: number;
    memoryRssMB: number;
    memoryHeapUsedMB: number;
    nodeVersion: string;
    platform: string;
  };
  timestamp: string;
};

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}n ${h}g`;
  if (h > 0) return `${h}g ${m}p`;
  return `${m}p`;
}

const STAT_LABELS: Record<string, string> = {
  employees: "Nhân viên",
  attendanceToday: "Check-in hôm nay",
  openAttendance: "Đang trong ca",
  pendingLeaves: "Đơn nghỉ chờ duyệt",
};

export function HealthStatusCard() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      const json = (await res.json()) as HealthResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-5 text-primary" />
            Tình trạng hệ thống
          </CardTitle>
          <CardDescription>
            Kết quả từ <code className="rounded bg-muted px-1">/api/health</code>
            {data && (
              <>
                {" "}
                · cập nhật{" "}
                {new Date(data.timestamp).toLocaleTimeString("vi-VN")}
              </>
            )}
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading}
        >
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          Làm mới
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <p className="text-sm text-destructive">Lỗi tải /api/health: {error}</p>
        )}
        {!data && !error && (
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        )}
        {data && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {Object.entries(data.checks).map(([name, c]) => (
                <span
                  key={name}
                  title={c.detail}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs",
                    c.ok
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      : "border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
                  )}
                >
                  {c.ok ? (
                    <CheckCircle2 className="size-3" />
                  ) : (
                    <XCircle className="size-3" />
                  )}
                  {name}
                  {c.detail && (
                    <span className="ml-1 opacity-70 truncate max-w-[120px]">
                      {c.detail}
                    </span>
                  )}
                </span>
              ))}
            </div>
            {data.stats && Object.keys(data.stats).length > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Object.entries(data.stats).map(([k, v]) => (
                  <div
                    key={k}
                    className="rounded-md border bg-muted/30 p-2 text-center"
                  >
                    <p className="text-lg font-bold tabular-nums">{v}</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {STAT_LABELS[k] ?? k}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {data.runtime && (
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
                <span>
                  Uptime:{" "}
                  <span className="font-mono">
                    {formatUptime(data.runtime.uptimeSeconds)}
                  </span>
                </span>
                <span>
                  RSS:{" "}
                  <span className="font-mono">{data.runtime.memoryRssMB}MB</span>
                </span>
                <span>
                  Heap:{" "}
                  <span className="font-mono">
                    {data.runtime.memoryHeapUsedMB}MB
                  </span>
                </span>
                <span>
                  Node:{" "}
                  <span className="font-mono">{data.runtime.nodeVersion}</span>
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
