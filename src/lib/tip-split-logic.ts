export type DistMethod = "equal" | "hours" | "role";

export type SplitInput = {
  id: number;
  name: string;
  role: string;
  hours: number;
};

export type SplitResult = {
  id: number;
  name: string;
  role: string;
  hours: number;
  share: number;
};

export const ROLE_WEIGHT: Record<string, number> = {
  manager: 1.2,
  barista: 1.0,
  server: 0.9,
  cashier: 0.85,
};

const DEFAULT_ROLE_WEIGHT = 1.0;
const ROUND_UNIT = 1000;

function getRoleWeight(role: string): number {
  return ROLE_WEIGHT[role] ?? DEFAULT_ROLE_WEIGHT;
}

function roundToUnit(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value / ROUND_UNIT) * ROUND_UNIT;
}

/**
 * Distribute a tip total (in VND) among employees by the chosen method.
 * Each share is rounded to the nearest 1,000 VND. Any remainder (the
 * difference between the rounded sum and the original total) is added
 * to the first employee so that the sum of shares exactly equals total.
 *
 * Falls back to equal split when the chosen weights all sum to 0.
 */
export function distributeTip(
  totalVnd: number,
  employees: SplitInput[],
  method: DistMethod,
): SplitResult[] {
  const total =
    Number.isFinite(totalVnd) && totalVnd > 0 ? Math.round(totalVnd) : 0;
  if (employees.length === 0 || total === 0) {
    return employees.map((e) => ({
      id: e.id,
      name: e.name,
      role: e.role,
      hours: e.hours,
      share: 0,
    }));
  }

  const weights: number[] = employees.map((e) => {
    if (method === "equal") return 1;
    if (method === "hours") {
      const h = Number.isFinite(e.hours) && e.hours > 0 ? e.hours : 0;
      return h;
    }
    return getRoleWeight(e.role);
  });

  let weightSum = weights.reduce((a, b) => a + b, 0);
  let effectiveWeights = weights;
  if (weightSum <= 0) {
    effectiveWeights = employees.map(() => 1);
    weightSum = effectiveWeights.length;
  }

  // Compute raw per-employee shares (no rounding).
  const rawShares: number[] = effectiveWeights.map(
    (w) => (total * w) / weightSum,
  );

  // Round each to the nearest 1,000 VND.
  const rounded: number[] = rawShares.map(roundToUnit);

  // Compute remainder and add to the first employee to keep the sum exact.
  const roundedSum = rounded.reduce((a, b) => a + b, 0);
  const remainder = total - roundedSum;
  if (rounded.length > 0) {
    rounded[0] = Math.max(0, rounded[0] + remainder);
  }

  return employees.map((e, i) => ({
    id: e.id,
    name: e.name,
    role: e.role,
    hours: e.hours,
    share: rounded[i] ?? 0,
  }));
}
