import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft, Clock, Lightbulb } from "lucide-react";
import { getSession } from "@/lib/auth";
import { SOPS, SOP_CATEGORY_LABEL, type Sop } from "@/lib/sop-catalogue";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

const CATEGORY_CHIP: Record<Sop["category"], string> = {
  service: "border-sky-300 bg-sky-50 text-sky-800",
  cleaning: "border-emerald-300 bg-emerald-50 text-emerald-800",
  safety: "border-rose-300 bg-rose-50 text-rose-800",
  cash: "border-amber-300 bg-amber-50 text-amber-800",
};

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

export default async function SopPrintBookletPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");

  const generatedAt = formatDate(new Date());

  return (
    <div className="sop-print-root min-h-screen bg-zinc-100 print:min-h-0 print:bg-white">
      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-background/95 px-6 py-3 backdrop-blur print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/sop"
            prefetch={false}
            className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent"
          >
            <ArrowLeft className="size-4" />
            Quay lại thư viện
          </Link>
          <p className="text-sm text-muted-foreground">
            Sổ tay quy trình · {SOPS.length} SOP · A4 dọc · Ctrl/Cmd+P để in
          </p>
        </div>
        <PrintButton />
      </div>

      <main className="mx-auto max-w-[210mm] bg-white px-[1.2cm] py-[1.2cm] text-zinc-900 shadow-sm print:max-w-none print:px-0 print:py-0 print:shadow-none">
        {/* Branded header */}
        <header className="booklet-header flex items-center gap-4 border-b-2 border-amber-700 pb-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-amber-200 bg-amber-50">
            <Image
              src="/brand/logo-192.png"
              alt="Cafe HR"
              fill
              sizes="64px"
              className="object-contain"
              priority
            />
          </div>
          <div className="flex-1">
            <p className="text-[10pt] font-semibold uppercase tracking-[0.2em] text-amber-700">
              Cafe HR · Standard Operating Procedures
            </p>
            <h1 className="text-2xl font-extrabold leading-tight text-zinc-900">
              SỔ TAY QUY TRÌNH CAFE HR
            </h1>
            <p className="mt-1 text-[10pt] text-zinc-600">
              Bản tổng hợp toàn bộ SOP · Tạo ngày: {generatedAt}
            </p>
          </div>
        </header>

        {/* Table of contents */}
        <section className="mt-6 rounded-xl border border-zinc-300 bg-zinc-50 p-5 print:bg-white">
          <h2 className="text-lg font-bold text-zinc-900">Mục lục</h2>
          <p className="mt-1 text-[10pt] text-zinc-600">
            Tổng cộng {SOPS.length} quy trình tiêu chuẩn.
          </p>
          <ol className="mt-4 space-y-2">
            {SOPS.map((sop, idx) => {
              const chip = CATEGORY_CHIP[sop.category];
              return (
                <li key={sop.id} className="flex items-baseline gap-3 text-sm">
                  <span className="w-8 shrink-0 font-mono text-[10pt] font-semibold text-zinc-500">
                    #{String(idx + 1).padStart(2, "0")}
                  </span>
                  <a
                    href={`#sop-${sop.id}`}
                    className="flex-1 font-medium text-zinc-900 underline-offset-2 hover:underline print:no-underline"
                  >
                    {sop.title}
                  </a>
                  <span
                    className={`inline-block rounded-full border px-2 py-0.5 text-[9pt] font-medium ${chip}`}
                  >
                    {SOP_CATEGORY_LABEL[sop.category]}
                  </span>
                  <span className="w-20 shrink-0 text-right text-[10pt] tabular-nums text-zinc-600">
                    {sop.steps.length} bước
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        {/* SOP sections */}
        {SOPS.map((sop, idx) => {
          const chip = CATEGORY_CHIP[sop.category];
          return (
            <article
              key={sop.id}
              id={`sop-${sop.id}`}
              className="sop-section mt-8 pt-2"
            >
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[11pt] font-bold text-amber-700">
                  #{String(idx + 1).padStart(2, "0")}
                </span>
                <h2 className="flex-1 text-2xl font-extrabold leading-tight text-zinc-900">
                  {sop.title}
                </h2>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-block rounded-full border px-2.5 py-0.5 text-[10pt] font-medium ${chip}`}
                >
                  {SOP_CATEGORY_LABEL[sop.category]}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-zinc-50 px-2.5 py-0.5 text-[10pt] font-medium text-zinc-700">
                  <Clock className="size-3.5" />
                  {sop.estimatedMinutes} phút
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-zinc-50 px-2.5 py-0.5 text-[10pt] font-medium text-zinc-700">
                  {sop.steps.length} bước
                </span>
              </div>

              <p className="mt-3 text-[11pt] italic leading-relaxed text-zinc-700">
                {sop.description}
              </p>

              <h3 className="mt-5 border-b border-zinc-300 pb-1 text-base font-bold text-zinc-900">
                Các bước thực hiện
              </h3>
              <ol className="mt-3 space-y-2">
                {sop.steps.map((step, stepIdx) => {
                  const stepNo = stepIdx + 1;
                  if (step.warning) {
                    return (
                      <li
                        key={stepIdx}
                        className="flex gap-3 break-inside-avoid rounded-md border border-amber-300 bg-amber-50 p-3 text-[11pt] leading-relaxed text-amber-900"
                      >
                        <span className="font-mono font-bold text-amber-800">
                          {String(stepNo).padStart(2, "0")}.
                        </span>
                        <div className="flex-1">
                          <div className="mb-1 inline-flex items-center gap-1 text-[9pt] font-bold uppercase tracking-wider text-amber-700">
                            <AlertTriangle className="size-3" />
                            Lưu ý quan trọng
                          </div>
                          <p>{step.text}</p>
                        </div>
                      </li>
                    );
                  }
                  return (
                    <li
                      key={stepIdx}
                      className="flex gap-3 break-inside-avoid text-[11pt] leading-relaxed text-zinc-800"
                    >
                      <span className="w-7 shrink-0 font-mono font-bold text-zinc-500">
                        {String(stepNo).padStart(2, "0")}.
                      </span>
                      <p className="flex-1">{step.text}</p>
                    </li>
                  );
                })}
              </ol>

              {sop.tips && sop.tips.length > 0 ? (
                <div className="mt-5 break-inside-avoid rounded-md border border-emerald-300 bg-emerald-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                    <Lightbulb className="size-4" />
                    Mẹo & lưu ý chung
                  </div>
                  <ul className="mt-2 space-y-1 text-[10.5pt] leading-relaxed text-emerald-900">
                    {sop.tips.map((tip, tipIdx) => (
                      <li key={tipIdx} className="flex gap-2">
                        <span className="text-emerald-600">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </article>
          );
        })}

        {/* Signature footer */}
        <section className="signature-block mt-12 break-inside-avoid border-t-2 border-zinc-300 pt-6">
          <p className="text-center text-[10pt] italic text-zinc-600">
            Sổ tay này là tài liệu nội bộ. Mọi thay đổi phải được người duyệt
            xác nhận bằng chữ ký.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-12">
            <div className="text-center">
              <p className="text-[10pt] font-semibold uppercase tracking-wider text-zinc-700">
                Người duyệt
              </p>
              <div className="mt-16 border-t border-zinc-400 pt-2 text-[10pt] text-zinc-600">
                (Ký, ghi rõ họ tên)
              </div>
            </div>
            <div className="text-center">
              <p className="text-[10pt] font-semibold uppercase tracking-wider text-zinc-700">
                Ngày duyệt
              </p>
              <div className="mt-16 border-t border-zinc-400 pt-2 text-[10pt] text-zinc-600">
                ____ / ____ / ________
              </div>
            </div>
          </div>
          <p className="mt-8 text-center text-[9pt] text-zinc-500">
            © Cafe HR · Tài liệu được tạo tự động ngày {generatedAt}
          </p>
        </section>
      </main>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 1.2cm; }
          html, body { background: white !important; }
          .no-print { display: none !important; }
          .sop-print-root { background: white !important; }
          /* Page break before each SOP — but skip the very first */
          .sop-section { break-before: page; page-break-before: always; }
          .sop-section:first-of-type { break-before: auto; page-break-before: auto; }
          .signature-block { break-before: page; page-break-before: always; }
        }
      `}</style>
    </div>
  );
}
