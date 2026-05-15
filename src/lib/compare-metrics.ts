export type EmployeeMetrics = {
  employeeId: number;
  name: string;
  monthHours: number;
  reliabilityPct: number;
  daysWorked: number;
  kudosCount: number;
  lateCount: number;
};

export type RadarPoint = {
  axis: string;
  // dynamic per-employee normalized values 0-100
  [employeeName: string]: number | string;
};

const AXES: ReadonlyArray<{
  axis: string;
  pick: (m: EmployeeMetrics) => number;
  invert: boolean;
}> = [
  { axis: "Giờ", pick: (m) => m.monthHours, invert: false },
  { axis: "Tin cậy", pick: (m) => m.reliabilityPct, invert: false },
  { axis: "Ngày", pick: (m) => m.daysWorked, invert: false },
  { axis: "Khen", pick: (m) => m.kudosCount, invert: false },
  { axis: "Đúng giờ", pick: (m) => m.lateCount, invert: true },
];

/**
 * Build radar chart data normalized 0-100 per axis.
 *
 * For each axis the per-axis max across selected employees is computed,
 * then each raw value is scaled to (raw / max) * 100 (0 if max is 0).
 * For the inverted "Đúng giờ" axis, lateCount is normalized then mapped
 * to (100 - normalizedLate) so higher = better punctuality.
 */
export function buildRadarData(employees: EmployeeMetrics[]): RadarPoint[] {
  return AXES.map(({ axis, pick, invert }) => {
    const raws = employees.map(pick);
    const max = raws.reduce((acc, v) => (v > acc ? v : acc), 0);
    const point: RadarPoint = { axis };
    employees.forEach((emp, i) => {
      const raw = raws[i];
      const normalized = max === 0 ? 0 : (raw / max) * 100;
      const value = invert ? 100 - normalized : normalized;
      point[emp.name] = Math.round(value * 10) / 10;
    });
    return point;
  });
}
