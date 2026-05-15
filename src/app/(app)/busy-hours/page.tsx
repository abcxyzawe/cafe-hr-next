import { redirect } from "next/navigation";
import { Flame, TrendingUp, Activity, Sigma } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getBusyHours, type BusyHoursData } from "@/lib/busy-hours-data";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

const WINDOW_OPTIONS = [30, 60, 90, 180] as const;
const DEFAULT_WINDOW = 90;
type WindowOption = (typeof WINDOW_OPTIONS)[number];

const DOW_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;
const DOW_FULL = [
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
  "Chủ nhật",
] as const;

type SearchParams = { window?: string };

function parseWindow(value: string | undefined): WindowOption {
  if (!value) return DEFAULT_WINDOW;
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_WINDOW;
  const floored = Math.floor(n);
  return (WINDOW_OPTIONS as readonly number[]).includes(floored)
    ? (floored as WindowOption)
    : DEFAULT_WINDOW;
}

function bucketClass(count: number, max: number): string {
  if (count <= 0 || max <= 0) {
    return "bg-muted/40 text-muted-foreground";
  }
  const ratio = count / max;
  if (ratio <= 0.25) return "bg-emerald-200 text-emerald-900";
  if (ratio <= 0.5) return "bg-amber-300 text-amber-950";
  if (ratio <= 0.75) return "bg-orange-400 text-orange-950";
  return "bg-rose-500 text-white";
}

const LEGEND: Array<{ label: string; cls: string }> = [
  { label: "0", cls: "bg-muted/40" },
  { label: "≤25%", cls: "bg-emerald-200" },
  { label: "≤50%", cls: "bg-amber-300" },
  { label: "≤75%", cls: "bg-orange-400" },
  { label: ">75%", cls: "bg-rose-500" },
];

export default async function BusyHoursPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sess = await getSession();
  if (sess?.role !== "admin") redirect("/");

  const sp = await searchParams;
  const windowDays = parseWindow(sp.window);

  let data: BusyHoursData | null = null;
  let error: string | null = null;
  try {
    data = await getBusyHours(windowDays);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const max = data?.peakCount ?? 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
          <div className="flex items-center gap-2">
            <Flame className="size-5 text-primary" />
            <div>
              <CardTitle>Giờ bận theo ngày trong tuần</CardTitle>
              <CardDescription>
                Heatmap số lượt check-in theo giờ × thứ trong{" "}
                {windowDays} ngày gần nhất.
              </CardDescription>
            </div>
          </div>
          <form
            method="GET"
            action="/busy-hours"
            className="flex items-center gap-2"
          >
            <label
              htmlFor="busy-window"
              className="text-xs font-medium text-muted-foreground"
            >
              Cửa sổ
            </label>
            <select
              id="busy-window"
              name="window"
              defaultValue={String(windowDays)}
              className="flex h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm [&>option]:bg-background [&>option]:text-foreground"
            >
              {WINDOW_OPTIONS.map((w) => (
                <option key={w} value={w}>
                  {w} ngày
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm hover:bg-accent"
            >
              Áp dụng
            </button>
          </form>
        </CardHeader>
      </Card>

      {error && (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-destructive">
              Không tải được dữ liệu: {error}
            </p>
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              icon={<Flame className="size-4 text-rose-500" />}
              label="Khung giờ đỉnh"
              value={
                data.peakCount > 0
                  ? `${DOW_FULL[data.peakDow] ?? ""} · ${data.peakHour}h`
                  : "—"
              }
            />
            <StatTile
              icon={<TrendingUp className="size-4 text-orange-500" />}
              label="Đỉnh check-in"
              value={`${data.peakCount}`}
            />
            <StatTile
              icon={<Sigma className="size-4 text-emerald-500" />}
              label="Tổng check-in"
              value={`${data.totalCheckins}`}
            />
            <StatTile
              icon={<Activity className="size-4 text-sky-500" />}
              label="TB / ô"
              value={data.avgPerCell.toFixed(2)}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Bản đồ nhiệt</CardTitle>
              <CardDescription>
                Hàng = thứ trong tuần · Cột = giờ trong ngày (0–23)
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[760px] border-separate border-spacing-1 px-4 pb-4 text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-background text-left text-muted-foreground"></th>
                    {Array.from({ length: 24 }, (_, h) => (
                      <th
                        key={h}
                        className="text-center font-normal text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DOW_LABELS.map((dowLabel, dow) => (
                    <tr key={dow}>
                      <th
                        scope="row"
                        className="sticky left-0 z-10 bg-background pr-2 text-right font-medium text-muted-foreground"
                      >
                        {dowLabel}
                      </th>
                      {Array.from({ length: 24 }, (_, hour) => {
                        const cell =
                          data.cells[dow * 24 + hour] ?? {
                            dow,
                            hour,
                            count: 0,
                          };
                        const cls = bucketClass(cell.count, max);
                        return (
                          <td
                            key={hour}
                            title={`${DOW_FULL[dow] ?? ""} ${hour}h: ${cell.count} check-in`}
                            className={`h-7 min-w-[28px] rounded text-center text-[11px] font-medium tabular-nums transition-colors ${cls}`}
                          >
                            {cell.count > 0 ? cell.count : ""}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card/50 px-4 py-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Thang màu:</span>
            {LEGEND.map((item) => (
              <span key={item.label} className="inline-flex items-center gap-1.5">
                <span
                  className={`inline-block size-3 rounded ${item.cls}`}
                  aria-hidden
                />
                {item.label}
              </span>
            ))}
            <span className="ml-auto">
              Đỉnh = {data.peakCount} · ngưỡng dựa theo % của đỉnh.
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card/50 p-4">
      <div className="flex size-9 items-center justify-center rounded-md bg-muted">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-lg font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}
