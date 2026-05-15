"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Wrench } from "lucide-react";
import { EQUIPMENT_ITEMS, type EquipmentItem } from "@/lib/equipment-presets";
import {
  EQUIPMENT_EVENT,
  daysSince,
  getEquipmentState,
  statusFor,
  type EquipmentRecord,
  type EquipmentState,
} from "@/lib/equipment-state";
import { PrintButton } from "./print-button";

type Status = "ok" | "due-soon" | "overdue" | "never-serviced";

type Row = {
  item: EquipmentItem;
  record: EquipmentRecord | undefined;
  status: Status;
  daysSinceLast: number | null;
  sortKey: number;
};

const STATUS_PRIORITY: Record<Status, number> = {
  overdue: 0,
  "never-serviced": 1,
  "due-soon": 2,
  ok: 3,
};

const STATUS_LABEL: Record<Status, string> = {
  overdue: "Quá hạn",
  "never-serviced": "Chưa bảo dưỡng",
  "due-soon": "Sắp đến hạn",
  ok: "Đúng lịch",
};

const STATUS_CLASS: Record<Status, string> = {
  overdue: "border-rose-300 bg-rose-50 text-rose-800",
  "never-serviced": "border-zinc-300 bg-zinc-100 text-zinc-700",
  "due-soon": "border-amber-300 bg-amber-50 text-amber-800",
  ok: "border-emerald-300 bg-emerald-50 text-emerald-800",
};

const CATEGORY_LABEL: Record<EquipmentItem["category"], string> = {
  machine: "Máy móc",
  appliance: "Thiết bị",
  furniture: "Nội thất",
  tool: "Dụng cụ",
};

