"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Coins, RotateCcw, Save } from "lucide-react";
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
import { Select } from "@/components/ui/select";
import {
  CURRENCY_LABEL,
  DEFAULT_RATES,
  RATES_EVENT,
  type CurrencyCode,
  type RateMap,
  getRates,
  resetRates,
  setRate,
} from "@/lib/currency-rates";

const CODES: readonly CurrencyCode[] = ["USD", "EUR", "JPY", "KRW", "THB"];
const VND = new Intl.NumberFormat("vi-VN");

function formatVnd(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return VND.format(Math.round(value));
}

function parseDigits(raw: string): number {
  const cleaned = raw.replace(/[^\d]/g, "");
  if (!cleaned) return 0;
  const n = Number.parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : 0;
}

function parseDecimal(raw: string): number {
  const cleaned = raw.replace(/[^\d.]/g, "");
  if (!cleaned) return 0;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function formatForeign(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function CurrencyConverter() {
  const [hydrated, setHydrated] = useState<boolean>(false);
  const [rates, setRates] = useState<RateMap>(DEFAULT_RATES);
  const [code, setCode] = useState<CurrencyCode>("USD");
  const [vndRaw, setVndRaw] = useState<string>("");
  const [foreignRaw, setForeignRaw] = useState<string>("");
  const [lastEdited, setLastEdited] = useState<"vnd" | "foreign">("vnd");
  const [editingRate, setEditingRate] = useState<boolean>(false);
  const [rateDraft, setRateDraft] = useState<string>("");

  // Hydrate from localStorage after mount
  useEffect(() => {
    setRates(getRates());
    setHydrated(true);
    const handler = () => setRates(getRates());
    window.addEventListener(RATES_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(RATES_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const rate = rates[code];

  // Re-derive the non-edited side whenever inputs / rate change
  const vnd = useMemo(() => parseDigits(vndRaw), [vndRaw]);
  const foreign = useMemo(() => parseDecimal(foreignRaw), [foreignRaw]);

  const computedForeign = useMemo(() => {
    if (lastEdited !== "vnd") return foreign;
    if (rate <= 0) return 0;
    return vnd / rate;
  }, [lastEdited, vnd, rate, foreign]);

  const computedVnd = useMemo(() => {
    if (lastEdited !== "foreign") return vnd;
    return foreign * rate;
  }, [lastEdited, foreign, rate, vnd]);

  const displayedVnd =
    lastEdited === "vnd"
      ? vnd === 0 && vndRaw === ""
        ? ""
        : formatVnd(vnd)
      : computedVnd === 0
        ? ""
        : formatVnd(computedVnd);

  const displayedForeign =
    lastEdited === "foreign"
      ? foreignRaw
      : formatForeign(computedForeign);

  function handleVndChange(raw: string) {
    setLastEdited("vnd");
    setVndRaw(raw);
  }

  function handleForeignChange(raw: string) {
    setLastEdited("foreign");
    setForeignRaw(raw);
  }

  function handleSwap() {
    if (lastEdited === "vnd") {
      setForeignRaw(formatForeign(computedForeign));
      setLastEdited("foreign");
    } else {
      setVndRaw(formatVnd(computedVnd));
      setLastEdited("vnd");
    }
  }

  function startEditRate() {
    setRateDraft(String(rate));
    setEditingRate(true);
  }

  function saveRate() {
    const next = Number.parseFloat(rateDraft.replace(/,/g, ""));
    if (Number.isFinite(next) && next > 0) {
      setRate(code, next);
    }
    setEditingRate(false);
  }

  function handleReset() {
    resetRates();
    setEditingRate(false);
  }

  function handleCodeChange(next: CurrencyCode) {
    setCode(next);
    setEditingRate(false);
    // Recompute the side currently shown based on the new rate
    if (lastEdited === "vnd") {
      // foreign side will recompute from vnd
    } else {
      // vnd side will recompute from foreign
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowLeftRight className="size-5 text-primary" />
          Đổi tiền tệ
        </CardTitle>
        <CardDescription>
          Quy đổi nhanh giữa VND và các ngoại tệ phổ biến. Tỷ giá được lưu trong
          trình duyệt — admin có thể chỉnh tay khi cần.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="cc-code">Ngoại tệ</Label>
          <Select
            id="cc-code"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value as CurrencyCode)}
          >
            {CODES.map((c) => (
              <option key={c} value={c}>
                {CURRENCY_LABEL[c]}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="cc-vnd">VND</Label>
            <Input
              id="cc-vnd"
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              value={displayedVnd}
              onChange={(e) => handleVndChange(e.target.value)}
              className="text-right text-base font-medium"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleSwap}
            className="self-center sm:mb-0.5"
            aria-label="Hoán đổi hướng quy đổi"
          >
            <ArrowLeftRight className="size-4" />
          </Button>
          <div className="space-y-2">
            <Label htmlFor="cc-foreign">{code}</Label>
            <Input
              id="cc-foreign"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={displayedForeign}
              onChange={(e) => handleForeignChange(e.target.value)}
              className="text-right text-base font-medium"
            />
          </div>
        </div>

        <div className="rounded-lg border bg-muted/20 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm">
              <Coins className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">Tỷ giá hiện tại:</span>
              <span className="font-semibold">
                1 {code} = {hydrated ? formatVnd(rate) : "—"} ₫
              </span>
            </div>
            {!editingRate ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={startEditRate}
                disabled={!hydrated}
              >
                Sửa tỷ giá
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  inputMode="decimal"
                  value={rateDraft}
                  onChange={(e) => setRateDraft(e.target.value)}
                  className="h-8 w-32 text-right"
                  autoFocus
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={saveRate}
                  className="gap-1"
                >
                  <Save className="size-3.5" />
                  Lưu
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingRate(false)}
                >
                  Huỷ
                </Button>
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={handleReset}
            disabled={!hydrated}
            className="mt-1 h-auto gap-1 px-0 text-xs text-muted-foreground"
          >
            <RotateCcw className="size-3" />
            Đặt lại tỷ giá mặc định
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
