import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft, ScanLine } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { CopyUrlButton } from "./copy-url-button";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "QR mở Kiosk — Cafe HR",
};

export default async function KioskQrPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "admin") redirect("/");

  const h = await headers();
  const host =
    h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const kioskUrl = `${proto}://${host}/kiosk`;

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&format=svg&data=${encodeURIComponent(
    kioskUrl,
  )}`;

  const issuedAt = formatDate(new Date());

  return (
    <div className="qr-root">
      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-background/95 px-6 py-3 backdrop-blur print:hidden">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/settings">
              <ArrowLeft className="size-4" />
              Quay lại
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            QR launcher — dán lên tường để nhân viên quét bằng điện thoại
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CopyUrlButton url={kioskUrl} />
          <PrintButton />
        </div>
      </div>

      <main className="mx-auto max-w-3xl bg-white px-10 py-12 text-zinc-900 print:max-w-none print:px-0 print:py-0">
        <header className="mb-10 flex items-center gap-4 border-b-2 border-zinc-900 pb-6">
          <Image
            src="/brand/logo-96.png"
            alt="Cafe HR"
            width={64}
            height={64}
            className="rounded-xl"
            unoptimized
            priority
          />
          <div>
            <p className="text-sm uppercase tracking-wider text-zinc-600">
              Cafe HR
            </p>
            <h1 className="font-serif text-3xl font-bold tracking-tight">
              Mở Kiosk Cafe HR
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Quét mã QR để mở trang chấm công kiosk trên thiết bị của bạn
            </p>
          </div>
        </header>

        <section className="flex flex-col items-center gap-6">
          <div className="rounded-3xl border-4 border-zinc-900 bg-white p-6 shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrSrc}
              alt={`QR mã mở ${kioskUrl}`}
              width={400}
              height={400}
              className="block h-[400px] w-[400px]"
            />
          </div>

          <div className="flex w-full max-w-xl flex-col items-center gap-2">
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              URL Kiosk
            </p>
            <p className="break-all text-center font-mono text-base font-semibold text-zinc-900">
              {kioskUrl}
            </p>
            <p className="text-xs italic text-zinc-500">
              Hoặc nhấn nút &quot;Sao chép URL&quot; phía trên rồi gửi cho nhân
              viên
            </p>
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-xl rounded-xl border-2 border-zinc-300 bg-zinc-50 p-6">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-700">
            <ScanLine className="size-4" />
            Hướng dẫn sử dụng
          </div>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-zinc-700">
            <li>Mở camera điện thoại</li>
            <li>Hướng máy ảnh vào mã QR ở trên</li>
            <li>Bấm vào đường link xuất hiện</li>
            <li>Chọn ảnh của bạn và nhập PIN để check-in / check-out</li>
          </ol>
        </section>

        <p className="mt-12 text-center text-[10px] text-zinc-400">
          In tự động bởi Cafe HR · {issuedAt}
        </p>
      </main>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 1.5cm; }
          body { background: white !important; }
          .no-print { display: none !important; }
          .qr-root { background: white !important; }
        }
      `}</style>
    </div>
  );
}
