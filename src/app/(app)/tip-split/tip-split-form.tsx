"use client";

import { useMemo, useState } from "react";
import { Coins, Download, Scale, Timer, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ROLE_LABELS, formatVND } from "@/lib/utils";
import {
  ROLE_WEIGHT,
  distributeTip,
  type DistMethod,
  type SplitInput,
} from "@/lib/tip-split-logic";

export type EligibleEmployee = {
  id: number;
  name: string;
  role: string;
  weeklyHours: number;
};

type RowState = {
  id: number;
  name: string;
  role: string;
  hours: number;
};

const VND_NF = new Intl.NumberFormat("vi-VN");

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[^\d]/g, "");
  if (!cleaned) return 0;
  const n = Number.parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : 0;
}

function parseHoursInput(raw: string): number {
  const cleaned = raw.replace(",", ".").trim();
  if (!cleaned) return 0;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 999) : 0;
}

function csvEscape(value: string): string {
  const needsQuote = /[",\n\r]/.test(value);
  const v = value.replace(/"/g, '""');
  return needsQuote ? `"${v}"` : v;
}

const METHOD_OPTIONS: ReadonlyArray<{
  key: DistMethod;
  label: string;
  desc: string;
  icon: React.ReactNode;
}> = [
  {
    key: "equal",
    label: "Chia đều",
    desc: "Mỗi người nhận phần bằng nhau, không quan tâm giờ hay vai trò.",
    icon: <Users className="size-4" />,
  },
  {
    key: "hours",
    label: "Theo giờ làm",
    desc: "Chia tỉ lệ thuận với số giờ đã làm trong tuần này.",
    icon: <Timer className="size-4" />,
  },
  {
    key: "role",
    label: "Theo vai trò",
    desc: "Quản lý 1.2x, pha chế 1.0x, phục vụ 0.9x, thu ngân 0.85x.",
    icon: <Scale className="size-4" />,
  },
];

export function TipSplitForm({
  eligibleEmployees,
}: {
  eligibleEmployees: EligibleEmployee[];
}) {
  const [totalRaw, setTotalRaw] = useState<string>("");
  const [method, setMethod] = useState<DistMethod>("equal");
  const [rows, setRows] = useState<RowState[]>(() =>
    eligibleEmployees.map((e) => ({
      id: e.id,
      name: e.name,
      role: e.role,
      hours: e.weeklyHours,
    })),
  );

  const total = useMemo(() => parseAmount(totalRaw), [totalRaw]);

  const splitInputs: SplitInput[] = useMemo(
    () =>
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        role: r.role,
        hours: r.hours,
      })),
    [rows],
  );

  const results = useMemo(
    () => distributeTip(total, splitInputs, method),
    [total, splitInputs, method],
  );

  const sumOfShares = useMemo(
    () => results.reduce((acc, r) => acc + r.share, 0),
    [results],
  );

  const sumMatches = sumOfShares === total;

  function updateHours(id: number, raw: string): void {
    const next = parseHoursInput(raw);
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, hours: next } : r)),
    );
  }

  function downloadCsv(): void {
    const header = ["Tên", "Vai trò", "Số giờ", "Phần chia (VND)"];
    const lines: string[] = [header.map(csvEscape).join(",")];
    for (const r of results) {
      lines.push(
        [
          csvEscape(r.name),
          csvEscape(ROLE_LABELS[r.role] ?? r.role),
          csvEscape(r.hours.toString()),
          csvEscape(r.share.toString()),
        ].join(","),
      );
    }
    lines.push(
      [
        csvEscape("Tổng"),
        "",
        "",
        csvEscape(sumOfShares.toString()),
      ].join(","),
    );
    const csv = lines.join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date()
      .toISOString()
      .slice(0, 16)
      .replace(/[:T]/g, "-");
    a.href = url;
    a.download = `tip-split-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (eligibleEmployees.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chưa có nhân viên đang làm ca</CardTitle>
          <CardDescription>
            Cần ít nhất một nhân viên đã check-in (chưa check-out) để chia tip.
            Vào trang Chấm công để check-in cho nhân viên trước.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="size-5 text-primary" />
            Tổng tiền tip
          </CardTitle>
          <CardDescription>
            Nhập tổng số tiền tip cần chia cho {eligibleEmployees.length} nhân
            viên đang trong ca.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="tip-total">Số tiền tip (VND)</Label>
            <div className="relative">
              <Input
                id="tip-total"
                inputMode="numeric"
                autoComplete="off"
                placeholder="0"
                value={total === 0 && totalRaw === "" ? "" : VND_NF.format(total)}
                onChange={(e) => setTotalRaw(e.target.value)}
                className="pr-12 text-right text-base font-medium"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                ₫
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Phương thức chia</Label>
            <div className="grid gap-3 sm:grid-cols-3">
              {METHOD_OPTIONS.map((opt) => {
                const active = method === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setMethod(opt.key)}
                    aria-pressed={active}
                    className={`flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors ${
                      active
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted/20 hover:bg-accent"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span
                        className={
                          active ? "text-primary" : "text-muted-foreground"
                        }
                      >
                        {opt.icon}
                      </span>
                      {opt.label}
                    </div>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Nhân viên đang trong ca</CardTitle>
            <CardDescription>
              Có thể chỉnh số giờ làm thủ công nếu cần. Mặc định lấy tổng giờ
              tuần này (Thứ 2 đến nay).
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={downloadCsv}
            disabled={total === 0}
          >
            <Download className="size-4" />
            Xuất CSV
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nhân viên</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead className="w-32">Số giờ</TableHead>
                <TableHead className="w-40 text-right">Phần chia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r, i) => {
                const row = rows[i];
                const roleLabel = ROLE_LABELS[r.role] ?? r.role;
                const roleW = ROLE_WEIGHT[r.role] ?? 1.0;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {roleLabel}
                        {method === "role" && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ×{roleW}
                          </span>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step="0.25"
                        value={row ? row.hours : 0}
                        onChange={(e) => updateHours(r.id, e.target.value)}
                        className="h-8 w-24 text-right text-sm"
                      />
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatVND(r.share)}
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow>
                <TableCell colSpan={3} className="text-right font-medium">
                  Tổng đã chia
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={`font-bold ${
                      sumMatches ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {formatVND(sumOfShares)}
                  </span>
                  <div className="text-xs text-muted-foreground">
                    {sumMatches
                      ? "Khớp tổng tip"
                      : `Lệch ${formatVND(total - sumOfShares)}`}
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
