import { cn } from "@/lib/utils";

type QrCodeProps = {
  /** Text or URL to encode. */
  data: string;
  /** Pixel size of the rendered image. Defaults to 160. */
  size?: number;
  /** Optional caption text shown below the QR. */
  caption?: string;
  /** Optional alt for the img tag. Defaults to a generic accessible label. */
  alt?: string;
  className?: string;
  /** Whether to render with a card-style border + padding. Defaults to true. */
  framed?: boolean;
};

/**
 * Renders a QR code via api.qrserver.com (matches the existing pattern used in
 * payslip + employee-cards print pages — no extra dependency, no client JS).
 *
 * Note: this hits an external service. For offline use a client-side library
 * would be needed.
 */
export function QrCode({
  data,
  size = 160,
  caption,
  alt,
  className,
  framed = true,
}: QrCodeProps) {
  const safe = encodeURIComponent(data);
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${safe}`;
  return (
    <div
      className={cn(
        "inline-flex flex-col items-center gap-1.5",
        framed && "rounded-lg border bg-white p-2 shadow-sm",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt ?? "Mã QR"}
        width={size}
        height={size}
        loading="lazy"
        className="block"
        style={{ width: size, height: size }}
      />
      {caption && (
        <p className="max-w-[200px] text-center text-[11px] text-muted-foreground">
          {caption}
        </p>
      )}
    </div>
  );
}
