import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Sunrise, Sun, Moon, CalendarHeart } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ROLE_LABELS, SHIFT_LABELS, formatDate, cn } from "@/lib/utils";
import { getHolidaysInRange, type Holiday } from "@/lib/holidays";
import { PrintToolbarPrintButton } from "./print-toolbar-button";

export const dynamic = "force-dynamic";

const WEEKDAY = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

type ShiftType = "morning" | "afternoon" | "evening";

const SHIFT_ORDER: ShiftType[] = ["morning", "afternoon", "evening"];

const SHIFT_STYLE: Record<
  ShiftType,
  { chip: string; row: string; icon: typeof Sunrise; label: string }
> = {
  morning: {
    chip: "border-amber-300 bg-amber-50 text-amber-800",
    row: "bg-amber-50/60",
    icon: Sunrise,
    label: "Sáng",
  },
  afternoon: {
    chip: "border-orange-300 bg-orange-50 text-orange-800",
    row: "bg-orange-50/60",
    icon: Sun,
    label: "Chiều",
  },
  evening: {
    chip: "border-indigo-300 bg-indigo-50 text-indigo-800",
    row: "bg-indigo-50/60",
    icon: Moon,
    label: "Tối",
  },
};

const ROLE_CHIP: Record<string, string> = {
  manager: "border-purple-300 bg-purple-50 text-purple-800",
  barista: "border-emerald-300 bg-emerald-50 text-emerald-800",
  server: "border-sky-300 bg-sky-50 text-sky-800",
  cashier: "border-pink-300 bg-pink-50 text-pink-800",
};

function startOfWeekMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function toIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isValidIso(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

type ShiftRow = {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeRole: string;
  shiftType: ShiftType;
  startTime: string | null;
  endTime: string | null;
};

export default async function ShiftsPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; week?: string }>;
}) {
  const sess = await getSession();
  if (!sess) {
    redirect("/login");
  }
  if (sess.role !== "admin") {
    redirect("/");
  }

  const sp = await searchParams;
  const today = new Date();
  // Accept ?date= (preferred) or legacy ?week=
  const inputDate = sp.date ?? sp.week;
  const baseDate =
    inputDate && isValidIso(inputDate) ? new Date(inputDate) : today;
  const weekStart = startOfWeekMonday(baseDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const weekStartIso = toIsoLocal(weekStart);
  const baseDateIso = toIsoLocal(baseDate);

  const shifts = await prisma.shift.findMany({
    where: { shiftDate: { gte: weekStart, lt: weekEnd } },
    include: {
      employee: { select: { id: true, name: true, role: true } },
    },
    orderBy: [{ shiftDate: "asc" }, { shiftType: "asc" }],
  });

  const weekHolidays = getHolidaysInRange(weekStart, weekEnd);
  const holidayByIso = new Map<string, Holiday>(
    weekHolidays.map((h) => [h.iso, h]),
  );

  // Build days array
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  // 2D map: dayIso -> shiftType -> ShiftRow[]
  const cellMap = new Map<string, Map<ShiftType, ShiftRow[]>>();
  for (const d of days) {
    const inner = new Map<ShiftType, ShiftRow[]>();
    for (const st of SHIFT_ORDER) inner.set(st, []);
    cellMap.set(toIsoLocal(d), inner);
  }

  const uniqueEmployeeIds = new Set<number>();
  for (const s of shifts) {
    const dayIso = toIsoLocal(new Date(s.shiftDate));
    const st = (s.shiftType ?? "morning") as ShiftType;
    const dayBucket = cellMap.get(dayIso);
    if (!dayBucket) continue;
    const arr = dayBucket.get(st);
    if (!arr) continue;
    arr.push({
      id: s.id,
      employeeId: s.employeeId,
      employeeName: s.employee?.name ?? `#${s.employeeId}`,
      employeeRole: s.employee?.role ?? "",
      shiftType: st,
      startTime: s.startTime,
      endTime: s.endTime,
    });
    uniqueEmployeeIds.add(s.employeeId);
  }

  const weekEndLabel = formatDate(new Date(weekEnd.getTime() - 86400000));
  const weekStartLabel = formatDate(weekStart);
  const issuedAt = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
  const rangeShort = `${String(weekStart.getDate()).padStart(2, "0")}/${String(
    weekStart.getMonth() + 1,
  ).padStart(2, "0")} – ${String(
    new Date(weekEnd.getTime() - 86400000).getDate(),
  ).padStart(2, "0")}/${String(
    new Date(weekEnd.getTime() - 86400000).getMonth() + 1,
  ).padStart(2, "0")}/${new Date(weekEnd.getTime() - 86400000).getFullYear()}`;

  return (
    <div className="schedule-print-root min-h-screen bg-white text-zinc-900">
      {/* Toolbar (hidden on print) */}
      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-background/95 px-6 py-3 backdrop-blur print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href={`/shifts?date=${weekStartIso}`}
            prefetch={false}
            className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent"
          >
            <ArrowLeft className="size-4" />
            Quay lại
          </Link>
          <p className="text-sm text-muted-foreground">
            Lịch tuần {weekStartLabel} – {weekEndLabel} · Ctrl/Cmd+P để in
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form method="GET" className="flex items-center gap-2">
            <label
              htmlFor="print-date-input"
              className="text-xs text-muted-foreground"
            >
              Ngày trong tuần
            </label>
            <input
              id="print-date-input"
              type="date"
              name="date"
              defaultValue={baseDateIso}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            />
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent"
            >
              Đổi tuần
            </button>
          </form>
          <PrintToolbarPrintButton />
        </div>
      </div>

      <main className="mx-auto max-w-[1280px] px-8 py-8 print:max-w-none print:px-0 print:py-0">
        {/* Branded header */}
        <header className="mb-5 flex items-start justify-between gap-4 border-b-2 border-zinc-900 pb-4">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/logo-96.png"
              alt="Cafe HR"
              width={48}
              height={48}
              className="rounded"
              unoptimized
            />
            <div>
              <p className="text-base font-bold tracking-wide text-zinc-900">
                CAFE HR
              </p>
              <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                Quản lý nhân sự quán cà phê
              </p>
            </div>
          </div>
          <div className="text-center">
            <h1 className="font-serif text-2xl font-bold tracking-tight">
              LỊCH CA TUẦN
            </h1>
            <p className="mt-0.5 text-[11px] uppercase tracking-widest text-zinc-500">
              Weekly Schedule
            </p>
            <p className="mt-1 text-sm font-mono text-zinc-800">{rangeShort}</p>
          </div>
          <div className="text-right text-[11px] text-zinc-600">
            <p>Xuất lúc</p>
            <p className="font-mono text-xs text-zinc-900">{issuedAt}</p>
          </div>
        </header>

        {/* Legend + counts */}
        <section className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4 text-zinc-700">
            <span>
              Tổng số ca: <strong>{shifts.length}</strong>
            </span>
            <span>
              Nhân viên có lịch: <strong>{uniqueEmployeeIds.size}</strong>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {SHIFT_ORDER.map((k) => {
              const meta = SHIFT_STYLE[k];
              const Icon = meta.icon;
              return (
                <span
                  key={k}
                  className={cn(
                    "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px]",
                    meta.chip,
                  )}
                >
                  <Icon className="size-3" />
                  {SHIFT_LABELS[k]}
                </span>
              );
            })}
          </div>
        </section>

        {/* Big grid: 7 day cols × 3 shift rows */}
        <section className="overflow-hidden rounded border-2 border-zinc-800">
          <table className="w-full table-fixed border-collapse text-[10pt]">
            <colgroup>
              <col style={{ width: "100px" }} />
              {days.map((d) => (
                <col key={toIsoLocal(d)} />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-zinc-900 text-white">
                <th className="border-r border-zinc-700 px-2 py-2 text-left text-[10pt] font-semibold">
                  Ca / Ngày
                </th>
                {days.map((d) => {
                  const iso = toIsoLocal(d);
                  const holiday = holidayByIso.get(iso);
                  const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <th
                      key={iso}
                      className={cn(
                        "border-r border-zinc-700 px-1.5 py-1.5 text-center align-bottom text-[10pt] font-semibold last:border-r-0",
                        holiday && "bg-rose-700",
                        !holiday && isWeekend && "bg-zinc-800",
                      )}
                    >
                      {holiday && (
                        <div
                          className="mx-auto mb-1 inline-flex max-w-full items-center gap-1 truncate rounded bg-rose-100 px-1 py-0.5 text-[8pt] font-medium text-rose-800"
                          title={holiday.name}
                        >
                          <CalendarHeart className="size-3 shrink-0" />
                          <span className="truncate">{holiday.name}</span>
                        </div>
                      )}
                      <div className="text-[10pt] font-bold uppercase tracking-wide">
                        {WEEKDAY[dow]}
                      </div>
                      <div className="font-mono text-[9pt] text-zinc-200">
                        {String(d.getDate()).padStart(2, "0")}/
                        {String(d.getMonth() + 1).padStart(2, "0")}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {SHIFT_ORDER.map((st) => {
                const meta = SHIFT_STYLE[st];
                const Icon = meta.icon;
                return (
                  <tr key={st} className="align-top">
                    <td
                      className={cn(
                        "border-t border-r border-zinc-300 px-2 py-2 text-center align-middle font-semibold",
                        meta.row,
                      )}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Icon className="size-5" />
                        <span className="text-[11pt]">{meta.label}</span>
                      </div>
                    </td>
                    {days.map((d) => {
                      const iso = toIsoLocal(d);
                      const holiday = holidayByIso.get(iso);
                      const cellShifts =
                        cellMap.get(iso)?.get(st) ?? [];
                      const isWeekend =
                        d.getDay() === 0 || d.getDay() === 6;
                      return (
                        <td
                          key={iso}
                          className={cn(
                            "border-t border-r border-zinc-300 px-1.5 py-1.5 align-top last:border-r-0",
                            holiday && "bg-rose-50/60",
                            !holiday && isWeekend && "bg-zinc-50",
                          )}
                          style={{ minHeight: "70px" }}
                        >
                          {cellShifts.length === 0 ? (
                            <div className="py-3 text-center text-[10pt] text-zinc-300">
                              —
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {cellShifts.map((s) => {
                                const roleChip =
                                  ROLE_CHIP[s.employeeRole] ??
                                  "border-zinc-300 bg-zinc-100 text-zinc-700";
                                return (
                                  <div
                                    key={s.id}
                                    className="rounded border border-zinc-200 bg-white px-1.5 py-1 leading-tight"
                                  >
                                    <div className="text-[9.5pt] font-semibold text-zinc-900">
                                      {s.employeeName}
                                    </div>
                                    <div className="mt-0.5 flex flex-wrap items-center gap-1">
                                      <span
                                        className={cn(
                                          "inline-flex rounded border px-1 py-px text-[8pt] font-medium",
                                          roleChip,
                                        )}
                                      >
                                        {ROLE_LABELS[s.employeeRole] ??
                                          s.employeeRole}
                                      </span>
                                      {s.startTime && s.endTime && (
                                        <span className="font-mono text-[8pt] text-zinc-500">
                                          {s.startTime}–{s.endTime}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                              <div className="mt-0.5 text-right">
                                <span className="inline-flex items-center rounded-full border border-zinc-300 bg-zinc-50 px-1.5 text-[8pt] font-medium text-zinc-600">
                                  {cellShifts.length} NV
                                </span>
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {weekHolidays.length > 0 && (
          <section className="mt-3 rounded border border-rose-300 bg-rose-50 px-3 py-2 text-[10pt] text-rose-800">
            <span className="font-semibold">Ngày lễ trong tuần:</span>{" "}
            {weekHolidays.map((h, i) => (
              <span key={h.iso}>
                {i > 0 ? " · " : ""}
                {h.iso.slice(8)}/{h.iso.slice(5, 7)} {h.name}
              </span>
            ))}
          </section>
        )}

        {/* Footer with totals + signatures */}
        <footer className="mt-6 grid grid-cols-12 gap-6 text-[10pt]">
          <div className="col-span-4 rounded border border-zinc-300 bg-zinc-50 p-3">
            <p className="text-[9pt] uppercase tracking-wide text-zinc-500">
              Tổng kết tuần
            </p>
            <div className="mt-2 space-y-1">
              <p>
                Tổng số ca:{" "}
                <strong className="text-zinc-900">{shifts.length}</strong>
              </p>
              <p>
                Nhân viên xếp lịch:{" "}
                <strong className="text-zinc-900">
                  {uniqueEmployeeIds.size}
                </strong>
              </p>
              <p>
                Số ngày lễ:{" "}
                <strong className="text-zinc-900">
                  {weekHolidays.length}
                </strong>
              </p>
            </div>
          </div>
          <div className="col-span-4 text-center">
            <p className="mb-1 font-semibold text-zinc-700">Người lập</p>
            <p className="text-[9pt] italic text-zinc-500">
              (Ký và ghi rõ họ tên)
            </p>
            <div className="mt-12 border-t border-zinc-400 pt-1 text-[9pt] text-zinc-500">
              {sess.name}
            </div>
          </div>
          <div className="col-span-4 text-center">
            <p className="mb-1 font-semibold text-zinc-700">Quản lý</p>
            <p className="text-[9pt] italic text-zinc-500">
              (Ký và ghi rõ họ tên)
            </p>
            <div className="mt-12 border-t border-zinc-400 pt-1 text-[9pt] text-zinc-500">
              &nbsp;
            </div>
          </div>
        </footer>

        <p className="mt-6 text-center text-[9pt] text-zinc-400">
          In tự động bởi Cafe HR · {issuedAt}
        </p>
      </main>

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 1cm; }
          html, body { background: white !important; font-size: 10pt; }
          .no-print { display: none !important; }
          .schedule-print-root { background: white !important; }
          table { page-break-inside: avoid; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
        }
      `}</style>
    </div>
  );
}
