import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  ROLE_LABELS,
  formatDate,
  formatDateTime,
  formatHours,
} from "@/lib/utils";
import { AttendancePrintButton } from "./print-button";

export const dynamic = "force-dynamic";

const WEEKDAY_FULL = [
  "Chủ nhật",
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
];

function isValidIso(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00`);
  return !Number.isNaN(d.getTime());
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLocalDate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function nextDay(d: Date): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + 1);
  return out;
}

function formatTimeOnly(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type AttendanceRow = {
  id: number;
  employeeId: number;
  checkIn: Date;
  checkOut: Date | null;
  hoursWorked: number;
};

type EmployeeInfo = {
  id: number;
  name: string;
  role: string;
  avatarUrl: string | null;
};

type EmployeeGroup = {
  employee: EmployeeInfo;
  rows: AttendanceRow[];
  totalHours: number;
  totalDays: number;
};

export default async function AttendancePrintPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; week?: string }>;
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
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1);
  const defaultTo = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const fromDate =
    sp.from && isValidIso(sp.from) ? parseLocalDate(sp.from) : defaultFrom;
  const toDate =
    sp.to && isValidIso(sp.to) ? parseLocalDate(sp.to) : defaultTo;

  const queryStart = fromDate;
  const queryEnd = nextDay(toDate);

  const attendanceRaw = await prisma.attendance.findMany({
    where: { checkIn: { gte: queryStart, lt: queryEnd } },
    include: {
      employee: {
        select: { id: true, name: true, role: true, avatarUrl: true },
      },
    },
    orderBy: [{ employee: { name: "asc" } }, { checkIn: "asc" }],
  });

  const groupedMap = new Map<number, EmployeeGroup>();
  for (const a of attendanceRaw) {
    const emp = a.employee;
    const hours = a.hoursWorked !== null ? Number(a.hoursWorked) : 0;
    const row: AttendanceRow = {
      id: a.id,
      employeeId: a.employeeId,
      checkIn: a.checkIn,
      checkOut: a.checkOut,
      hoursWorked: hours,
    };
    const existing = groupedMap.get(a.employeeId);
    if (existing) {
      existing.rows.push(row);
      existing.totalHours += hours;
    } else {
      groupedMap.set(a.employeeId, {
        employee: {
          id: emp.id,
          name: emp.name,
          role: emp.role,
          avatarUrl: emp.avatarUrl,
        },
        rows: [row],
        totalHours: hours,
        totalDays: 0,
      });
    }
  }

  // Compute distinct days per employee
  for (const g of groupedMap.values()) {
    const dayKeys = new Set<string>();
    for (const r of g.rows) dayKeys.add(toIso(r.checkIn));
    g.totalDays = dayKeys.size;
  }

  const groups = Array.from(groupedMap.values()).sort((a, b) =>
    a.employee.name.localeCompare(b.employee.name, "vi"),
  );

  const totalEmployees = groups.length;
  const totalHoursAll = groups.reduce((sum, g) => sum + g.totalHours, 0);

  const fromIso = toIso(fromDate);
  const toIsoStr = toIso(toDate);
  const fromLabel = formatDate(fromDate);
  const toLabel = formatDate(toDate);
  const issuedAt = formatDateTime(new Date());

  return (
    <div className="attendance-print-root min-h-screen bg-zinc-100 text-zinc-900 print:bg-white">
      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-background/95 px-6 py-3 backdrop-blur print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/attendance"
            prefetch={false}
            className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent"
          >
            <ArrowLeft className="size-4" />
            Quay lại
          </Link>
          <p className="text-sm text-muted-foreground">
            Báo cáo chấm công {fromLabel} – {toLabel} · Ctrl/Cmd+P để in
          </p>
        </div>
        <form
          method="get"
          className="flex flex-wrap items-end gap-2 text-sm"
        >
          <label className="flex flex-col gap-0.5 text-xs text-muted-foreground">
            Từ ngày
            <input
              type="date"
              name="from"
              defaultValue={fromIso}
              className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
            />
          </label>
          <label className="flex flex-col gap-0.5 text-xs text-muted-foreground">
            Đến ngày
            <input
              type="date"
              name="to"
              defaultValue={toIsoStr}
              className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
            />
          </label>
          <button
            type="submit"
            className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent"
          >
            Áp dụng
          </button>
          <AttendancePrintButton />
        </form>
      </div>

      <main className="mx-auto max-w-[820px] bg-white px-10 py-10 shadow-sm print:max-w-none print:px-0 print:py-0 print:shadow-none">
        <header className="mb-6 flex items-start justify-between gap-6 border-b-2 border-zinc-900 pb-4">
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
          <div className="text-right text-[11px] text-zinc-600">
            <p>Ngày in</p>
            <p className="font-mono text-xs text-zinc-900">{issuedAt}</p>
            <p className="mt-1">Kỳ báo cáo</p>
            <p className="font-mono text-xs text-zinc-900">
              {fromIso} → {toIsoStr}
            </p>
          </div>
        </header>

        <div className="mb-6 text-center">
          <h1 className="font-serif text-2xl font-bold tracking-tight">
            BÁO CÁO CHẤM CÔNG
          </h1>
          <p className="mt-1 font-mono text-xs text-zinc-700">
            {fromLabel} → {toLabel}
          </p>
        </div>

        <section className="mb-6 rounded border border-zinc-300 bg-zinc-50 px-4 py-2 text-center text-xs text-zinc-700">
          Tổng <strong>{totalEmployees}</strong> nhân viên ·{" "}
          <strong>{attendanceRaw.length}</strong> lượt chấm công ·{" "}
          <strong>{formatHours(totalHoursAll)}</strong> tổng giờ
        </section>

        {groups.length === 0 ? (
          <section className="rounded border border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500">
            Khoảng thời gian này chưa có lượt chấm công nào.
          </section>
        ) : (
          groups.map((g) => (
            <section
              key={g.employee.id}
              className="mb-6 break-inside-avoid print:break-inside-avoid"
            >
              <div className="mb-2 flex items-center justify-between gap-3 border-b border-zinc-400 pb-2">
                <div className="flex items-center gap-3">
                  {g.employee.avatarUrl ? (
                    <Image
                      src={g.employee.avatarUrl}
                      alt={g.employee.name}
                      width={40}
                      height={40}
                      className="size-10 rounded-full border border-zinc-300 object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex size-10 items-center justify-center rounded-full border border-zinc-300 bg-zinc-100 text-xs font-bold text-zinc-600">
                      {initialsOf(g.employee.name)}
                    </div>
                  )}
                  <div className="leading-tight">
                    <p className="text-base font-bold text-zinc-900">
                      {g.employee.name}
                    </p>
                    <span className="mt-0.5 inline-block rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700">
                      {ROLE_LABELS[g.employee.role] ?? g.employee.role}
                    </span>
                  </div>
                </div>
                <p className="text-right text-xs text-zinc-700">
                  Tổng:{" "}
                  <strong className="font-mono text-zinc-900">
                    {formatHours(g.totalHours)}
                  </strong>{" "}
                  trong{" "}
                  <strong className="font-mono text-zinc-900">
                    {g.totalDays}
                  </strong>{" "}
                  ngày
                </p>
              </div>

              <table className="w-full border-collapse text-[10pt]">
                <thead>
                  <tr className="border-b border-zinc-400 text-left text-zinc-700">
                    <th className="py-1 pr-2 font-semibold">Ngày</th>
                    <th className="py-1 pr-2 font-semibold">Vào</th>
                    <th className="py-1 pr-2 font-semibold">Ra</th>
                    <th className="py-1 pr-2 text-right font-semibold">
                      Giờ làm
                    </th>
                    <th className="py-1 text-right font-semibold">
                      Trạng thái
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((r) => {
                    const dow = WEEKDAY_FULL[r.checkIn.getDay()];
                    const completed = r.checkOut !== null;
                    return (
                      <tr
                        key={r.id}
                        className="border-b border-zinc-200 align-top"
                      >
                        <td className="py-1 pr-2">
                          <span className="font-mono">
                            {formatDate(r.checkIn)}
                          </span>{" "}
                          <span className="text-[9pt] text-zinc-500">
                            ({dow})
                          </span>
                        </td>
                        <td className="py-1 pr-2 font-mono">
                          {formatTimeOnly(r.checkIn)}
                        </td>
                        <td className="py-1 pr-2 font-mono">
                          {r.checkOut ? (
                            formatTimeOnly(r.checkOut)
                          ) : (
                            <span className="italic text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="py-1 pr-2 text-right font-mono">
                          {completed ? formatHours(r.hoursWorked) : "—"}
                        </td>
                        <td className="py-1 text-right">
                          {completed ? (
                            <span className="inline-block rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[9pt] font-medium text-emerald-700 print:border-zinc-400 print:bg-white print:text-zinc-900">
                              Đầy đủ
                            </span>
                          ) : (
                            <span className="inline-block rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[9pt] font-medium text-amber-700 print:border-zinc-400 print:bg-white print:text-zinc-900">
                              Chưa check-out
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          ))
        )}

        <footer className="mt-10 break-inside-avoid border-t border-zinc-300 pt-4 print:break-inside-avoid">
          <p className="mb-6 text-center text-xs text-zinc-700">
            Tổng cộng <strong>{totalEmployees}</strong> nhân viên ·{" "}
            <strong>{formatHours(totalHoursAll)}</strong> giờ làm trong kỳ.
          </p>
          <div className="grid grid-cols-2 gap-12 text-[10pt]">
            <div className="text-center">
              <p className="mb-1 font-semibold text-zinc-700">Người lập</p>
              <p className="text-[9pt] italic text-zinc-500">
                (Ký và ghi rõ họ tên)
              </p>
              <div className="mt-12 border-t border-zinc-400 pt-2" />
            </div>
            <div className="text-center">
              <p className="mb-1 font-semibold text-zinc-700">Quản lý</p>
              <p className="text-[9pt] italic text-zinc-500">
                (Ký và ghi rõ họ tên)
              </p>
              <div className="mt-12 border-t border-zinc-400 pt-2" />
            </div>
          </div>
          <p className="mt-6 text-center text-[9pt] text-zinc-400">
            In tự động bởi Cafe HR · {issuedAt}
          </p>
        </footer>
      </main>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 1.2cm; }
          html, body { background: white !important; font-size: 10pt; }
          .no-print { display: none !important; }
          .attendance-print-root { background: white !important; }
          table { break-inside: avoid; }
          thead { display: table-header-group; }
        }
      `}</style>
    </div>
  );
}
