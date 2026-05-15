"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Download,
  FileJson,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildBackup,
  clearAllCafeHrKeys,
  listBackupEntries,
  restoreBackup,
  type BackupEntry,
  type RestoreResult,
} from "@/lib/backup-util";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function todayStamp(): string {
  const d = new Date();
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type ToastKind = "success" | "error" | "info";
type Toast = { kind: ToastKind; text: string } | null;

export function BackupBoard() {
  const [mounted, setMounted] = useState(false);
  const [entries, setEntries] = useState<BackupEntry[]>([]);
  const [pasted, setPasted] = useState("");
  const [restoreInfo, setRestoreInfo] = useState<RestoreResult | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  const refresh = useCallback(() => {
    setEntries(listBackupEntries());
  }, []);

  useEffect(() => {
    setMounted(true);
    setEntries(listBackupEntries());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const totals = useMemo(() => {
    const totalBytes = entries.reduce((sum, e) => sum + e.size, 0);
    return { count: entries.length, totalBytes };
  }, [entries]);

  const handleDownload = useCallback(() => {
    try {
      const payload = buildBackup();
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cafe-hr-backup-${todayStamp()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setToast({
        kind: "success",
        text: `Đã xuất ${Object.keys(payload.data).length} key.`,
      });
    } catch (err) {
      setToast({
        kind: "error",
        text: `Lỗi xuất: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }, []);

  const handleApply = useCallback(() => {
    setRestoreInfo(null);
    if (!pasted.trim()) {
      setToast({ kind: "error", text: "Vui lòng dán nội dung JSON trước." });
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(pasted);
    } catch (err) {
      setToast({
        kind: "error",
        text: `JSON không hợp lệ: ${err instanceof Error ? err.message : String(err)}`,
      });
      return;
    }
    const result = restoreBackup(parsed);
    setRestoreInfo(result);
    refresh();
    if (result.errors.length === 0) {
      setToast({
        kind: "success",
        text: `Đã khôi phục ${result.restored} key, bỏ qua ${result.skipped}.`,
      });
    } else {
      setToast({
        kind: "error",
        text: `Hoàn tất với ${result.errors.length} lỗi (xem chi tiết).`,
      });
    }
  }, [pasted, refresh]);

  const handleClearAll = useCallback(() => {
    const first = window.confirm(
      "Bạn chắc chắn muốn XOÁ TẤT CẢ key cafe-hr-* khỏi trình duyệt này?",
    );
    if (!first) return;
    const second = window.confirm(
      "Hành động không thể hoàn tác. Nhấn OK lần nữa để xác nhận xoá toàn bộ.",
    );
    if (!second) return;
    const cleared = clearAllCafeHrKeys();
    refresh();
    setRestoreInfo(null);
    setToast({ kind: "success", text: `Đã xoá ${cleared} key.` });
  }, [refresh]);

  return (
    <div className="flex flex-col gap-6">
      {toast && (
        <div
          role="status"
          className={
            toast.kind === "success"
              ? "rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
              : toast.kind === "error"
                ? "rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
                : "rounded-md border bg-muted px-4 py-2 text-sm"
          }
        >
          {toast.text}
        </div>
      )}

      {/* === SAO LƯU === */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="size-5" />
              Sao lưu
            </CardTitle>
            <CardDescription>
              Liệt kê tất cả key trong localStorage có tiền tố{" "}
              <code className="font-mono">cafe-hr-</code> /{" "}
              <code className="font-mono">cafe-hr:</code>.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={refresh} type="button">
              <RefreshCw className="size-4" />
              Làm mới
            </Button>
            <Button onClick={handleDownload} type="button" disabled={!mounted}>
              <Download className="size-4" />
              Tải JSON
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Badge variant="secondary">
              {mounted ? `${totals.count} key` : "—"}
            </Badge>
            <Badge variant="outline">
              Tổng dung lượng:{" "}
              {mounted ? formatBytes(totals.totalBytes) : "—"}
            </Badge>
          </div>
          {!mounted ? (
            <div className="rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              Đang đọc localStorage…
            </div>
          ) : entries.length === 0 ? (
            <div className="rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              Không có key nào khớp tiền tố cafe-hr-* trong trình duyệt này.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead className="w-32">Dung lượng</TableHead>
                    <TableHead className="w-32">Loại</TableHead>
                    <TableHead className="w-28 text-right">Phần tử</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => (
                    <TableRow key={e.key}>
                      <TableCell className="font-mono text-xs">
                        {e.key}
                      </TableCell>
                      <TableCell>{formatBytes(e.size)}</TableCell>
                      <TableCell>
                        {e.jsonValid ? (
                          e.arrayLength !== null ? (
                            <Badge variant="success">Array</Badge>
                          ) : (
                            <Badge variant="secondary">JSON</Badge>
                          )
                        ) : (
                          <Badge variant="outline">String</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {e.arrayLength ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* === KHÔI PHỤC === */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="size-5" />
            Khôi phục từ JSON
          </CardTitle>
          <CardDescription>
            Dán nguyên nội dung file backup đã xuất. Chỉ áp dụng cho key có tiền
            tố hợp lệ; các key khác sẽ bị bỏ qua.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder='{"exportedAt":"…","version":"1.0","data":{"cafe-hr-…":…}}'
            spellCheck={false}
            className="h-56 w-full rounded-md border border-input bg-background p-3 font-mono text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Lưu ý: thao tác sẽ ghi đè giá trị hiện có cho các key được khôi
              phục.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => {
                  setPasted("");
                  setRestoreInfo(null);
                }}
              >
                Xoá nội dung
              </Button>
              <Button onClick={handleApply} type="button" disabled={!mounted}>
                <Upload className="size-4" />
                Áp dụng
              </Button>
            </div>
          </div>
          {restoreInfo && (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="success">
                  Khôi phục: {restoreInfo.restored}
                </Badge>
                <Badge variant="outline">Bỏ qua: {restoreInfo.skipped}</Badge>
                {restoreInfo.errors.length > 0 && (
                  <Badge variant="warning">
                    Lỗi: {restoreInfo.errors.length}
                  </Badge>
                )}
              </div>
              {restoreInfo.errors.length > 0 && (
                <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                  {restoreInfo.errors.map((err, i) => (
                    <li key={i} className="font-mono">
                      {err}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* === NGUY HIỂM === */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            Nguy hiểm
          </CardTitle>
          <CardDescription>
            Xoá toàn bộ key có tiền tố <code className="font-mono">cafe-hr-</code>{" "}
            khỏi localStorage của trình duyệt này. Không thể hoàn tác.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            type="button"
            onClick={handleClearAll}
            disabled={!mounted || entries.length === 0}
          >
            <Trash2 className="size-4" />
            Xoá tất cả dữ liệu Cafe HR
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
