import { redirect } from "next/navigation";
import { CalendarDays, Sparkles } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { getSession } from "@/lib/auth";
import { VN_HOLIDAYS_2025_2027, type Holiday } from "@/lib/holidays";
import { HolidaysCalendar } from "./holidays-calendar";

export const dynamic = "force-dynamic";

const SUPPORTED_YEARS: ReadonlyArray<number> = [2025, 2026, 2027];
const MIN_YEAR = SUPPORTED_YEARS[0];
const MAX_YEAR = SUPPORTED_YEARS[SUPPORTED_YEARS.length - 1];

function clampToSupported(n: number): number {
  if (n < MIN_YEAR) return MIN_YEAR;
  if (n > MAX_YEAR) return MAX_YEAR;
  return n;
}

function parseYear(value: string | undefined): number {
  const fallback = clampToSupported(new Date().getFullYear());
  if (!value) return fallback;
  const n = Number(value);
  if (!Number.isInteger(n)) return fallback;
  if (!SUPPORTED_YEARS.includes(n)) return fallback;
  return n;
}

export default async function HolidaysPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const sess = await getSession();
  if (!sess) redirect("/login");

  const sp = await searchParams;
  const year = parseYear(sp.year);

  const holidays: Holiday[] = VN_HOLIDAYS_2025_2027.filter((h) =>
    h.iso.startsWith(`${year}-`),
  );

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-rose-500/10 via-amber-500/5 to-background">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-5 text-rose-500" />
              Lịch nghỉ lễ Việt Nam — Năm {year}
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1">
                <Sparkles className="size-3.5 text-muted-foreground" />
                Các ngày lễ chính thức và ngày kỷ niệm trong năm
              </span>
            </CardDescription>
          </div>

          <form
            method="GET"
            className="flex flex-wrap items-end gap-2"
            aria-label="Chọn năm hiển thị"
          >
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-muted-foreground">Năm</span>
              <Select
                name="year"
                defaultValue={String(year)}
                className="h-9 w-28"
              >
                {SUPPORTED_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </label>
            <Button type="submit" size="sm" variant="default">
              Áp dụng
            </Button>
          </form>
        </CardHeader>
      </Card>

      <HolidaysCalendar holidays={holidays} year={year} />
    </div>
  );
}
