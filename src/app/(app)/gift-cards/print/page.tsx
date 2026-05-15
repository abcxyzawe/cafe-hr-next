import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft, Gift } from "lucide-react";
import { getSession } from "@/lib/auth";
import { formatVND } from "@/lib/utils";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

const DEFAULT_COUNT = 20;
const MIN_COUNT = 1;
const MAX_COUNT = 200;

const DEFAULT_AMOUNT = 100_000;
const MIN_AMOUNT = 10_000;
const MAX_AMOUNT = 5_000_000;

const CARDS_PER_PAGE = 4;

function clampInt(
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function shortHexId(): string {
  return globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
}

type GiftCard = {
  id: string;
  code: string;
  qrSrc: string;
};

export default async function GiftCardsPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ count?: string; amount?: string }>;
}) {
  const sess = await getSession();
  if (!sess) redirect("/login");
  if (sess.role !== "admin") redirect("/");

  const sp = await searchParams;
  const count = clampInt(sp.count, DEFAULT_COUNT, MIN_COUNT, MAX_COUNT);
  const amount = clampInt(sp.amount, DEFAULT_AMOUNT, MIN_AMOUNT, MAX_AMOUNT);

  const hdrs = await headers();
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "";
  const baseUrl = host ? `${proto}://${host}` : "";

  const cards: GiftCard[] = Array.from({ length: count }, () => {
    const id = shortHexId();
    const code = `GC-${id}`;
    const target = `${baseUrl}/loyalty?gift=${code}`;
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&data=${encodeURIComponent(
      target,
    )}`;
    return { id, code, qrSrc };
  });

  const totalPages = Math.ceil(count / CARDS_PER_PAGE);

  return (
    <div className="gift-cards-print-root min-h-screen bg-zinc-100 print:min-h-0 print:bg-white">
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
            {count} thẻ × {formatVND(amount)} · {totalPages} trang A4 · Ctrl/Cmd+P để in
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
            Số lượng
          </label>
          <input
            id="count-input"
            name="count"
            type="number"
            min={MIN_COUNT}
            max={MAX_COUNT}
            defaultValue={count}
            className="h-9 w-20 rounded-md border bg-background px-2 text-sm tabular-nums"
          />
          <label
            htmlFor="amount-input"
            className="text-xs font-medium text-muted-foreground"
          >
            Mệnh giá (VND)
          </label>
          <input
            id="amount-input"
            name="amount"
            type="number"
            min={MIN_AMOUNT}
            max={MAX_AMOUNT}
            step={10_000}
            defaultValue={amount}
            className="h-9 w-32 rounded-md border bg-background px-2 text-sm tabular-nums"
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
            const isPageStart = index > 0 && index % CARDS_PER_PAGE === 0;
            return (
              <article
                key={card.id}
                className={`gift-card relative flex break-inside-avoid flex-col overflow-hidden rounded-lg border border-dashed border-amber-700/60 bg-gradient-to-br from-amber-50 via-white to-amber-100 p-3 text-zinc-900 shadow-sm print:rounded-lg print:shadow-none ${
                  isPageStart ? "card-page-break" : ""
                }`}
                style={{ minHeight: "55mm" }}
              >
                <div className="flex flex-1 items-stretch gap-2">
                  {/* LEFT region: brand */}
                  <div className="flex w-[28mm] shrink-0 flex-col items-center justify-center gap-1 border-r border-dashed border-amber-700/40 pr-2 text-center">
                    <Image
                      src="/brand/logo-48.png"
                      alt="Cafe HR"
                      width={36}
                      height={36}
                      className="rounded"
                    />
                    <p className="text-[9pt] font-bold uppercase tracking-wider text-amber-800">
                      Cafe HR
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-600/50 bg-amber-100 px-2 py-0.5 text-[7pt] font-semibold uppercase tracking-wide text-amber-800">
                      <Gift className="size-2.5" />
                      Gift Card
                    </span>
                  </div>

                  {/* CENTER region: huge amount */}
                  <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-1 text-center">
                    <p className="text-[8pt] font-medium uppercase tracking-[0.2em] text-amber-800/80">
                      Mệnh giá
                    </p>
                    <p
                      className="font-serif text-2xl font-extrabold leading-none tracking-tight text-amber-900"
                      style={{ fontSize: "22pt" }}
                    >
                      {amount.toLocaleString("vi-VN")}
                    </p>
                    <p className="mt-0.5 text-[9pt] font-semibold tracking-wide text-amber-800">
                      VND
                    </p>
                  </div>

                  {/* RIGHT region: QR */}
                  <div className="flex w-[24mm] shrink-0 flex-col items-center justify-center gap-1 border-l border-dashed border-amber-700/40 pl-2 text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={card.qrSrc}
                      alt={`QR thẻ ${card.code}`}
                      width={70}
                      height={70}
                      className="rounded border border-amber-700/30 bg-white"
                    />
                    <p className="text-[7pt] text-zinc-700">Quét để dùng</p>
                  </div>
                </div>

                <footer className="mt-1 flex items-center justify-between border-t border-dashed border-amber-700/30 pt-1 text-[8pt]">
                  <span className="italic text-zinc-600">
                    Hiệu lực 12 tháng kể từ ngày phát hành
                  </span>
                  <span className="font-mono font-semibold tracking-wider text-amber-900">
                    Mã: {card.code}
                  </span>
                </footer>
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
          .gift-cards-print-root { background: white !important; }
          .gift-card { box-shadow: none !important; }
          .card-page-break { break-before: page; page-break-before: always; }
        }
      `}</style>
    </div>
  );
}
