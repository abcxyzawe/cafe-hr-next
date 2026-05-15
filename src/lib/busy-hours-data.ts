import "server-only";
import { prisma } from "./prisma";

/** Single heatmap cell. dow: 0=Mon..6=Sun, hour: 0..23 */
export type HourCell = { dow: number; hour: number; count: number };

export type BusyHoursData = {
  /** 168 entries (7 days × 24 hours), ordered by dow then hour */
  cells: HourCell[];
  totalCheckins: number;
  peakDow: number;
  peakHour: number;
  peakCount: number;
  avgPerCell: number;
  windowDays: number;
};

const DEFAULT_WINDOW = 90;
const MIN_WINDOW = 7;
const MAX_WINDOW = 365;

function clampWindow(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_WINDOW;
  const n = Math.floor(value);
  if (n < MIN_WINDOW) return MIN_WINDOW;
  if (n > MAX_WINDOW) return MAX_WINDOW;
  return n;
}

export async function getBusyHours(
  windowDays?: number,
): Promise<BusyHoursData> {
  const window = clampWindow(windowDays);

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - window);

  const checkIns = await prisma.attendance.findMany({
    where: { checkIn: { gte: start } },
    select: { checkIn: true },
  });

  // Pre-seed 7 × 24 = 168 cells with count = 0.
  const cells: HourCell[] = [];
  for (let dow = 0; dow < 7; dow++) {
    for (let hour = 0; hour < 24; hour++) {
      cells.push({ dow, hour, count: 0 });
    }
  }

  const indexFor = (dow: number, hour: number): number => dow * 24 + hour;

  let totalCheckins = 0;
  for (const a of checkIns) {
    const d = new Date(a.checkIn);
    const dow = (d.getDay() + 6) % 7; // Mon=0..Sun=6
    const hour = d.getHours();
    const idx = indexFor(dow, hour);
    const cell = cells[idx];
    if (cell) {
      cell.count += 1;
      totalCheckins += 1;
    }
  }

  let peakDow = 0;
  let peakHour = 0;
  let peakCount = 0;
  for (const c of cells) {
    if (c.count > peakCount) {
      peakCount = c.count;
      peakDow = c.dow;
      peakHour = c.hour;
    }
  }

  const avgPerCell = totalCheckins / cells.length;

  return {
    cells,
    totalCheckins,
    peakDow,
    peakHour,
    peakCount,
    avgPerCell,
    windowDays: window,
  };
}
