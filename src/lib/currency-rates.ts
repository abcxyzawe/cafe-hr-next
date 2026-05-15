export const STORAGE_KEY = "cafe-hr-currency-rates";
export const RATES_EVENT = "cafe-hr:rates-changed";

export type CurrencyCode = "USD" | "EUR" | "JPY" | "KRW" | "THB";
export type RateMap = Record<CurrencyCode, number>;

export const DEFAULT_RATES: RateMap = {
  USD: 25500,
  EUR: 27800,
  JPY: 170,
  KRW: 19,
  THB: 720,
};

export const CURRENCY_LABEL: Record<CurrencyCode, string> = {
  USD: "Đô la Mỹ (USD)",
  EUR: "Euro (EUR)",
  JPY: "Yên Nhật (JPY)",
  KRW: "Won Hàn (KRW)",
  THB: "Baht Thái (THB)",
};

const CODES: readonly CurrencyCode[] = ["USD", "EUR", "JPY", "KRW", "THB"];

function isCurrencyCode(value: string): value is CurrencyCode {
  return (CODES as readonly string[]).includes(value);
}

function isRateMap(value: unknown): value is Partial<RateMap> {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (!isCurrencyCode(key)) return false;
    const v = obj[key];
    if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) return false;
  }
  return true;
}

export function getRates(): RateMap {
  if (typeof window === "undefined") return { ...DEFAULT_RATES };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_RATES };
    const parsed: unknown = JSON.parse(raw);
    if (!isRateMap(parsed)) return { ...DEFAULT_RATES };
    return { ...DEFAULT_RATES, ...parsed };
  } catch {
    return { ...DEFAULT_RATES };
  }
}

function persist(rates: RateMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rates));
    window.dispatchEvent(new CustomEvent(RATES_EVENT));
  } catch {
    // ignore quota / serialization issues
  }
}

export function setRate(code: CurrencyCode, vnd: number): void {
  if (!Number.isFinite(vnd) || vnd <= 0) return;
  const next: RateMap = { ...getRates(), [code]: vnd };
  persist(next);
}

export function resetRates(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(RATES_EVENT));
  } catch {
    // ignore
  }
}
