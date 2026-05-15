import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { getSession } from "@/lib/auth";
import { VN_HOLIDAYS_2025_2027, type Holiday } from "@/lib/holidays";
import { gregorianToLunar, formatLunarShort } from "@/lib/lunar-calendar";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

const SUPPORTED_YEARS: ReadonlyArray<number> = [2025, 2026, 2027];
const MIN_YEAR = SUPPORTED_YEARS[0];
const MAX_YEAR = SUPPORTED_YEARS[SUPPORTED_YEARS.length - 1];

const MONTH_NAMES_VI: ReadonlyArray<string> = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

function clampToSupported(n: number): number {
  if (n < MIN_YEAR) return MIN_YEAR;
  if (n > MAX_YEAR) return MAX_YEAR;
  return n;
}

function parseYear(value: string | undefined): number {
  const fallback = clampToSupported(new Date().getFullYear());
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  if (!Number.isInteger(n)) return fallback;
  if (!SUPPORTED_YEARS.includes(n)) return clampToSupported(n);
  return n;
}

type EnrichedHoliday = Holiday & {
  day: number;
  month: number;
  lunarLabel: string;
};

function enrich(h: Holiday): EnrichedHoliday {
  const [yStr, mStr, dStr] = h.iso.split("-");
  const y = Number.parseInt(yStr, 10);
  const m = Number.parseInt(mStr, 10);
  const d = Number.parseInt(dStr, 10);
  const lunar = gregorianToLunar(new Date(y, m - 1, d));
  return {
    ...h,
    day: d,
    month: m,
    lunarLabel: formatLunarShort(lunar),
  };
}

function groupByMonth(items: EnrichedHoliday[]): Map<number, EnrichedHoliday[]> {
  const map = new Map<number, EnrichedHoliday[]>();
  for (let m = 1; m <= 12; m += 1) map.set(m, []);
  for (const h of items) {
    const arr = map.get(h.month);
    if (arr) arr.push(h);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => a.day - b.day);
  }
  return map;
}

function formatToday(): string {
  const d = new Date();
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function HolidaysPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const sess = await getSession();
  if (!sess) redirect("/login");

  const sp = await searchParams;
  const year = parseYear(sp.year);

  const holidays: EnrichedHoliday[] = VN_HOLIDAYS_2025_2027.filter((h) =>
    h.iso.startsWith(`${year}-`),
  ).map(enrich);

  const byMonth = groupByMonth(holidays);
  const months: Array<{ index: number; name: string; items: EnrichedHoliday[] }> =
    MONTH_NAMES_VI.map((name, i) => ({
      index: i + 1,
      name,
      items: byMonth.get(i + 1) ?? [],
    }));

  return (
    <div className="holidays-print-root min-h-screen bg-zinc-100 print:min-h-0 print:bg-white">
      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-background/95 px-6 py-3 backdrop-blur print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/holidays"
            prefetch={false}
            className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent"
          >
            <ArrowLeft className="size-4" />
            Quay lại
          </Link>
          <p className="text-sm text-muted-foreground">
            Lịch nghỉ lễ {year} · A4 ngang · Ctrl/Cmd+P để in
          </p>
        </div>

        <form
          method="get"
          className="flex flex-wrap items-center gap-2 print:hidden"
          aria-label="Chọn năm in"
        >
          <label
            htmlFor="year-select"
            className="text-xs font-medium text-muted-foreground"
          >
            Năm
          </label>
          <select
            id="year-select"
            name="year"
            defaultValue={String(year)}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            {SUPPORTED_YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-1 rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent"
          >
            Áp dụng
          </button>
          <PrintButton />
        </form>
      </div>

      <main className="mx-auto max-w-[297mm] px-4 py-6 text-zinc-900 print:max-w-none print:px-0 print:py-0">
        <article className="page-sheet rounded-lg bg-white p-6 shadow-sm print:rounded-none print:p-0 print:shadow-none">
          <header className="mb-4 flex items-center justify-between gap-4 border-b-2 border-rose-600/70 pb-3">
            <div className="flex items-center gap-3">
              <Image
                src="/brand/logo-96.png"
                alt="Cafe HR"
                width={56}
                height={56}
                className="rounded-lg"
              />
              <div>
                <p className="text-[10pt] font-semibold uppercase tracking-[0.25em] text-rose-700">
                  Cafe HR
                </p>
                <h1 className="font-serif text-2xl font-extrabold leading-tight tracking-tight text-zinc-900">
                  LỊCH NGHỈ LỄ {year}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2 text-rose-700">
              <CalendarDays className="size-5" />
              <span className="text-sm font-medium">
                {holidays.length} ngày lễ trong năm
              </span>
            </div>
          </header>

          <section className="grid grid-cols-3 gap-3 lg:grid-cols-4">
            {months.map((m) => (
              <div
                key={m.index}
                className="month-card flex break-inside-avoid flex-col rounded-md border border-zinc-300 bg-white"
              >
                <div className="flex items-baseline justify-between border-b border-zinc-200 px-2 py-1.5">
                  <h2 className="text-[11pt] font-bold tracking-tight text-rose-700">
                    {m.name}
                  </h2>
                  <span className="text-[8pt] font-medium text-zinc-500">
                    {m.items.length > 0
                      ? `${m.items.length} ngày`
                      : "Không có"}
                  </span>
                </div>
                <ul className="flex flex-1 flex-col gap-1 p-2 text-[8.5pt]">
                  {m.items.length === 0 ? (
                    <li className="text-center text-zinc-400">—</li>
                  ) : (
                    m.items.map((h) => (
                      <li
                        key={h.iso}
                        className="flex items-start gap-1.5 leading-tight"
                      >
                        <span className="inline-flex h-5 min-w-[22px] shrink-0 items-center justify-center rounded bg-rose-600 px-1 text-[8pt] font-bold tabular-nums text-white">
                          {String(h.day).padStart(2, "0")}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-zinc-900">
                            {h.name}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1">
                            <span
                              className={
                                h.type === "public"
                                  ? "inline-flex items-center rounded-sm border border-rose-300 bg-rose-50 px-1 text-[7pt] font-semibold uppercase tracking-wide text-rose-700"
                                  : "inline-flex items-center rounded-sm border border-amber-300 bg-amber-50 px-1 text-[7pt] font-semibold uppercase tracking-wide text-amber-700"
                              }
                            >
                              {h.type === "public" ? "Lễ" : "Kỷ niệm"}
                            </span>
                            <span className="inline-flex items-center rounded-sm border border-emerald-300 bg-emerald-50 px-1 text-[7pt] font-medium text-emerald-700">
                              {h.lunarLabel}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            ))}
          </section>

          <footer className="mt-4 flex items-center justify-between border-t border-zinc-200 pt-2 text-[8pt] text-zinc-500">
            <span className="italic">
              In bởi Cafe HR · {formatToday()}
            </span>
            <span>Lịch âm dương — tham khảo</span>
          </footer>
        </article>
      </main>

      <style>{`
        @page { size: A4 landscape; margin: 1.2cm; }
        @media print {
          html, body { background: white !important; }
          .no-print { display: none !important; }
          .holidays-print-root { background: white !important; }
          .page-sheet { box-shadow: none !important; }
          .month-card { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
