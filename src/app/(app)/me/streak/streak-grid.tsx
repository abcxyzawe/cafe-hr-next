"use client";

import { cn } from "@/lib/utils";

export type StreakGridPoint = {
  iso: string;
  weekday: string;
  worked: boolean;
  hours: number;
};

type Props = {
  /** 30 day-points, oldest first. */
  points: StreakGridPoint[];
};

function cellTone(p: StreakGridPoint): string {
  if (!p.worked || p.hours <= 0) {
    return "bg-muted hover:bg-muted/80";
  }
  if (p.hours <= 4) return "bg-emerald-300 hover:bg-emerald-400";
  if (p.hours <= 8) return "bg-emerald-500 hover:bg-emerald-600";
  return "bg-emerald-700 hover:bg-emerald-800";
}

function formatIsoVi(iso: string): string {
  // iso "YYYY-MM-DD"
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * GitHub-style 30-day grid (5 rows × 6 cols, column-major).
 *
 * - Cols = "weeks" (older → newer left → right).
 * - Each column is a slice of 5 days.
 * - The weekday label above a column shows the weekday of the *first* (top)
 *   point in that column, which is a reasonable approximation given the
 *   non-rectangular 30-day window.
 */
export function StreakGrid({ points }: Props) {
  const cols = 6;
  const rows = 5;

  // Pad to exactly 30 cells defensively.
  const cells: (StreakGridPoint | null)[] = points.slice(0, rows * cols);
  while (cells.length < rows * cols) cells.push(null);

  // Build columns: each column has 5 sequential days.
  const columns: (StreakGridPoint | null)[][] = [];
  for (let c = 0; c < cols; c++) {
    const col: (StreakGridPoint | null)[] = [];
    for (let r = 0; r < rows; r++) {
      col.push(cells[c * rows + r] ?? null);
    }
    columns.push(col);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {columns.map((col, idx) => {
          const head = col.find((p): p is StreakGridPoint => p !== null);
          return (
            <div
              key={`hdr-${idx}`}
              className="flex-1 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              {head?.weekday ?? ""}
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-6 gap-2">
        {columns.map((col, cIdx) => (
          <div key={`col-${cIdx}`} className="flex flex-col gap-2">
            {col.map((p, rIdx) => (
              <div
                key={`cell-${cIdx}-${rIdx}`}
                title={
                  p
                    ? `${formatIsoVi(p.iso)} · ${p.hours.toFixed(1)} giờ`
                    : "Không có dữ liệu"
                }
                aria-label={
                  p
                    ? `Ngày ${formatIsoVi(p.iso)}, ${p.hours.toFixed(1)} giờ`
                    : "Trống"
                }
                className={cn(
                  "aspect-square w-full rounded-md border border-border/40 transition-colors",
                  p ? cellTone(p) : "bg-transparent border-dashed",
                )}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-2 text-xs text-muted-foreground">
        <span>Ít</span>
        <span className="inline-block size-3 rounded-sm bg-muted" />
        <span className="inline-block size-3 rounded-sm bg-emerald-300" />
        <span className="inline-block size-3 rounded-sm bg-emerald-500" />
        <span className="inline-block size-3 rounded-sm bg-emerald-700" />
        <span>Nhiều</span>
      </div>
    </div>
  );
}
