"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RoiChart } from "@/components/roi-chart";
import { projectRoi, type RoiInputs, type RoiResult } from "@/lib/roi-logic";
import { formatVND } from "@/lib/utils";

const LIMITS = {
  investment: { min: 5_000_000, max: 2_000_000_000, step: 1_000_000 },
  fixed: { min: 1_000_000, max: 200_000_000, step: 500_000 },
  revenue: { min: 1_000_000, max: 500_000_000, step: 1_000_000 },
  margin: { min: 10, max: 90, step: 1 },
  growth: { min: -20, max: 20, step: 0.5 },
} as const;

const DEFAULTS: RoiInputs = {
  investmentVnd: 300_000_000,
  monthlyFixedVnd: 40_000_000,
  monthlyRevenueVnd: 80_000_000,
  marginPct: 60,
  growthRatePct: 2,
};

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function parseNum(s: string, fallback: number): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}

function buildMarkdown(inputs: RoiInputs, result: RoiResult): string {
  const lines: string[] = [];
  lines.push(`# Phân tích ROI & điểm hòa vốn`);
  lines.push("");
  lines.push(`## Đầu vào`);
  lines.push(`- Vốn đầu tư: **${formatVND(inputs.investmentVnd)}**`);
  lines.push(`- Chi phí cố định / tháng: **${formatVND(inputs.monthlyFixedVnd)}**`);
  lines.push(`- Doanh thu tháng (cơ sở): **${formatVND(inputs.monthlyRevenueVnd)}**`);
  lines.push(`- Biên lợi nhuận gộp: **${inputs.marginPct}%**`);
  lines.push(`- Tăng trưởng / tháng: **${inputs.growthRatePct}%**`);
  lines.push("");
  lines.push(`## Kết quả`);
  lines.push(
    `- Điểm hòa vốn: **${result.breakevenMonth ? `Tháng ${result.breakevenMonth}` : "Không hòa vốn trong 24 tháng"}**`,
  );
  lines.push(`- Lợi nhuận lũy kế tháng 6: **${formatVND(result.net6)}**`);
  lines.push(`- Lợi nhuận lũy kế tháng 12: **${formatVND(result.net12)}**`);
  lines.push(`- Lợi nhuận lũy kế tháng 24: **${formatVND(result.net24)}**`);
  lines.push("");
  lines.push(`## Bảng dòng tiền (24 tháng)`);
  lines.push(`| Tháng | Doanh thu | LN gộp | CP cố định | LN ròng | Lũy kế |`);
  lines.push(`| ---: | ---: | ---: | ---: | ---: | ---: |`);
  for (const m of result.monthly) {
    lines.push(
      `| ${m.month} | ${formatVND(m.revenue)} | ${formatVND(m.grossProfit)} | ${formatVND(m.fixedCosts)} | ${formatVND(m.netProfit)} | ${formatVND(m.cumulativeNet)} |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

type FieldKey =
  | "investmentVnd"
  | "monthlyFixedVnd"
  | "monthlyRevenueVnd"
  | "marginPct"
  | "growthRatePct";

export function RoiCalculator() {
  const [raw, setRaw] = useState<Record<FieldKey, string>>({
    investmentVnd: String(DEFAULTS.investmentVnd),
    monthlyFixedVnd: String(DEFAULTS.monthlyFixedVnd),
    monthlyRevenueVnd: String(DEFAULTS.monthlyRevenueVnd),
    marginPct: String(DEFAULTS.marginPct),
    growthRatePct: String(DEFAULTS.growthRatePct),
  });

  const inputs = useMemo<RoiInputs>(() => {
    return {
      investmentVnd: clamp(
        parseNum(raw.investmentVnd, DEFAULTS.investmentVnd),
        LIMITS.investment.min,
        LIMITS.investment.max,
      ),
      monthlyFixedVnd: clamp(
        parseNum(raw.monthlyFixedVnd, DEFAULTS.monthlyFixedVnd),
        LIMITS.fixed.min,
        LIMITS.fixed.max,
      ),
      monthlyRevenueVnd: clamp(
        parseNum(raw.monthlyRevenueVnd, DEFAULTS.monthlyRevenueVnd),
        LIMITS.revenue.min,
        LIMITS.revenue.max,
      ),
      marginPct: clamp(
        parseNum(raw.marginPct, DEFAULTS.marginPct),
        LIMITS.margin.min,
        LIMITS.margin.max,
      ),
      growthRatePct: clamp(
        parseNum(raw.growthRatePct, DEFAULTS.growthRatePct),
        LIMITS.growth.min,
        LIMITS.growth.max,
      ),
    };
  }, [raw]);

  const result = useMemo(() => projectRoi(inputs, 24), [inputs]);

  const sensitivity = useMemo(() => {
    const variants: { label: string; factor: number }[] = [
      { label: "-10%", factor: 0.9 },
      { label: "Cơ sở", factor: 1 },
      { label: "+10%", factor: 1.1 },
    ];
    return variants.map((v) => {
      const r = projectRoi(
        { ...inputs, monthlyRevenueVnd: inputs.monthlyRevenueVnd * v.factor },
        24,
      );
      return {
        label: v.label,
        factor: v.factor,
        revenue: inputs.monthlyRevenueVnd * v.factor,
        breakevenMonth: r.breakevenMonth,
        net24: r.net24,
      };
    });
  }, [inputs]);

  function update(key: FieldKey, value: string) {
    setRaw((prev) => ({ ...prev, [key]: value }));
  }

  function handleExport() {
    try {
      const md = buildMarkdown(inputs, result);
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `roi-analysis-${stamp}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Đã tải xuống file Markdown.");
    } catch {
      toast.error("Không xuất được file Markdown.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="investmentVnd">Vốn đầu tư ban đầu (VND)</Label>
          <Input
            id="investmentVnd"
            type="number"
            inputMode="numeric"
            min={LIMITS.investment.min}
            max={LIMITS.investment.max}
            step={LIMITS.investment.step}
            value={raw.investmentVnd}
            onChange={(e) => update("investmentVnd", e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {formatVND(inputs.investmentVnd)}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="monthlyFixedVnd">Chi phí cố định / tháng (VND)</Label>
          <Input
            id="monthlyFixedVnd"
            type="number"
            inputMode="numeric"
            min={LIMITS.fixed.min}
            max={LIMITS.fixed.max}
            step={LIMITS.fixed.step}
            value={raw.monthlyFixedVnd}
            onChange={(e) => update("monthlyFixedVnd", e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {formatVND(inputs.monthlyFixedVnd)}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="monthlyRevenueVnd">Doanh thu trung bình / tháng (VND)</Label>
          <Input
            id="monthlyRevenueVnd"
            type="number"
            inputMode="numeric"
            min={LIMITS.revenue.min}
            max={LIMITS.revenue.max}
            step={LIMITS.revenue.step}
            value={raw.monthlyRevenueVnd}
            onChange={(e) => update("monthlyRevenueVnd", e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {formatVND(inputs.monthlyRevenueVnd)}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="marginPct">Biên lợi nhuận gộp (%)</Label>
          <Input
            id="marginPct"
            type="number"
            inputMode="decimal"
            min={LIMITS.margin.min}
            max={LIMITS.margin.max}
            step={LIMITS.margin.step}
            value={raw.marginPct}
            onChange={(e) => update("marginPct", e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">
            {LIMITS.margin.min}% – {LIMITS.margin.max}%
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="growthRatePct">Tăng trưởng / tháng (%)</Label>
          <Input
            id="growthRatePct"
            type="number"
            inputMode="decimal"
            min={LIMITS.growth.min}
            max={LIMITS.growth.max}
            step={LIMITS.growth.step}
            value={raw.growthRatePct}
            onChange={(e) => update("growthRatePct", e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">
            {LIMITS.growth.min}% – +{LIMITS.growth.max}% (mặc định 0)
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Điểm hòa vốn"
          value={
            result.breakevenMonth
              ? `Tháng ${result.breakevenMonth}`
              : "> 24 tháng"
          }
          tone={result.breakevenMonth ? "primary" : "warn"}
        />
        <StatTile
          label="Lũy kế tháng 6"
          value={formatVND(result.net6)}
          tone={result.net6 >= 0 ? "primary" : "warn"}
        />
        <StatTile
          label="Lũy kế tháng 12"
          value={formatVND(result.net12)}
          tone={result.net12 >= 0 ? "primary" : "warn"}
        />
        <StatTile
          label="Lũy kế tháng 24"
          value={formatVND(result.net24)}
          tone={result.net24 >= 0 ? "primary" : "warn"}
        />
      </div>

      <section className="rounded-lg border bg-card/60 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Dòng tiền lũy kế (24 tháng)</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download className="size-4" />
            Xuất Markdown
          </Button>
        </div>
        <RoiChart monthly={result.monthly} />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Đường xanh = lũy kế ròng (sau hoàn vốn) · Đường xám đứt = doanh thu
          tháng. Tham chiếu y = 0 đánh dấu thời điểm hòa vốn.
        </p>
      </section>

      <section className="rounded-lg border bg-card/60">
        <div className="border-b px-4 py-2 text-sm font-semibold">
          Phân tích độ nhạy doanh thu (±10%)
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kịch bản</TableHead>
              <TableHead className="text-right">Doanh thu / tháng</TableHead>
              <TableHead className="text-right">Điểm hòa vốn</TableHead>
              <TableHead className="text-right">Lũy kế tháng 24</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sensitivity.map((s) => (
              <TableRow key={s.label}>
                <TableCell className="font-medium">{s.label}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatVND(Math.round(s.revenue))}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {s.breakevenMonth
                    ? `Tháng ${s.breakevenMonth}`
                    : "> 24 tháng"}
                </TableCell>
                <TableCell
                  className={
                    "text-right tabular-nums " +
                    (s.net24 >= 0 ? "text-emerald-600" : "text-rose-600")
                  }
                >
                  {formatVND(s.net24)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "primary" | "warn";
}) {
  return (
    <div
      className={
        "rounded-lg border p-3 shadow-sm " +
        (tone === "primary"
          ? "border-primary/30 bg-primary/5"
          : "border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/20")
      }
    >
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
