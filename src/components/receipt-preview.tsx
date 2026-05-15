import { cn } from "@/lib/utils";

export type ReceiptItem = {
  name: string;
  qty: number;
  unitPriceVnd: number;
};

export type ReceiptPreviewProps = {
  shopName?: string;
  shopAddress?: string;
  shopPhone?: string;
  items: ReceiptItem[];
  /** VND value of any discount applied to the subtotal. */
  discountVnd?: number;
  /** Tip amount (VND). */
  tipVnd?: number;
  /** ISO timestamp of the receipt; defaults to now() at render time. */
  issuedAt?: Date;
  /** Free-text footer (eg. promo code, thank-you message). */
  footerNote?: string;
  /** Optional invoice/order id. */
  invoiceCode?: string;
  className?: string;
};

function formatVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.round(n)));
}

function pad(s: string, n: number, char = " "): string {
  return s.length >= n ? s : s + char.repeat(n - s.length);
}

export function ReceiptPreview({
  shopName = "CAFE HR",
  shopAddress = "123 Đường Cà Phê, Hà Nội",
  shopPhone = "(024) 1234-5678",
  items,
  discountVnd = 0,
  tipVnd = 0,
  issuedAt,
  footerNote = "Cảm ơn quý khách. Hẹn gặp lại!",
  invoiceCode,
  className,
}: ReceiptPreviewProps) {
  const ts = issuedAt ?? new Date();
  const subtotal = items.reduce(
    (sum, i) => sum + i.qty * i.unitPriceVnd,
    0,
  );
  const total = Math.max(0, subtotal - discountVnd + tipVnd);
  const code =
    invoiceCode ??
    `HD${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(2, "0")}${String(
      ts.getDate(),
    ).padStart(2, "0")}-${String(Math.floor(Math.random() * 900) + 100)}`;

  const dateStr = ts.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[320px] rounded-md bg-white p-4 font-mono text-[11px] leading-relaxed text-zinc-900 shadow-md ring-1 ring-zinc-300 dark:bg-zinc-100 dark:text-zinc-900",
        className,
      )}
    >
      <div className="text-center">
        <p className="text-base font-bold tracking-wider">{shopName}</p>
        <p>{shopAddress}</p>
        <p>ĐT: {shopPhone}</p>
      </div>
      <div className="my-2 border-t border-dashed border-zinc-400" />
      <div className="flex justify-between">
        <span>Mã HĐ:</span>
        <span className="font-semibold">{code}</span>
      </div>
      <div className="flex justify-between">
        <span>Ngày:</span>
        <span>{dateStr}</span>
      </div>
      <div className="my-2 border-t border-dashed border-zinc-400" />
      <div className="space-y-1">
        {items.length === 0 ? (
          <p className="text-center italic opacity-70">— Chưa có món —</p>
        ) : (
          items.map((it, idx) => {
            const lineTotal = it.qty * it.unitPriceVnd;
            return (
              <div key={`${it.name}-${idx}`}>
                <p className="font-semibold">{pad(it.name, 28)}</p>
                <div className="flex justify-between pl-2">
                  <span>
                    {it.qty} × {formatVnd(it.unitPriceVnd)}
                  </span>
                  <span>{formatVnd(lineTotal)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="my-2 border-t border-dashed border-zinc-400" />
      <div className="space-y-0.5">
        <div className="flex justify-between">
          <span>Tạm tính:</span>
          <span>{formatVnd(subtotal)}</span>
        </div>
        {discountVnd > 0 && (
          <div className="flex justify-between text-rose-700">
            <span>Giảm giá:</span>
            <span>−{formatVnd(discountVnd)}</span>
          </div>
        )}
        {tipVnd > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>Tip:</span>
            <span>+{formatVnd(tipVnd)}</span>
          </div>
        )}
        <div className="my-1 border-t border-zinc-400" />
        <div className="flex justify-between text-sm font-bold">
          <span>TỔNG:</span>
          <span>{formatVnd(total)} đ</span>
        </div>
      </div>
      <div className="my-2 border-t border-dashed border-zinc-400" />
      <p className="text-center italic">{footerNote}</p>
      <p className="mt-2 text-center text-[9px] tracking-widest opacity-70">
        ◆ ◆ ◆
      </p>
    </div>
  );
}
