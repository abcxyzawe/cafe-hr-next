"use client";

import { useMemo, useState } from "react";
import { Coins, Minus, Plus, Receipt, Users } from "lucide-react";
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

const PRESET_TIPS: readonly number[] = [5, 10, 15, 20];
const VND = new Intl.NumberFormat("vi-VN");

function formatVnd(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return VND.format(Math.round(value));
}

function parseAmountInput(raw: string): number {
  const cleaned = raw.replace(/[^\d]/g, "");
  if (!cleaned) return 0;
  const n = Number.parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : 0;
}

function roundUpTo1k(value: number): number {
  return Math.ceil(value / 1000) * 1000;
}

export function TipCalculator() {
  const [billRaw, setBillRaw] = useState<string>("");
  const [tipPct, setTipPct] = useState<number>(10);
  const [party, setParty] = useState<number>(1);
  const [roundUp, setRoundUp] = useState<boolean>(true);

  const bill = useMemo(() => parseAmountInput(billRaw), [billRaw]);

  const { tip, total, perPerson } = useMemo(() => {
    const rawTip = (bill * tipPct) / 100;
    const tipValue = roundUp ? roundUpTo1k(rawTip) : rawTip;
    const totalValue = bill + tipValue;
    const perValue =
      party > 0 ? (roundUp ? roundUpTo1k(totalValue / party) : totalValue / party) : 0;
    return { tip: tipValue, total: totalValue, perPerson: perValue };
  }, [bill, tipPct, party, roundUp]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="size-5 text-primary" />
          Tính tiền tip
        </CardTitle>
        <CardDescription>
          Tính nhanh tiền tip, tổng bill và chia đều theo đầu người.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="tip-bill">Số tiền bill (VND)</Label>
          <div className="relative">
            <Input
              id="tip-bill"
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              value={bill === 0 && billRaw === "" ? "" : formatVnd(bill)}
              onChange={(e) => setBillRaw(e.target.value)}
              className="pr-12 text-right text-base font-medium"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              ₫
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="tip-pct">Tỷ lệ tip</Label>
            <span className="text-sm font-semibold text-primary">{tipPct}%</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESET_TIPS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setTipPct(p)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  tipPct === p
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {p}%
              </button>
            ))}
          </div>
          <input
            id="tip-pct"
            type="range"
            min={0}
            max={30}
            step={1}
            value={tipPct}
            onChange={(e) => setTipPct(Number.parseInt(e.target.value, 10))}
            className="w-full accent-primary"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Số người</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setParty((p) => Math.max(1, p - 1))}
                aria-label="Bớt một người"
              >
                <Minus className="size-4" />
              </Button>
              <div className="flex h-9 flex-1 items-center justify-center rounded-md border bg-muted/30 text-sm font-semibold">
                <Users className="mr-2 size-4 text-muted-foreground" />
                {party}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setParty((p) => Math.min(12, p + 1))}
                aria-label="Thêm một người"
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tip-round">Làm tròn lên (1k)</Label>
            <button
              id="tip-round"
              type="button"
              onClick={() => setRoundUp((v) => !v)}
              className={`flex h-9 w-full items-center justify-between rounded-md border px-3 text-sm transition-colors ${
                roundUp
                  ? "border-primary bg-primary/10 text-primary"
                  : "bg-muted/30 text-muted-foreground"
              }`}
              aria-pressed={roundUp}
            >
              <span>{roundUp ? "Đang bật" : "Đang tắt"}</span>
              <span
                className={`inline-flex h-5 w-9 items-center rounded-full px-0.5 transition-colors ${
                  roundUp ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`size-4 rounded-full bg-background shadow transition-transform ${
                    roundUp ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </span>
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile
            icon={<Coins className="size-4" />}
            label="Tip"
            value={formatVnd(tip)}
          />
          <StatTile
            icon={<Receipt className="size-4" />}
            label="Tổng bill"
            value={formatVnd(total)}
            highlight
          />
          <StatTile
            icon={<Users className="size-4" />}
            label="Mỗi người"
            value={formatVnd(perPerson)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function StatTile({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        highlight
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-muted/20"
      }`}
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={`mt-1 truncate text-lg font-semibold ${
          highlight ? "text-primary" : "text-foreground"
        }`}
        title={value}
      >
        {value} ₫
      </div>
    </div>
  );
}
