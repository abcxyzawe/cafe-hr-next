import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buildRadarData, type EmployeeMetrics } from "@/lib/compare-metrics";
import { CompareRadarChart } from "./compare-radar-chart";

const PALETTE = ["#0284c7", "#d97706", "#059669", "#e11d48", "#7c3aed"];

export function CompareRadarCard({
  metrics,
}: {
  metrics: EmployeeMetrics[];
}) {
  if (metrics.length < 2) return null;

  const data = buildRadarData(metrics);
  const employees = metrics.map((m, i) => ({
    name: m.name,
    color: PALETTE[i % PALETTE.length] ?? "#0284c7",
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>So sánh radar</CardTitle>
        <CardDescription>
          5 trục được chuẩn hoá 0-100 theo giá trị cao nhất trong nhóm. Trục
          “Đúng giờ” đảo dấu (cao = ít đi muộn).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CompareRadarChart data={data} employees={employees} />
      </CardContent>
    </Card>
  );
}
