import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShiftDistributionChart } from "@/components/shift-distribution-chart";
import type { ShiftDistributionPoint } from "@/lib/shift-distribution";

type Tile = {
  key: keyof Pick<ShiftDistributionPoint, "morning" | "afternoon" | "evening" | "unset">;
  label: string;
  total: number;
  tint: string;
  text: string;
};

export function ShiftDistributionCard({ data }: { data: ShiftDistributionPoint[] }) {
  const totals = data.reduce(
    (acc, d) => {
      acc.morning += d.morning;
      acc.afternoon += d.afternoon;
      acc.evening += d.evening;
      acc.unset += d.unset;
      return acc;
    },
    { morning: 0, afternoon: 0, evening: 0, unset: 0 },
  );

  const grandTotal = totals.morning + totals.afternoon + totals.evening + totals.unset;
  if (grandTotal === 0) return null;

  const tiles: Tile[] = [
    {
      key: "morning",
      label: "Sáng",
      total: totals.morning,
      tint: "bg-amber-500/10",
      text: "text-amber-600 dark:text-amber-400",
    },
    {
      key: "afternoon",
      label: "Chiều",
      total: totals.afternoon,
      tint: "bg-orange-500/10",
      text: "text-orange-600 dark:text-orange-400",
    },
    {
      key: "evening",
      label: "Tối",
      total: totals.evening,
      tint: "bg-indigo-500/10",
      text: "text-indigo-600 dark:text-indigo-400",
    },
  ];

  if (totals.unset > 0) {
    tiles.push({
      key: "unset",
      label: "Chưa rõ",
      total: totals.unset,
      tint: "bg-slate-500/10",
      text: "text-slate-600 dark:text-slate-400",
    });
  }

  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle>Phân bổ ca theo tuần</CardTitle>
        <CardDescription>8 tuần gần nhất</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ShiftDistributionChart data={data} />
        <div
          className={`grid gap-3 ${tiles.length === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}
        >
          {tiles.map((t) => (
            <div
              key={t.key}
              className={`flex items-center justify-between rounded-lg ${t.tint} px-3 py-2`}
            >
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t.label}
              </span>
              <span className={`text-lg font-bold ${t.text}`}>{t.total}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
