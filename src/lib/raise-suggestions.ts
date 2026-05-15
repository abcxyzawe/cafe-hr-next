import "server-only";
import { prisma } from "./prisma";
import { getTopPerformersThisMonth } from "./leaderboard";

export type RaiseSuggestion = {
  employeeId: number;
  name: string;
  avatarUrl: string | null;
  role: string;
  hourlyRate: number;
  medianRate: number;
  reliabilityPct: number | null;
  hoursThisMonth: number;
  reasons: string[];
};

/**
 * Detects top-performing employees whose hourly rate is below the team median
 * and suggests them as candidates for a raise.
 *
 * Requires at least 5 employees on payroll to compute a meaningful median.
 * Returns up to 3 suggestions, ranked by their leaderboard position.
 */
export async function getRaiseSuggestions(): Promise<RaiseSuggestion[]> {
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      name: true,
      role: true,
      hourlyRate: true,
      avatarUrl: true,
    },
  });

  // Need a healthy team to compare against — skip otherwise.
  if (employees.length < 5) return [];

  const sortedRates = employees
    .map((e) => Number(e.hourlyRate))
    .sort((a, b) => a - b);
  const medianRate = computeMedian(sortedRates);

  const topPerformers = await getTopPerformersThisMonth(5);
  if (topPerformers.length === 0) return [];

  const empById = new Map(employees.map((e) => [e.id, e]));
  const suggestions: RaiseSuggestion[] = [];

  for (let i = 0; i < topPerformers.length; i++) {
    const perf = topPerformers[i];
    const emp = empById.get(perf.employeeId);
    if (!emp) continue;

    const hourlyRate = Number(emp.hourlyRate);
    if (hourlyRate >= medianRate) continue; // Strictly below median.

    const reasons: string[] = [];
    const rank = i + 1;
    reasons.push(`Top ${rank}/5 theo giờ làm tháng này`);

    if (perf.reliabilityPct !== null && perf.reliabilityPct >= 90) {
      reasons.push(`Độ tin cậy ${perf.reliabilityPct}% (xuất sắc)`);
    }

    const threshold = medianRate * 0.8;
    if (hourlyRate < threshold) {
      const gapPct = Math.round(((medianRate - hourlyRate) / medianRate) * 100);
      reasons.push(`Lương thấp hơn trung vị ${gapPct}%`);
    }

    suggestions.push({
      employeeId: emp.id,
      name: emp.name,
      avatarUrl: emp.avatarUrl,
      role: emp.role as string,
      hourlyRate,
      medianRate,
      reliabilityPct: perf.reliabilityPct,
      hoursThisMonth: perf.hours,
      reasons,
    });

    if (suggestions.length >= 3) break;
  }

  return suggestions;
}

function computeMedian(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  const raw =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return Math.round(raw);
}
