// Pure client utility — no localStorage / no DOM access.
// Linear-regression forecasting for daily revenue.

export type DataPoint = { date: string; amount: number };

export type ForecastPoint = {
  date: string;
  actual: number | null;
  projected: number | null;
  upperBand: number | null;
  lowerBand: number | null;
};

export type ForecastResult = {
  points: ForecastPoint[];
  slope: number;
  intercept: number;
  rSquared: number;
  stdDev: number;
  windowSize: number;
};

const Z_95 = 1.96;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map((part) => Number(part));
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function dayDiff(a: Date, b: Date): number {
  const ms = a.getTime() - b.getTime();
  return Math.round(ms / 86_400_000);
}

export function linearRegression(points: DataPoint[]): {
  slope: number;
  intercept: number;
  rSquared: number;
  stdDev: number;
} {
  const n = points.length;
  if (n < 2) {
    return { slope: 0, intercept: n === 1 ? points[0].amount : 0, rSquared: 0, stdDev: 0 };
  }
  const earliest = parseIso(points[0].date);
  const xs: number[] = [];
  const ys: number[] = [];
  for (const p of points) {
    xs.push(dayDiff(parseIso(p.date), earliest));
    ys.push(p.amount);
  }
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    num += dx * (ys[i] - meanY);
    den += dx * dx;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;

  // R^2 + residual standard deviation
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const yHat = intercept + slope * xs[i];
    const res = ys[i] - yHat;
    ssRes += res * res;
    const dy = ys[i] - meanY;
    ssTot += dy * dy;
  }
  const rSquared = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);
  // Sample stddev of residuals (use n-2 dof if possible)
  const dof = n > 2 ? n - 2 : n;
  const stdDev = Math.sqrt(ssRes / dof);

  return { slope, intercept, rSquared, stdDev };
}

export function buildForecast(
  history: DataPoint[],
  windowDays: number,
  projectionDays: number = 30,
): ForecastResult {
  // Filter non-zero entries, sort by date
  const cleaned = history
    .filter((h) => Number.isFinite(h.amount) && h.amount > 0)
    .map((h) => ({ date: h.date, amount: Math.round(h.amount) }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  if (cleaned.length < 3) {
    return {
      points: [],
      slope: 0,
      intercept: 0,
      rSquared: 0,
      stdDev: 0,
      windowSize: 0,
    };
  }

  // Take only the last windowDays of data for fitting the regression
  const window = cleaned.slice(-windowDays);
  const { slope, intercept, rSquared, stdDev } = linearRegression(window);

  const earliest = parseIso(window[0].date);
  const lastHistorical = parseIso(window[window.length - 1].date);
  const lastIndex = dayDiff(lastHistorical, earliest);

  const points: ForecastPoint[] = [];

  // Historical points (actual filled)
  const windowMap = new Map<string, number>();
  for (const p of window) windowMap.set(p.date, p.amount);
  // Walk every day from earliest -> lastHistorical so the chart line is continuous
  for (let i = 0; i <= lastIndex; i++) {
    const d = new Date(earliest);
    d.setDate(earliest.getDate() + i);
    const iso = toIso(d);
    const actual = windowMap.get(iso) ?? null;
    points.push({
      date: iso,
      actual,
      projected: null,
      upperBand: null,
      lowerBand: null,
    });
  }

  // Bridge point: anchor projection at the last actual so the chart connects.
  const lastActual = window[window.length - 1].amount;
  const lastIso = toIso(lastHistorical);
  const lastIdx = points.findIndex((p) => p.date === lastIso);
  if (lastIdx >= 0) {
    points[lastIdx] = {
      ...points[lastIdx],
      projected: lastActual,
      upperBand: lastActual,
      lowerBand: lastActual,
    };
  }

  // Future projection points
  for (let i = 1; i <= projectionDays; i++) {
    const d = new Date(lastHistorical);
    d.setDate(lastHistorical.getDate() + i);
    const iso = toIso(d);
    const x = lastIndex + i;
    const yHat = intercept + slope * x;
    const projected = Math.max(0, Math.round(yHat));
    const margin = Z_95 * stdDev;
    points.push({
      date: iso,
      actual: null,
      projected,
      upperBand: Math.max(0, Math.round(yHat + margin)),
      lowerBand: Math.max(0, Math.round(yHat - margin)),
    });
  }

  return {
    points,
    slope,
    intercept,
    rSquared,
    stdDev,
    windowSize: window.length,
  };
}
