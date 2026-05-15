import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS, formatVND, formatHours, formatDateTime } from "@/lib/utils";
import {
  DEFAULT_DEDUCTION_CONFIG,
  VIETNAM_STANDARD_RATES,
  computeDeductions,
  type DeductionConfig,
} from "@/lib/payroll-deductions";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

type PayrollRow = {
  id: number;
  name: string;
  role: string;
  hours: number;
  rate: number;
  gross: number;
  bhxh: number;
  bhyt: number;
  bhtn: number;
  totalDeductions: number;
  net: number;
};

export default async function PrintPayrollPage({
  params,
}: {
  params: Promise<{ period: string }>;
}) {
  const { period } = await params;
  if (!/^\d{4}-\d{2}$/.test(period)) notFound();

  const [year, month] = period.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const employees = await prisma.employee.findMany({ orderBy: { id: "asc" } });
  const attendance = await prisma.attendance.findMany({
    where: { checkIn: { gte: start, lt: end }, checkOut: { not: null } },
    select: { employeeId: true, hoursWorked: true },
  });

  const hoursByEmp = new Map<number, number>();
  for (const a of attendance) {
    hoursByEmp.set(
      a.employeeId,
      (hoursByEmp.get(a.employeeId) ?? 0) + Number(a.hoursWorked ?? 0),
    );
  }

  // Server cannot read localStorage; use Vietnam standard rates with all enabled
  // for the printed report so deductions are visible by default.
  const reportConfig: DeductionConfig = {
    ...DEFAULT_DEDUCTION_CONFIG,
    bhxhEnabled: true,
    bhxhPct: VIETNAM_STANDARD_RATES.bhxhPct,
    bhytEnabled: true,
    bhytPct: VIETNAM_STANDARD_RATES.bhytPct,
    bhtnEnabled: true,
    bhtnPct: VIETNAM_STANDARD_RATES.bhtnPct,
  };

  let totalHours = 0;
  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;

  const rows: PayrollRow[] = employees.map((e) => {
    const hours = Number((hoursByEmp.get(e.id) ?? 0).toFixed(2));
    const rate = Number(e.hourlyRate);
    const gross = Math.round(hours * rate);
    const d = computeDeductions(gross, reportConfig);
    totalHours += hours;
    totalGross += gross;
    totalDeductions += d.totalDeductions;
    totalNet += d.net;
    return {
      id: e.id,
      name: e.name,
      role: e.role,
      hours,
      rate,
      gross,
      bhxh: d.bhxh,
      bhyt: d.bhyt,
      bhtn: d.bhtn,
      totalDeductions: d.totalDeductions,
      net: d.net,
    };
  });

  const generatedAt = new Date();

  return (
    <div className="print-root min-h-screen bg-zinc-100">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background/95 px-6 py-3 backdrop-blur print:hidden">
        <p className="text-sm text-muted-foreground">
          Trang in — Ctrl/Cmd+P để in hoặc lưu PDF
        </p>
        <PrintButton />
      </div>

      <main className="report mx-auto my-6 max-w-[210mm] bg-white px-10 py-10 text-zinc-900 shadow-lg print:my-0 print:max-w-none print:px-0 print:py-0 print:shadow-none">
        {/* Branded header */}
        <header className="mb-6 flex items-start justify-between gap-6 border-b-2 border-zinc-900 pb-5">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/logo-48.png"
              alt="Cafe HR"
              width={48}
              height={48}
              className="rounded"
              priority
            />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Cafe HR · Hệ thống quản lý nhân sự
              </p>
              <h1 className="text-2xl font-bold tracking-tight">
                BÁO CÁO LƯƠNG · Tháng {String(month).padStart(2, "0")}/{year}
              </h1>
              <p className="text-xs text-zinc-600">
                Kỳ thanh toán: {start.toLocaleDateString("vi-VN")} —{" "}
                {new Date(end.getTime() - 1).toLocaleDateString("vi-VN")}
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-zinc-600">
            <p className="uppercase tracking-wide">Xuất lúc</p>
            <p className="font-mono text-zinc-900">{formatDateTime(generatedAt)}</p>
            <p className="mt-1 text-[10px] text-zinc-500">Mã kỳ: {period}</p>
          </div>
        </header>

        {/* Summary card: 5 stat tiles */}
        <section className="mb-6 grid grid-cols-5 gap-2 rounded-md border border-zinc-300 bg-zinc-50 p-3 print:bg-white">
          <Stat label="Nhân viên" value={String(employees.length)} />
          <Stat label="Tổng giờ" value={formatHours(totalHours)} />
          <Stat label="Lương gộp" value={formatVND(totalGross)} />
          <Stat label="Khấu trừ" value={formatVND(totalDeductions)} tone="warn" />
          <Stat label="Thực lĩnh" value={formatVND(totalNet)} tone="ok" />
        </section>

        {/* Main table */}
        <section className="mb-6 break-inside-avoid">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-700">
            Chi tiết theo nhân viên
          </h2>
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b-2 border-zinc-900 bg-zinc-100 text-left">
                <th className="px-2 py-2">STT</th>
                <th className="px-2 py-2">Họ tên</th>
                <th className="px-2 py-2">Vai trò</th>
                <th className="px-2 py-2 text-right">Giờ</th>
                <th className="px-2 py-2 text-right">Lương gộp</th>
                <th className="px-2 py-2 text-right">Khấu trừ</th>
                <th className="px-2 py-2 text-right">Thực lĩnh</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-6 text-center italic text-zinc-500"
                  >
                    Không có dữ liệu nhân viên trong kỳ.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr
                    key={r.id}
                    className="border-b border-zinc-200 break-inside-avoid"
                  >
                    <td className="px-2 py-1.5 text-zinc-500">{i + 1}</td>
                    <td className="px-2 py-1.5 font-medium">{r.name}</td>
                    <td className="px-2 py-1.5 text-zinc-700">
                      {ROLE_LABELS[r.role] ?? r.role}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {formatHours(r.hours)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {formatVND(r.gross)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-rose-700">
                      {formatVND(r.totalDeductions)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-semibold tabular-nums">
                      {formatVND(r.net)}
                    </td>
                  </tr>
                ))
              )}
              <tr className="border-t-2 border-zinc-900 bg-zinc-100 font-bold">
                <td colSpan={3} className="px-2 py-2 text-right uppercase tracking-wide">
                  Tổng cộng
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {formatHours(totalHours)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {formatVND(totalGross)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-rose-700">
                  {formatVND(totalDeductions)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {formatVND(totalNet)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Deductions detail / reference */}
        <section className="mb-6 break-inside-avoid">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-700">
            Chi tiết khấu trừ theo chuẩn Việt Nam
          </h2>
          <div className="grid grid-cols-[1fr_1fr] gap-4">
            <div className="rounded-md border border-zinc-300 p-3 text-[11px]">
              <p className="mb-2 font-semibold text-zinc-700">Tỷ lệ áp dụng</p>
              <ul className="space-y-1">
                <li className="flex justify-between">
                  <span>BHXH (Bảo hiểm xã hội)</span>
                  <span className="font-mono">
                    {VIETNAM_STANDARD_RATES.bhxhPct.toFixed(1)}%
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>BHYT (Bảo hiểm y tế)</span>
                  <span className="font-mono">
                    {VIETNAM_STANDARD_RATES.bhytPct.toFixed(1)}%
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>BHTN (Bảo hiểm thất nghiệp)</span>
                  <span className="font-mono">
                    {VIETNAM_STANDARD_RATES.bhtnPct.toFixed(1)}%
                  </span>
                </li>
                <li className="mt-2 flex justify-between border-t border-zinc-200 pt-1 font-semibold">
                  <span>Tổng cộng</span>
                  <span className="font-mono">
                    {(
                      VIETNAM_STANDARD_RATES.bhxhPct +
                      VIETNAM_STANDARD_RATES.bhytPct +
                      VIETNAM_STANDARD_RATES.bhtnPct
                    ).toFixed(1)}
                    %
                  </span>
                </li>
              </ul>
            </div>
            <div className="rounded-md border border-zinc-300 p-3 text-[11px]">
              <p className="mb-2 font-semibold text-zinc-700">Phân bổ kỳ này</p>
              <ul className="space-y-1">
                <li className="flex justify-between">
                  <span>BHXH</span>
                  <span className="font-mono">
                    {formatVND(rows.reduce((s, r) => s + r.bhxh, 0))}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>BHYT</span>
                  <span className="font-mono">
                    {formatVND(rows.reduce((s, r) => s + r.bhyt, 0))}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>BHTN</span>
                  <span className="font-mono">
                    {formatVND(rows.reduce((s, r) => s + r.bhtn, 0))}
                  </span>
                </li>
                <li className="mt-2 flex justify-between border-t border-zinc-200 pt-1 font-semibold">
                  <span>Tổng khấu trừ</span>
                  <span className="font-mono">{formatVND(totalDeductions)}</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Signatures */}
        <footer className="mt-12 grid grid-cols-3 gap-8 break-inside-avoid text-[12px]">
          <SignatureBlock title="Người lập" />
          <SignatureBlock title="Quản lý duyệt" />
          <SignatureBlock title="Kế toán" />
        </footer>

        <p className="mt-8 text-center text-[10px] text-zinc-400">
          Báo cáo được sinh tự động bởi Cafe HR · {formatDateTime(generatedAt)}
        </p>
      </main>

      <style>{`
        @page { size: A4 portrait; margin: 1.2cm; }
        @media print {
          html, body { background: white !important; }
          .no-print { display: none !important; }
          .print-root { background: white !important; }
          .report { box-shadow: none !important; margin: 0 !important; }
          tr, section, footer { page-break-inside: avoid; break-inside: avoid; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
        }
      `}</style>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
}) {
  const toneClass =
    tone === "ok"
      ? "text-emerald-700"
      : tone === "warn"
        ? "text-rose-700"
        : "text-zinc-900";
  return (
    <div className="rounded border border-zinc-200 bg-white p-2">
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-1 truncate text-sm font-bold tabular-nums ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}

function SignatureBlock({ title }: { title: string }) {
  return (
    <div className="text-center">
      <p className="mb-0.5 font-semibold text-zinc-800">{title}</p>
      <p className="text-[10px] italic text-zinc-500">(Ký và ghi rõ họ tên)</p>
      <div className="mt-16 border-t border-zinc-400" />
      <p className="mt-1 text-[10px] text-zinc-500">Ngày ____ / ____ / ______</p>
    </div>
  );
}