const CATEGORY_CLASS: Record<EquipmentItem["category"], string> = {
  machine: "border-indigo-300 bg-indigo-50 text-indigo-800",
  appliance: "border-sky-300 bg-sky-50 text-sky-800",
  furniture: "border-violet-300 bg-violet-50 text-violet-800",
  tool: "border-orange-300 bg-orange-50 text-orange-800",
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatIsoDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function formatNow(d: Date): string {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function buildRows(state: EquipmentState): Row[] {
  const rows: Row[] = EQUIPMENT_ITEMS.map((item) => {
    const record = state[item.id];
    const status = statusFor(record, item.intervalDays);
    const since = record ? daysSince(record.lastServiced) : null;
    const daysSinceLast =
      since === null || !Number.isFinite(since) ? null : since;
    return {
      item,
      record,
      status,
      daysSinceLast,
      sortKey: STATUS_PRIORITY[status],
    };
  });

  rows.sort((a, b) => {
    if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
    return a.item.name.localeCompare(b.item.name, "vi");
  });

  return rows;
}

export function EquipmentPrintBoard(): React.ReactElement {
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<EquipmentState>({});

  useEffect(() => {
    setState(getEquipmentState());
    setHydrated(true);
    const onChange = (): void => setState(getEquipmentState());
    window.addEventListener(EQUIPMENT_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EQUIPMENT_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const rows = useMemo(() => buildRows(state), [state]);

  const summary = useMemo(() => {
    const out: Record<Status, number> = {
      overdue: 0,
      "never-serviced": 0,
      "due-soon": 0,
      ok: 0,
    };
    for (const r of rows) out[r.status] += 1;
    return out;
  }, [rows]);

  const now = useMemo(() => new Date(), []);
  const generatedAt = formatNow(now);

  return (
    <div className="equipment-print-root min-h-screen bg-zinc-100 print:min-h-0 print:bg-white">
      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-background/95 px-6 py-3 backdrop-blur print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/equipment"
            prefetch={false}
            className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent"
          >
            <ChevronLeft className="size-4" />
            Quay lại
          </Link>
          <p className="text-sm text-muted-foreground">
            Nhật ký bảo trì · A4 dọc · Ctrl/Cmd+P để in
          </p>
        </div>
        <PrintButton />
      </div>

      <main className="mx-auto max-w-[210mm] px-4 py-6 text-zinc-900 print:max-w-none print:px-0 print:py-0">
        <article className="page-sheet rounded-lg bg-white p-6 shadow-sm print:rounded-none print:p-0 print:shadow-none">
          <header className="mb-5 flex items-center justify-between gap-4 border-b-2 border-amber-500/70 pb-3">
            <div className="flex items-center gap-3">
              <Image
                src="/brand/logo-96.png"
                alt="Cafe HR"
                width={56}
                height={56}
                className="rounded-lg"
                priority
              />
              <div>
                <p className="text-[10pt] font-semibold uppercase tracking-[0.25em] text-amber-700">
                  Cafe HR
                </p>
                <h1 className="font-serif text-2xl font-extrabold leading-tight tracking-tight text-zinc-900">
                  NHẬT KÝ BẢO TRÌ THIẾT BỊ
                </h1>
              </div>
            </div>
            <div className="text-right text-[9pt] text-zinc-600">
              <div className="flex items-center justify-end gap-1 text-amber-700">
                <Wrench className="size-4" />
                <span className="font-medium">Báo cáo nội bộ</span>
              </div>
              <p className="mt-1">
                Lập lúc:{" "}
                <span className="font-semibold">
                  {hydrated ? generatedAt : "—"}
                </span>
              </p>
              <p>
                Tổng thiết bị:{" "}
                <span className="font-semibold">{EQUIPMENT_ITEMS.length}</span>
              </p>
            </div>
          </header>

          {!hydrated ? (
            <SkeletonTable />
          ) : (
            <>
              <table className="w-full table-fixed border-collapse text-[9.5pt]">
                <colgroup>
                  <col className="w-[6%]" />
                  <col className="w-[24%]" />
                  <col className="w-[10%]" />
                  <col className="w-[13%]" />
                  <col className="w-[10%]" />
                  <col className="w-[14%]" />
                  <col className="w-[23%]" />
                </colgroup>
                <thead>
                  <tr className="border-b-2 border-zinc-700 bg-zinc-100 text-left text-[8.5pt] uppercase tracking-wider text-zinc-700">
                    <th className="px-2 py-2">#</th>
                    <th className="px-2 py-2">Thiết bị</th>
                    <th className="px-2 py-2 text-center">Chu kỳ (ngày)</th>
                    <th className="px-2 py-2">Lần gần nhất</th>
                    <th className="px-2 py-2 text-center">Đã (ngày)</th>
                    <th className="px-2 py-2">Trạng thái</th>
                    <th className="px-2 py-2">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr
                      key={row.item.id}
                      className="border-b border-zinc-200 align-top"
                    >
                      <td className="px-2 py-2 text-zinc-500">{idx + 1}</td>
                      <td className="px-2 py-2">
                        <div className="font-semibold text-zinc-900">
                          {row.item.name}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          <span
                            className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[7.5pt] font-medium ${CATEGORY_CLASS[row.item.category]}`}
                          >
                            {CATEGORY_LABEL[row.item.category]}
                          </span>
                          <span className="text-[8pt] italic text-zinc-500">
                            {row.item.description}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center font-medium text-zinc-800">
                        {row.item.intervalDays}
                      </td>
                      <td className="px-2 py-2 text-zinc-800">
                        {row.record ? (
                          formatIsoDate(row.record.lastServiced)
                        ) : (
                          <span className="italic text-zinc-500">
                            Chưa bảo dưỡng
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center text-zinc-800">
                        {row.daysSinceLast === null ? "-" : row.daysSinceLast}
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[8pt] font-semibold ${STATUS_CLASS[row.status]}`}
                        >
                          {STATUS_LABEL[row.status]}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-[8.5pt] text-zinc-700">
                        {row.record && row.record.notes ? (
                          row.record.notes
                        ) : (
                          <span className="italic text-zinc-400">
                            (Không có)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-zinc-700 bg-zinc-50 text-[8.5pt] font-semibold text-zinc-800">
                    <td className="px-2 py-2" colSpan={5}>
                      Tổng kết theo trạng thái
                    </td>
                    <td className="px-2 py-2" colSpan={2}>
                      <div className="flex flex-wrap gap-2">
                        <SummaryChip status="overdue" count={summary.overdue} />
                        <SummaryChip
                          status="never-serviced"
                          count={summary["never-serviced"]}
                        />
                        <SummaryChip
                          status="due-soon"
                          count={summary["due-soon"]}
                        />
                        <SummaryChip status="ok" count={summary.ok} />
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>

              <section className="mt-10 grid grid-cols-2 gap-8 text-[9pt] text-zinc-700">
                <SignatureLine label="Người kiểm" />
                <SignatureLine label="Quản lý" />
              </section>
            </>
          )}

          <footer className="mt-6 flex items-center justify-between border-t border-zinc-200 pt-2 text-[8pt] text-zinc-500">
            <span className="italic">
              In bởi Cafe HR · {hydrated ? generatedAt : ""}
            </span>
            <span>
              Dữ liệu lưu cục bộ (localStorage: cafe-hr-equipment)
            </span>
          </footer>
        </article>
      </main>

      <style>{`
        @page { size: A4 portrait; margin: 1.2cm; }
        @media print {
          html, body { background: white !important; }
          .no-print { display: none !important; }
          .equipment-print-root { background: white !important; }
          .page-sheet { box-shadow: none !important; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
        }
      `}</style>
    </div>
  );
}

function SummaryChip({
  status,
  count,
}: {
  status: Status;
  count: number;
}): React.ReactElement {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[8pt] font-semibold ${STATUS_CLASS[status]}`}
    >
      {STATUS_LABEL[status]}
      <span className="rounded bg-white/70 px-1 text-zinc-800">{count}</span>
    </span>
  );
}

function SignatureLine({ label }: { label: string }): React.ReactElement {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="italic text-zinc-500">
        ({label} ký tên & ghi rõ họ tên)
      </span>
      <div className="mt-12 w-full border-t border-zinc-400" />
      <span className="font-semibold uppercase tracking-wider text-zinc-700">
        {label}
      </span>
    </div>
  );
}

function SkeletonTable(): React.ReactElement {
  const rows = [0, 1, 2, 3, 4, 5, 6, 7];
  return (
    <div className="space-y-2">
      <div className="h-8 w-full animate-pulse rounded bg-zinc-200" />
      {rows.map((i) => (
        <div key={i} className="h-10 w-full animate-pulse rounded bg-zinc-100" />
      ))}
    </div>
  );
}
