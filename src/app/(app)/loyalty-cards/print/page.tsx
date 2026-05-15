import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft, Coffee } from "lucide-react";
import { getSession } from "@/lib/auth";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

const DEFAULT_COUNT = 24;
const MIN_COUNT = 1;
const MAX_COUNT = 200;
const CARDS_PER_PAGE = 4;
const STAMPS_PER_CARD = 10;

function clampCount(raw: string | undefined): number {
  if (!raw) return DEFAULT_COUNT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return DEFAULT_COUNT;
  return Math.max(MIN_COUNT, Math.min(MAX_COUNT, n));
}

function shortId(): string {
  return globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
}

export default async function LoyaltyCardsPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ count?: string }>;
}) {
  const sess = await getSession();
  if (!sess) redirect("/login");
  if (sess.role !== "admin") redirect("/");

  const sp = await searchParams;
  const count = clampCount(sp.count);

  const hdrs = await headers();
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "";
  const baseUrl = host ? `${proto}://${host}` : "";

  const cards: { id: string; qrSrc: string }[] = Array.from(
    { length: count },
    () => {
      const id = shortId();
      const target = `${baseUrl}/loyalty?card=${id}`;
      const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&margin=0&data=${encodeURIComponent(
        target,
      )}`;
      return { id, qrSrc };
    },
  );

  const totalPages = Math.ceil(count / CARDS_PER_PAGE);

  return (
    <div className="loyalty-cards-print-root min-h-screen bg-zinc-100 print:min-h-0 print:bg-white">
      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-background/95 px-6 py-3 backdrop-blur print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/loyalty"
            prefetch={false}
            className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent"
          >
            <ArrowLeft className="size-4" />
            Quay lại
          </Link>
          <p className="text-sm text-muted-foreground">
            Thẻ tích điểm · {count} thẻ · {totalPages} trang A4 · Ctrl/Cmd+P để in
          </p>
        </div>

        <form
          method="get"
          className="flex flex-wrap items-center gap-2 print:hidden"
        >
          <label
            htmlFor="count-input"
            className="text-xs font-medium text-muted-foreground"
          >
            Số lượng thẻ
          </label>
          <input
            id="count-input"
            name="count"
            type="number"
            min={MIN_COUNT}
            max={MAX_COUNT}
            defaultValue={count}
            className="h-9 w-24 rounded-md border bg-background px-2 text-sm tabular-nums"
          />
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-1 rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent"
          >
            Áp dụng
          </button>
          <PrintButton />
        </form>
      </div>

      <main className="mx-auto max-w-[210mm] px-4 py-6 print:max-w-none print:px-0 print:py-0">
        <section className="grid grid-cols-2 gap-2 print:gap-0">
          {cards.map((card, index) => {
            // Page break BEFORE card #5, #9, #13, … (every 4 cards)
            const isPageStart = index > 0 && index % CARDS_PER_PAGE === 0;
            return (
              <article
                key={card.id}
                className={`loyalty-card relative flex break-inside-avoid items-stretch gap-3 overflow-hidden rounded-md border border-dashed border-zinc-400 bg-white p-3 text-zinc-900 shadow-sm print:rounded-md print:shadow-none ${
                  isPageStart ? "card-page-break" : ""
                }`}
                style={{ minHeight: "60mm" }}
              >
                {/* LEFT region: brand + QR */}
                <div className="flex w-[30mm] shrink-0 flex-col items-center justify-between border-r border-dashed border-zinc-300 pr-2 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <Image
                      src="/brand/logo-48.png"
                      alt="Cafe HR"
                      width={32}
                      height={32}
                      className="rounded"
                    />
                    <p className="text-[8pt] font-bold uppercase tracking-wider text-amber-700">
                      Cafe HR
                    </p>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={card.qrSrc}
                    alt={`QR thẻ ${card.id}`}
                    width={50}
                    height={50}
                    className="rounded border border-zinc-200 bg-white"
                  />
                </div>

                {/* RIGHT region */}
                <div className="flex min-w-0 flex-1 flex-col">
                  <header className="mb-1 flex items-center justify-between">
                    <h2 className="text-sm font-bold tracking-tight text-zinc-900">
                      Thẻ tích điểm
                    </h2>
                    <span className="inline-flex items-center gap-1 text-[8pt] text-amber-700">
                      <Coffee className="size-3" />
                      Loyalty
                    </span>
                  </header>

                  {/* 10 stamp slots, 2 rows × 5 */}
                  <div className="mx-auto my-1 grid grid-cols-5 gap-1.5">
                    {Array.from({ length: STAMPS_PER_CARD }).map((_, i) => (
                      <div
                        key={i}
                        className="flex size-7 items-center justify-center rounded-full border border-zinc-300 bg-zinc-50 print:bg-white"
                        aria-label={`Ô đóng dấu ${i + 1}`}
                      >
                        <Coffee className="size-3.5 text-zinc-300" strokeWidth={1.5} />
                      </div>
                    ))}
                  </div>

                  <p className="mt-1 text-center text-[9pt] font-medium text-zinc-700">
                    Đủ 10 ly cà phê → tặng 1 ly miễn phí ☕
                  </p>

                  <p className="mt-auto pt-1 text-right font-mono text-[8pt] tracking-wider text-zinc-500">
                    Mã thẻ: {card.id}
                  </p>
                </div>
              </article>
            );
          })}
        </section>
      </main>

      <style>{`
        @page { size: A4 portrait; margin: 1cm; }
        @media print {
          html, body { background: white !important; }
          .no-print { display: none !important; }
          .loyalty-cards-print-root { background: white !important; }
          .loyalty-card { box-shadow: none !important; }
          .card-page-break { break-before: page; page-break-before: always; }
        }
      `}</style>
    </div>
  );
}
