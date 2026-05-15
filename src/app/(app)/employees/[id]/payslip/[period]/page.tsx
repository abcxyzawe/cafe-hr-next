import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  ROLE_LABELS,
  formatVND,
  formatHours,
  formatDate,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_DEDUCTION_CONFIG,
  VIETNAM_STANDARD_RATES,
  computeDeductions,
} from "@/lib/payroll-deductions";
import { PayslipPrintButton } from "./payslip-print-button";

export const dynamic = "force-dynamic";

type WeekRow = {
  index: number;
  fromIso: string;
  toIso: string;
  hours: number;
  gross: number;
};

type DeductionRow = {
  code: string;
  label: string;
  ratePct: number;
  amount: number;
  enabled: boolean;
};

export default async function PayslipPage({
  params,
}: {
  params: Promise<{ id: string; period: string }>;
}) {
  const { id: idStr, period } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    redirect(`/employees/${idStr}`);
  }
  if (!/^\d{4}-\d{2}$/.test(period)) {
    redirect(`/employees/${id}`);
  }

  const sess = await getSession();
  if (!sess) {
    redirect("/login");
  }

  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) {
    redirect(`/employees/${id}`);
  }

  // Authorization: admin can view anyone; staff only their own
  if (sess.role !== "admin") {
    const user = await prisma.user.findUnique({
      where: { id: sess.uid },
      select: { email: true },
    });
    if (
      !user ||
      !employee.email ||
      user.email.toLowerCase() !== employee.email.toLowerCase()
    ) {
      redirect("/");
    }
  }

  const [year, month] = period.split("-").map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  const [attendance, payrollSnapshot] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        employeeId: id,
        checkIn: { gte: monthStart, lt: monthEnd },
        checkOut: { not: null },
      },
      orderBy: { checkIn: "asc" },
      select: { checkIn: true, hoursWorked: true },
    }),
    prisma.payroll.findUnique({
      where: { employeeId_period: { employeeId: id, period } },
    }),
  ]);

  const rate = Number(employee.hourlyRate);

  const totalHours = attendance.reduce(
    (sum, a) => sum + Number(a.hoursWorked ?? 0),
    0,
  );
  const totalGross = totalHours * rate;

  // Build week buckets: weeks of the month (days 1-7, 8-14, …)
  const weeks: WeekRow[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  const weekBuckets = new Map<
    string,
    { fromDay: number; toDay: number; hours: number; gross: number }
  >();
  const ranges: Array<{ from: number; to: number }> = [];
  for (let from = 1; from <= daysInMonth; from += 7) {
    const to = Math.min(from + 6, daysInMonth);
    ranges.push({ from, to });
  }
  for (let i = 0; i < ranges.length; i++) {
    weekBuckets.set(`w${i + 1}`, {
      fromDay: ranges[i].from,
      toDay: ranges[i].to,
      hours: 0,
      gross: 0,
    });
  }

  for (const a of attendance) {
    const day = new Date(a.checkIn).getDate();
    const idx = Math.min(Math.floor((day - 1) / 7), ranges.length - 1);
    const key = `w${idx + 1}`;
    const bucket = weekBuckets.get(key);
    if (bucket) {
      const h = Number(a.hoursWorked ?? 0);
      bucket.hours += h;
      bucket.gross += h * rate;
    }
  }

  let weekIdx = 0;
  for (const [, b] of weekBuckets) {
    weekIdx++;
    weeks.push({
      index: weekIdx,
      fromIso: new Date(year, month - 1, b.fromDay).toISOString().slice(0, 10),
      toIso: new Date(year, month - 1, b.toDay).toISOString().slice(0, 10),
      hours: Number(b.hours.toFixed(2)),
      gross: Number(b.gross.toFixed(2)),
    });
  }

  const uniqueDays = new Set(
    attendance.map((a) => new Date(a.checkIn).toISOString().slice(0, 10)),
  );
  const workingDays = uniqueDays.size;

  // ---- Deductions: use defaults baked in (server can't read localStorage).
  // Show all three lines so the payslip is informative even when disabled.
  const deductionCfg = { ...DEFAULT_DEDUCTION_CONFIG };
  const deductions = computeDeductions(totalGross, deductionCfg);
  const deductionRows: DeductionRow[] = [
    {
      code: "BHXH",
      label: "Bảo hiểm xã hội",
      ratePct: deductionCfg.bhxhPct,
      amount: deductions.bhxh,
      enabled: deductionCfg.bhxhEnabled,
    },
    {
      code: "BHYT",
      label: "Bảo hiểm y tế",
      ratePct: deductionCfg.bhytPct,
      amount: deductions.bhyt,
      enabled: deductionCfg.bhytEnabled,
    },
    {
      code: "BHTN",
      label: "Bảo hiểm thất nghiệp",
      ratePct: deductionCfg.bhtnPct,
      amount: deductions.bhtn,
      enabled: deductionCfg.bhtnEnabled,
    },
  ];
  const standardTotalPct =
    VIETNAM_STANDARD_RATES.bhxhPct +
    VIETNAM_STANDARD_RATES.bhytPct +
    VIETNAM_STANDARD_RATES.bhtnPct;

  const issuedAt = formatDate(new Date());
  const issuedAtIso = new Date().toISOString();
  const periodFromLabel = formatDate(monthStart);
  const periodToLabel = formatDate(new Date(year, month, 0));
  const roleLabel = ROLE_LABELS[employee.role] ?? employee.role;
  const empCode = `#EMP-${String(employee.id).padStart(4, "0")}`;
  const hireDateLabel = formatDate(employee.createdAt);
  const snapshotPay = payrollSnapshot ? Number(payrollSnapshot.totalPay) : null;
  const snapshotHours = payrollSnapshot
    ? Number(payrollSnapshot.totalHours)
    : null;

  // Build absolute URL to this page for QR verification.
  // We use request headers so the URL respects the actual host (works in dev,
  // preview, and prod). Falls back to a relative path if headers are missing.
  const hdrs = await headers();
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "";
  const verifyPath = `/employees/${id}/payslip/${period}`;
  const verifyUrl = host ? `${proto}://${host}${verifyPath}` : verifyPath;

  // QR code: we render an <img> pointing at a public QR generator. We avoid
  // adding an npm dep (constraint) and avoid hand-rolling a QR encoder
  // (~500 lines). For purely-offline printing, swap this for a local encoder.
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=0&data=${encodeURIComponent(
    verifyUrl,
  )}`;

  return (
    <div className="payslip-root min-h-screen bg-zinc-100 print:bg-white">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background/95 px-6 py-3 backdrop-blur print:hidden">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href={`/employees/${id}`}>
              <ArrowLeft className="size-4" />
              Quay lại
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            Phiếu lương kỳ {period} — Ctrl/Cmd+P để in hoặc lưu PDF
          </p>
        </div>
        <PayslipPrintButton />
      </div>

      <main className="mx-auto my-6 max-w-3xl bg-white px-10 py-12 text-zinc-900 shadow-sm ring-1 ring-zinc-200 print:my-0 print:max-w-none print:px-0 print:py-0 print:shadow-none print:ring-0">
        {/* Branded header */}
        <header className="mb-8 flex items-start justify-between border-b-2 border-amber-700 pb-5">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/logo-96.png"
              alt="Cafe HR"
              width={56}
              height={56}
              className="rounded-md ring-1 ring-zinc-200"
              unoptimized
            />
            <div>
              <p className="text-xl font-bold tracking-tight text-zinc-900">
                Cafe HR
              </p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                Payroll & Attendance · Vietnam
              </p>
            </div>
          </div>
          <div className="text-right text-[11px] text-zinc-500">
            <p className="uppercase tracking-wider">Ngày xuất</p>
            <p className="font-mono text-sm font-medium text-zinc-900">
              {issuedAt}
            </p>
            <p className="mt-1 uppercase tracking-wider">Kỳ lương</p>
            <p className="font-mono text-sm font-medium text-zinc-900">
              {period}
            </p>
          </div>
        </header>

        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl font-bold tracking-tight text-zinc-900">
            PHIẾU LƯƠNG / PAYSLIP
          </h1>
          <p className="mt-1 text-xs uppercase tracking-[0.22em] text-zinc-500">
            Kỳ {periodFromLabel} – {periodToLabel}
          </p>
        </div>

        {/* Two-column: employee summary + earnings totals */}
        <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 print:grid-cols-2">
          <div className="rounded-md border border-zinc-300 bg-zinc-50/60 p-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Nhân viên
            </p>
            <div className="grid grid-cols-1 gap-y-2 text-sm">
              <Field label="Họ và tên" value={employee.name} bold />
              <Field label="Mã NV" value={empCode} mono />
              <Field label="Vai trò" value={roleLabel} />
              <Field label="Email" value={employee.email ?? "—"} mono />
              <Field label="Bắt đầu làm việc" value={hireDateLabel} />
            </div>
          </div>

          <div className="rounded-md border border-zinc-300 bg-zinc-50/60 p-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Tổng quan kỳ
            </p>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <Field label="Lương / giờ" value={formatVND(rate)} bold />
              <Field label="Số ngày làm" value={String(workingDays)} />
              <Field label="Tổng giờ" value={formatHours(totalHours)} bold />
              <Field label="Số tuần" value={String(weeks.length)} />
              <div className="col-span-2 mt-1 border-t border-zinc-300 pt-3">
                <p className="text-[11px] uppercase tracking-wider text-zinc-500">
                  Tổng lương gộp (gross)
                </p>
                <p className="mt-0.5 font-mono text-xl font-bold text-zinc-900">
                  {formatVND(totalGross)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Weekly breakdown */}
        <section className="mb-8">
          <h2 className="mb-3 border-b border-zinc-300 pb-1 text-sm font-bold uppercase tracking-wider text-zinc-700">
            Chi tiết theo tuần
          </h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-zinc-900 text-left">
                <th className="py-2 pr-2">Tuần</th>
                <th className="py-2 pr-2">Khoảng thời gian</th>
                <th className="py-2 pr-2 text-right">Số giờ</th>
                <th className="py-2 pr-2 text-right">Lương/giờ</th>
                <th className="py-2 text-right">Thực lĩnh</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w.index} className="border-b border-zinc-200">
                  <td className="py-2 pr-2 font-medium">Tuần {w.index}</td>
                  <td className="py-2 pr-2 font-mono text-xs text-zinc-600">
                    {formatDate(w.fromIso)} – {formatDate(w.toIso)}
                  </td>
                  <td className="py-2 pr-2 text-right">
                    {formatHours(w.hours)}
                  </td>
                  <td className="py-2 pr-2 text-right text-xs text-zinc-600">
                    {formatVND(rate)}
                  </td>
                  <td className="py-2 text-right font-medium">
                    {formatVND(w.gross)}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-zinc-900 font-bold">
                <td className="py-3 pr-2" colSpan={2}>
                  TỔNG CỘNG
                </td>
                <td className="py-3 pr-2 text-right">
                  {formatHours(totalHours)}
                </td>
                <td className="py-3 pr-2 text-right text-xs text-zinc-600">
                  —
                </td>
                <td className="py-3 text-right text-base">
                  {formatVND(totalGross)}
                </td>
              </tr>
            </tbody>
          </table>

          {snapshotPay !== null && snapshotHours !== null && (
            <p className="mt-3 text-xs italic text-zinc-500">
              Đã chốt sổ ngày {formatDate(payrollSnapshot!.generatedAt)}: số giờ{" "}
              {formatHours(snapshotHours)} · thực lĩnh{" "}
              <span className="font-medium text-zinc-700">
                {formatVND(snapshotPay)}
              </span>
              .
            </p>
          )}
        </section>

        {/* Deductions */}
        <section className="mb-8">
          <h2 className="mb-3 border-b border-zinc-300 pb-1 text-sm font-bold uppercase tracking-wider text-zinc-700">
            Khấu trừ bảo hiểm
          </h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-300 text-left text-xs uppercase tracking-wider text-zinc-500">
                <th className="py-2 pr-2">Mục</th>
                <th className="py-2 pr-2">Mô tả</th>
                <th className="py-2 pr-2 text-right">Tỷ lệ</th>
                <th className="py-2 pr-2 text-right">Trạng thái</th>
                <th className="py-2 text-right">Số tiền</th>
              </tr>
            </thead>
            <tbody>
              {deductionRows.map((row) => (
                <tr key={row.code} className="border-b border-zinc-200">
                  <td className="py-2 pr-2 font-mono font-medium text-zinc-800">
                    {row.code}
                  </td>
                  <td className="py-2 pr-2 text-zinc-700">{row.label}</td>
                  <td className="py-2 pr-2 text-right font-mono text-xs text-zinc-600">
                    {row.ratePct.toFixed(1)}%
                  </td>
                  <td className="py-2 pr-2 text-right text-xs">
                    {row.enabled ? (
                      <span className="text-emerald-700">Áp dụng</span>
                    ) : (
                      <span className="text-zinc-400">Không áp dụng</span>
                    )}
                  </td>
                  <td className="py-2 text-right font-medium">
                    {row.enabled ? formatVND(row.amount) : "—"}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-zinc-900 font-bold">
                <td className="py-3 pr-2" colSpan={4}>
                  Tổng khấu trừ
                </td>
                <td className="py-3 text-right">
                  {formatVND(deductions.totalDeductions)}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-[11px] italic text-zinc-500">
            Mức tham chiếu chuẩn Việt Nam: BHXH {VIETNAM_STANDARD_RATES.bhxhPct}
            % · BHYT {VIETNAM_STANDARD_RATES.bhytPct}% · BHTN{" "}
            {VIETNAM_STANDARD_RATES.bhtnPct}% (tổng {standardTotalPct}%). Cấu
            hình áp dụng có thể được điều chỉnh trong phần cài đặt bảng lương.
          </p>
        </section>

        {/* Net pay highlight */}
        <section className="mb-8 rounded-lg border-2 border-amber-700 bg-amber-50 p-6 print:bg-amber-50">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-800">
                Thực nhận (Net Pay)
              </p>
              <p className="mt-1 font-mono text-4xl font-bold tracking-tight text-amber-900">
                {formatVND(deductions.net)}
              </p>
              <p className="mt-1 text-xs text-amber-800/80">
                = Gross {formatVND(totalGross)} − Khấu trừ{" "}
                {formatVND(deductions.totalDeductions)}
              </p>
            </div>
            <div className="text-right text-xs text-amber-900/80">
              <p>{formatHours(totalHours)} làm việc</p>
              <p>{workingDays} ngày công</p>
              <p>{weeks.length} tuần</p>
            </div>
          </div>
        </section>

        {/* QR + signatures */}
        <section className="mt-12 grid grid-cols-3 gap-8 text-sm">
          <div className="text-center">
            <p className="mb-1 font-semibold text-zinc-700">Người lập</p>
            <p className="text-[11px] italic text-zinc-500">
              (Ký, ghi rõ họ tên)
            </p>
            <div className="mt-16 border-t border-zinc-400 pt-2" />
          </div>
          <div className="text-center">
            <p className="mb-1 font-semibold text-zinc-700">Người nhận</p>
            <p className="text-[11px] italic text-zinc-500">
              (Ký, ghi rõ họ tên)
            </p>
            <div className="mt-16 border-t border-zinc-400 pt-2" />
          </div>
          <div className="flex flex-col items-center justify-end text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrSrc}
              alt={`QR mã xác minh phiếu lương ${empCode} kỳ ${period}`}
              width={120}
              height={120}
              className="rounded border border-zinc-200 bg-white"
            />
            <p className="mt-2 text-[10px] uppercase tracking-wider text-zinc-500">
              Quét để xác minh
            </p>
            <p className="mt-0.5 break-all text-[9px] font-mono text-zinc-400">
              {verifyPath}
            </p>
          </div>
        </section>

        <footer className="mt-10 flex items-center justify-between border-t border-zinc-200 pt-3 text-[10px] text-zinc-400">
          <span>
            Tạo lúc{" "}
            <time dateTime={issuedAtIso} className="font-mono">
              {issuedAt}
            </time>
          </span>
          <span className="font-semibold tracking-wider text-zinc-500">
            CAFE HR
          </span>
        </footer>
      </main>

      <style>{`
        @media print {
          @page { size: A4; margin: 1.5cm; }
          html, body { background: white !important; }
          .no-print { display: none !important; }
          .payslip-root { background: white !important; }
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  value,
  bold,
  mono,
}: {
  label: string;
  value: string;
  bold?: boolean;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p
        className={`mt-0.5 text-zinc-900 ${bold ? "font-bold" : "font-medium"} ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
