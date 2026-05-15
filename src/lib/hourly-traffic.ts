import "server-only";
import { prisma } from "./prisma";

export type HourlyTrafficCell = {
  /** 0-23 hour-of-day */
  hour: number;
  /** Average check-ins per day at this hour over the lookback window */
  avg: number;
  /** Total check-ins at this hour across the lookback window */
  total: number;
  /** Whether this hour is currently the busiest */
  isPeak: boolean;
};

export type HourlyTrafficSummary = {
  cells: HourlyTrafficCell[];
  /** Number of distinct days observed (1..lookbackDays) */
  daysObserved: number;
  /** Hour with the highest average traffic */
  peakHour: number;
  /** The peak average value */
  peakAvg: number;
};

export async function getHourlyTraffic(
  lookbackDays = 7,
): Promise<HourlyTrafficSummary> {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - lookbackDays);
  start.setHours(0, 0, 0, 0);

  const checkIns = await prisma.attendance.findMany({
    where: { checkIn: { gte: start } },
    select: { checkIn: true },
  });

  // 24-bucket counters
  const totals = new Array<number>(24).fill(0);
  const dayKeys = new Set<string>();
  for (const a of checkIns) {
    const d = new Date(a.checkIn);
    const h = d.getHours();
    totals[h] = (totals[h] ?? 0) + 1;
    dayKeys.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  }

  const daysObserved = Math.max(1, dayKeys.size);
  let peakHour = 0;
  let peakTotal = 0;
  for (let h = 0; h < 24; h++) {
    if (totals[h] > peakTotal) {
      peakTotal = totals[h];
      peakHour = h;
    }
  }
  const peakAvg = peakTotal / daysObserved;

  const cells: HourlyTrafficCell[] = totals.map((total, hour) => ({
    hour,
    total,
    avg: total / daysObserved,
    isPeak: hour === peakHour && peakTotal > 0,
  }));

  return { cells, daysObserved, peakHour, peakAvg };
}
