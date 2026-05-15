import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  ROLE_LABELS,
  formatVND,
  formatHours,
  formatDate,
  formatDateTime,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { tenureLabel } from "@/lib/tenure";
import { getEarnedBadges } from "@/lib/achievement-queries";
import { getSalaryHistory } from "@/lib/salary-history";
import { AchievementBadge } from "@/components/achievement-badge";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

const ROLE_BORDER: Record<string, string> = {
  barista: "border-amber-600",
  server: "border-sky-600",
  cashier: "border-yellow-600",
  manager: "border-emerald-600",
};

const ROLE_BADGE: Record<string, string> = {
  barista: "bg-amber-100 text-amber-800 border-amber-300",
  server: "bg-sky-100 text-sky-800 border-sky-300",
  cashier: "bg-yellow-100 text-yellow-800 border-yellow-300",
  manager: "bg-emerald-100 text-emerald-800 border-emerald-300",
};

function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function PrintEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) notFound();

  const now = new Date();

  const [
    lifetimeAttendance,
    notesCount,
    recentNotes,
    earnedBadges,
    salaryHistory,
  ] = await Promise.all([
    prisma.attendance.findMany({
      where: { employeeId: id, checkOut: { not: null } },
      orderBy: { checkIn: "desc" },
      select: { hoursWorked: true, checkIn: true },
    }),
    prisma.employeeNote.count({ where: { employeeId: id } }),
    prisma.employeeNote.findMany({
      where: { employeeId: id },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        content: true,
        authorName: true,
        createdAt: true,
      },
    }),
    getEarnedBadges(id),
    getSalaryHistory(id),
  ]);

  const lifetimeHours = lifetimeAttendance.reduce(
    (sum, a) => sum + Number(a.hoursWorked ?? 0),
    0,
  );
  const rate = Number(employee.hourlyRate);
  const lifetimePay = Number((lifetimeHours * rate).toFixed(2));

  const distinctDays = new Set<string>();
  for (const a of lifetimeAttendance) {
    distinctDays.add(localDayKey(a.checkIn));
  }
  const daysWorked = distinctDays.size;

  // Reliability heuristic: completed-shift days vs. tenure-days (capped 100).
  const tenureMs = Math.max(
    1,
    now.getTime() - new Date(employee.createdAt).getTime(),
  );
  const tenureDays = Math.max(1, Math.floor(tenureMs / (24 * 60 * 60 * 1000)));
  // Working pattern: roughly every other day baseline → expected = tenureDays/2.
  const expected = Math.max(1, Math.floor(tenureDays / 2));
  const reliabilityRaw = Math.round((daysWorked / expected) * 100);
  const reliabilityPct = Math.max(0, Math.min(100, reliabilityRaw));

  const initials = employee.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const borderClass = ROLE_BORDER[employee.role] ?? "border-zinc-400";
  const roleBadgeClass =
    ROLE_BADGE[employee.role] ?? "bg-zinc-100 text-zinc-800 border-zinc-300";
  const roleLabel = ROLE_LABELS[employee.role] ?? employee.role;
  const issuedAt = formatDate(now);
  const tenure = tenureLabel(employee.createdAt, now);

  return (
    <div className="print-root">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background/95 px-6 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href={`/employees/${id}`}>
              <ArrowLeft className="size-4" />
              Quay lại
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            CV nhân viên — Ctrl/Cmd+P để in hoặc lưu PDF
          </p>
        </div>
        <PrintButton />
      </div>

      <main className="cv-sheet mx-auto max-w-4xl bg-white px-10 py-10 text-zinc-900 print:max-w-none print:px-0 print:py-0">
        {/* Branded header */}
        <header className="mb-6 flex items-start justify-between border-b-[3px] border-zinc-900 pb-4">
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
              <p className="text-lg font-bold tracking-wide text-zinc-900">
                CAFE HR
              </p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                Hệ thống quản lý nhân sự
              </p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="font-serif text-2xl font-bold tracking-tight text-zinc-900">
              HỒ SƠ NHÂN VIÊN
            </h1>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">
              Xuất ngày {issuedAt} · #EMP-
              {String(employee.id).padStart(4, "0")}
            </p>
          </div>
        </header>

        {/* Hero: avatar + identity */}
        <section className="mb-6 flex items-center gap-6">
          <div
            className={`flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 ${borderClass} bg-zinc-50 shadow-sm`}
          >
            {employee.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={employee.avatarUrl}
                alt={employee.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-zinc-500">
                {initials}
              </span>
            )}
          </div>
          <div className="flex-1">
            <p className="font-serif text-3xl font-bold leading-tight text-zinc-900">
              {employee.name}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${roleBadgeClass}`}
              >
                {roleLabel}
              </span>
              <span className="inline-flex items-center rounded-full border border-zinc-300 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                Thâm niên: {tenure}
              </span>
              <span className="inline-flex items-center rounded-full border border-zinc-300 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                Tham gia {formatDate(employee.createdAt)}
              </span>
            </div>
          </div>
        </section>

        {/* Two-column: Contact + Performance | Achievements */}
        <section className="mb-6 grid grid-cols-5 gap-6">
          <div className="col-span-3 space-y-4">
            <div>
              <h2 className="mb-2 border-b border-zinc-300 pb-1 text-[11px] font-bold uppercase tracking-wider text-zinc-700">
                Thông tin liên hệ
              </h2>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <InfoField label="Email" value={employee.email ?? "—"} />
                <InfoField
                  label="Số điện thoại"
                  value={employee.phone ?? "—"}
                />
                <InfoField
                  label="Ngày sinh"
                  value={
                    employee.dateOfBirth
                      ? formatDate(employee.dateOfBirth)
                      : "—"
                  }
                />
                <InfoField label="Lương/giờ" value={formatVND(rate)} />
              </div>
            </div>

            <div>
              <h2 className="mb-2 border-b border-zinc-300 pb-1 text-[11px] font-bold uppercase tracking-wider text-zinc-700">
                Hiệu suất tổng
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <StatBox
                  label="Tổng giờ làm"
                  value={formatHours(lifetimeHours)}
                />
                <StatBox
                  label="Tổng thực lĩnh"
                  value={formatVND(lifetimePay)}
                />
                <StatBox
                  label="Số ngày đi làm"
                  value={String(daysWorked)}
                />
                <StatBox
                  label="Độ ổn định"
                  value={`${reliabilityPct}%`}
                  hint="(ngày làm / nhịp dự kiến)"
                />
              </div>
            </div>
          </div>

          <div className="col-span-2">
            <h2 className="mb-2 border-b border-zinc-300 pb-1 text-[11px] font-bold uppercase tracking-wider text-zinc-700">
              Huy hiệu thành tích ({earnedBadges.length})
            </h2>
            {earnedBadges.length === 0 ? (
              <p className="text-xs italic text-zinc-500">
                Chưa đạt huy hiệu nào.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {earnedBadges.map((key) => (
                  <AchievementBadge
                    key={key}
                    badgeKey={key}
                    earned
                    size="sm"
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Salary history */}
        {salaryHistory.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-2 border-b border-zinc-300 pb-1 text-[11px] font-bold uppercase tracking-wider text-zinc-700">
              Lịch sử điều chỉnh lương
            </h2>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-300 text-left text-[10px] uppercase tracking-wider text-zinc-600">
                  <th className="py-1.5 pr-3 font-semibold">Ngày</th>
                  <th className="py-1.5 pr-3 font-semibold">Mức cũ</th>
                  <th className="py-1.5 pr-3 font-semibold">Mức mới</th>
                  <th className="py-1.5 pr-3 font-semibold">Thay đổi</th>
                  <th className="py-1.5 font-semibold">Người duyệt</th>
                </tr>
              </thead>
              <tbody>
                {salaryHistory.slice(0, 8).map((c) => (
                  <tr key={c.id} className="border-b border-zinc-100">
                    <td className="py-1.5 pr-3 font-mono text-zinc-700">
                      {formatDate(c.changedAt)}
                    </td>
                    <td className="py-1.5 pr-3 text-zinc-700">
                      {formatVND(c.oldRate)}
                    </td>
                    <td className="py-1.5 pr-3 font-medium text-zinc-900">
                      {formatVND(c.newRate)}
                    </td>
                    <td
                      className={`py-1.5 pr-3 font-semibold ${c.deltaPct >= 0 ? "text-emerald-700" : "text-red-700"}`}
                    >
                      {c.deltaPct >= 0 ? "+" : ""}
                      {c.deltaPct}%
                    </td>
                    <td className="py-1.5 text-zinc-700">
                      {c.changedBy ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Notes preview */}
        <section className="mb-8">
          <h2 className="mb-2 border-b border-zinc-300 pb-1 text-[11px] font-bold uppercase tracking-wider text-zinc-700">
            Ghi chú nhân sự ({notesCount})
          </h2>
          {recentNotes.length === 0 ? (
            <p className="text-xs italic text-zinc-500">Chưa có ghi chú nào.</p>
          ) : (
            <div className="space-y-2">
              {recentNotes.map((n) => (
                <blockquote
                  key={n.id}
                  className="border-l-4 border-zinc-300 bg-zinc-50 px-3 py-2 text-xs"
                >
                  <p className="leading-snug text-zinc-800">
                    &ldquo;{n.content}&rdquo;
                  </p>
                  <p className="mt-1 text-[10px] text-zinc-500">
                    — {n.authorName} · {formatDateTime(n.createdAt)}
                  </p>
                </blockquote>
              ))}
            </div>
          )}
        </section>

        {/* Signature footer */}
        <footer className="mt-12 grid grid-cols-3 gap-8 text-xs">
          <SignatureLine label="Người lập" />
          <SignatureLine label="Phòng Nhân sự" />
          <SignatureLine label="Nhân viên" />
        </footer>

        <p className="mt-8 text-center text-[10px] text-zinc-400">
          Hồ sơ sinh tự động bởi Cafe HR · In ngày {issuedAt} · Tài liệu nội
          bộ
        </p>
      </main>

      <style>{`
        @page { size: A4 portrait; margin: 1cm; }
        @media print {
          .no-print { display: none !important; }
          .print-root { background: white !important; }
          body { background: white !important; }
          .cv-sheet { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="mt-0.5 break-words font-medium text-zinc-900">{value}</p>
    </div>
  );
}

function StatBox({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded border border-zinc-300 bg-zinc-50/50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-zinc-600">
        {label}
      </p>
      <p className="mt-0.5 text-base font-bold text-zinc-900">{value}</p>
      {hint ? (
        <p className="mt-0.5 text-[9px] italic text-zinc-500">{hint}</p>
      ) : null}
    </div>
  );
}

function SignatureLine({ label }: { label: string }) {
  return (
    <div className="text-center">
      <p className="mb-0.5 font-semibold text-zinc-700">{label}</p>
      <p className="text-[10px] italic text-zinc-500">(Ký và ghi rõ họ tên)</p>
      <div className="mt-16 border-t border-zinc-400" />
    </div>
  );
}
