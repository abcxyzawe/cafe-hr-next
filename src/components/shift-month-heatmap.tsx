import { Activity } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DayDensity } from "@/lib/shift-density";

type Props = {
  density: DayDensity[];
  year: number;
  month: number; // 1-12
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toIsoLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function bucketClass(total: number): string {
  if (total <= 0) return "bg-muted";
  if (total === 1) return "bg-emerald-200";
  if (total <= 3) return "bg-emerald-300";
  if (total <= 5) return "bg-amber-300";
  if (total <= 7) return "bg-orange-400";
  return "bg-rose-500 text-white";
}

type Cell = {
  key: string;
  inMonth: boolean;
  iso: string;
  day: number;
  density: DayDensity;
};

const EMPTY: Omit<DayDensity, "iso"> = {
  total: 0,
  morning: 0,
  afternoon: 0,
  evening: 0,
  unset: 0,
};

const LEGEND: Array<{ label: string; cls: string }> = [
  { label: "0", cls: "bg-muted" },
  { label: "1", cls: "bg-emerald-200" },
  { label: "2-3", cls: "bg-emerald-300" },
  { label: "4-5", cls: "bg-amber-300" },
  { label: "6-7", cls: "bg-orange-400" },
  { label: "8+", cls: "bg-rose-500" },
];

export function ShiftMonthHeatmap({ density, year, month }: Props) {
  const lookup = new Map<string, DayDensity>();
  for (const d of density) lookup.set(d.iso, d);

  const monthStart = new Date(year, month - 1, 1);
  const firstDow = monthStart.getDay(); // 0=Sun..6=Sat
  const offsetToMon = firstDow === 0 ? 6 : firstDow - 1;
  const lastDay = new Date(year, month, 0).getDate();
  const totalSlots = offsetToMon + lastDay;
  const trailing = (7 - (totalSlots % 7)) % 7;
  const gridLen = totalSlots + trailing;

  const cells: Cell[] = [];
  for (let i = 0; i < gridLen; i++) {
    const dayNum = i - offsetToMon + 1;
    const inMonth = dayNum >= 1 && dayNum <= lastDay;
    if (!inMonth) {
      cells.push({
        key: `pad-${i}`,
        inMonth: false,
        iso: "",
        day: 0,
        density: { iso: "", ...EMPTY },
      });
      continue;
    }
    const d = new Date(year, month - 1, dayNum);
    const iso = toIsoLocal(d);
    cells.push({
      key: iso,
      inMonth: true,
      iso,
      day: dayNum,
      density: lookup.get(iso) ?? { iso, ...EMPTY },
    });
  }

  const headers = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  return (
    <Card className="max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="size-4" />
          Mức độ bận tháng
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>Ít</span>
          {LEGEND.map((l) => (
            <span
              key={l.label}
              className={cn("inline-flex h-3 w-5 items-center justify-center rounded-sm border text-[9px] font-medium text-foreground/70", l.cls)}
              title={`${l.label} ca`}
            >
              {l.label}
            </span>
          ))}
          <span>Nhiều</span>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-muted-foreground">
          {headers.map((h) => (
            <div key={h}>{h}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((c) => {
            if (!c.inMonth) {
              return <div key={c.key} className="size-7" aria-hidden />;
            }
            const d = c.density;
            const title = `${c.iso}: ${d.total} ca (${d.morning}/sáng · ${d.afternoon}/chiều · ${d.evening}/tối)`;
            return (
              <div
                key={c.key}
                title={title}
                className={cn(
                  "flex size-7 items-center justify-center rounded-sm border text-[11px] font-semibold tabular-nums",
                  bucketClass(d.total),
                )}
              >
                {c.day}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
