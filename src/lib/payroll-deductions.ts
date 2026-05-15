export type DeductionConfig = {
  bhxhEnabled: boolean;
  bhxhPct: number;
  bhytEnabled: boolean;
  bhytPct: number;
  bhtnEnabled: boolean;
  bhtnPct: number;
};

export const DEFAULT_DEDUCTION_CONFIG: DeductionConfig = {
  bhxhEnabled: false,
  bhxhPct: 10.5,
  bhytEnabled: false,
  bhytPct: 1.5,
  bhtnEnabled: false,
  bhtnPct: 1,
};

export const VIETNAM_STANDARD_RATES = {
  bhxhPct: 10.5,
  bhytPct: 1.5,
  bhtnPct: 1,
} as const;

export const STORAGE_KEY = "cafe-hr-payroll-deductions";

function isDeductionConfig(v: unknown): v is DeductionConfig {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.bhxhEnabled === "boolean" &&
    typeof o.bhxhPct === "number" &&
    typeof o.bhytEnabled === "boolean" &&
    typeof o.bhytPct === "number" &&
    typeof o.bhtnEnabled === "boolean" &&
    typeof o.bhtnPct === "number"
  );
}

export function loadDeductionConfig(): DeductionConfig {
  if (typeof window === "undefined") return { ...DEFAULT_DEDUCTION_CONFIG };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_DEDUCTION_CONFIG };
    const parsed: unknown = JSON.parse(raw);
    if (isDeductionConfig(parsed)) return parsed;
    return { ...DEFAULT_DEDUCTION_CONFIG };
  } catch {
    return { ...DEFAULT_DEDUCTION_CONFIG };
  }
}

export function saveDeductionConfig(cfg: DeductionConfig): void {
  if (typeof window === "undefined") return;
  try {
    const serialized = JSON.stringify(cfg);
    window.localStorage.setItem(STORAGE_KEY, serialized);
    // Synthetic StorageEvent so other tabs/components in the same window react.
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_KEY,
        newValue: serialized,
      }),
    );
  } catch {
    // Ignore quota / serialization errors.
  }
}

export type ComputedDeductions = {
  bhxh: number;
  bhyt: number;
  bhtn: number;
  totalDeductions: number;
  net: number;
};

export function computeDeductions(
  grossPay: number,
  cfg: DeductionConfig,
): ComputedDeductions {
  const bhxh = cfg.bhxhEnabled ? Math.round((grossPay * cfg.bhxhPct) / 100) : 0;
  const bhyt = cfg.bhytEnabled ? Math.round((grossPay * cfg.bhytPct) / 100) : 0;
  const bhtn = cfg.bhtnEnabled ? Math.round((grossPay * cfg.bhtnPct) / 100) : 0;
  const totalDeductions = bhxh + bhyt + bhtn;
  const net = Math.round(grossPay) - totalDeductions;
  return { bhxh, bhyt, bhtn, totalDeductions, net };
}

export function countEnabled(cfg: DeductionConfig): number {
  let n = 0;
  if (cfg.bhxhEnabled) n += 1;
  if (cfg.bhytEnabled) n += 1;
  if (cfg.bhtnEnabled) n += 1;
  return n;
}
