"use client";

import { useEffect, useRef, useState } from "react";
import { Calculator, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatVND } from "@/lib/utils";
import {
  DEFAULT_DEDUCTION_CONFIG,
  STORAGE_KEY,
  VIETNAM_STANDARD_RATES,
  computeDeductions,
  loadDeductionConfig,
  saveDeductionConfig,
  type DeductionConfig,
} from "@/lib/payroll-deductions";

const PREVIEW_GROSS = 10_000_000;

type DeductionKey = "bhxh" | "bhyt" | "bhtn";

const ROWS: Array<{
  key: DeductionKey;
  label: string;
  hint: string;
  enabledKey: keyof DeductionConfig;
  pctKey: keyof DeductionConfig;
}> = [
  {
    key: "bhxh",
    label: "BHXH (Bảo hiểm xã hội)",
    hint: "Mặc định 10.5%",
    enabledKey: "bhxhEnabled",
    pctKey: "bhxhPct",
  },
  {
    key: "bhyt",
    label: "BHYT (Bảo hiểm y tế)",
    hint: "Mặc định 1.5%",
    enabledKey: "bhytEnabled",
    pctKey: "bhytPct",
  },
  {
    key: "bhtn",
    label: "BHTN (Bảo hiểm thất nghiệp)",
    hint: "Mặc định 1%",
    enabledKey: "bhtnEnabled",
    pctKey: "bhtnPct",
  },
];

function Switch({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors",
        checked
          ? "border-primary bg-primary"
          : "border-input bg-muted",
      )}
    >
      <span
        className={cn(
          "inline-block size-4 transform rounded-full bg-background shadow transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

export function DeductionsConfigButton({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [cfg, setCfg] = useState<DeductionConfig>(DEFAULT_DEDUCTION_CONFIG);
  const [loaded, setLoaded] = useState(false);
  // Track the last value we ourselves persisted so the storage listener can
  // skip echoes from saveDeductionConfig() and avoid an infinite render loop.
  const lastPersistedRef = useRef<string | null>(null);

  useEffect(() => {
    const initial = loadDeductionConfig();
    setCfg(initial);
    lastPersistedRef.current = JSON.stringify(initial);
    setLoaded(true);
  }, []);

  // Persist on every change (after initial hydration). Skip when the value is
  // identical to what we last persisted, to dodge useless re-saves.
  useEffect(() => {
    if (!loaded) return;
    const next = JSON.stringify(cfg);
    if (next === lastPersistedRef.current) return;
    lastPersistedRef.current = next;
    saveDeductionConfig(cfg);
  }, [cfg, loaded]);

  // React to changes from other tabs / components — but ignore the synthetic
  // event that our own save dispatched (newValue matches lastPersistedRef).
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      if (e.newValue !== null && e.newValue === lastPersistedRef.current) {
        return;
      }
      const next = loadDeductionConfig();
      lastPersistedRef.current = JSON.stringify(next);
      setCfg(next);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!isAdmin) return null;

  function update<K extends keyof DeductionConfig>(key: K, value: DeductionConfig[K]) {
    setCfg((prev) => ({ ...prev, [key]: value }));
  }

  function resetToVietnamDefaults() {
    setCfg({
      bhxhEnabled: true,
      bhxhPct: VIETNAM_STANDARD_RATES.bhxhPct,
      bhytEnabled: true,
      bhytPct: VIETNAM_STANDARD_RATES.bhytPct,
      bhtnEnabled: true,
      bhtnPct: VIETNAM_STANDARD_RATES.bhtnPct,
    });
  }

  const preview = computeDeductions(PREVIEW_GROSS, cfg);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        title="Cấu hình khấu trừ bảo hiểm"
      >
        <Calculator className="size-4" />
        Khấu trừ
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle>Khấu trừ bảo hiểm</DialogTitle>
            <DialogDescription>
              Cấu hình các khoản khấu trừ áp dụng lên bảng lương. Chỉ lưu trên
              trình duyệt của bạn.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {ROWS.map((row) => {
              const enabled = cfg[row.enabledKey] as boolean;
              const pct = cfg[row.pctKey] as number;
              return (
                <div
                  key={row.key}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                    enabled ? "border-rose-300/60 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/20" : "bg-card",
                  )}
                >
                  <Switch
                    checked={enabled}
                    onChange={(next) => update(row.enabledKey, next as DeductionConfig[typeof row.enabledKey])}
                    ariaLabel={`Bật/tắt ${row.label}`}
                  />
                  <div className="flex-1 min-w-0">
                    <Label className="block text-sm font-medium">{row.label}</Label>
                    <p className="text-xs text-muted-foreground">{row.hint}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={Number.isFinite(pct) ? pct : 0}
                      disabled={!enabled}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        update(
                          row.pctKey,
                          (Number.isFinite(n) ? n : 0) as DeductionConfig[typeof row.pctKey],
                        );
                      }}
                      className="h-8 w-20 text-right"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-lg border bg-muted/40 p-3 text-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Xem trước
            </p>
            <p className="mt-1">
              Lương <span className="font-medium">{formatVND(PREVIEW_GROSS)}</span>{" "}
              → trừ{" "}
              <span className="font-medium text-rose-600 dark:text-rose-400">
                {formatVND(preview.totalDeductions)}
              </span>{" "}
              → còn{" "}
              <span className="font-semibold text-primary">
                {formatVND(preview.net)}
              </span>
            </p>
          </div>

          <div className="mt-5 flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={resetToVietnamDefaults}>
              <RotateCcw className="size-4" />
              Mặc định Việt Nam
            </Button>
            <Button size="sm" onClick={() => setOpen(false)}>
              Xong
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
