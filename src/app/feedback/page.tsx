import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Coffee } from "lucide-react";
import { CustomerFeedbackForm } from "./customer-feedback-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Góp ý cho Cafe HR",
  description:
    "Cảm ơn bạn đã ghé Cafe HR — hãy chia sẻ trải nghiệm để chúng tôi phục vụ tốt hơn.",
};

export default function PublicFeedbackPage() {
  return (
    <div className="fixed inset-0 grid overflow-y-auto lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <Image
          src="/assets/login-bg.jpg"
          alt=""
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
        <div className="absolute bottom-10 left-10 right-10 text-white">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs backdrop-blur">
            <Image
              src="/brand/logo-48.png"
              alt=""
              width={16}
              height={16}
              className="rounded"
            />
            Cafe HR
          </div>
          <h2 className="text-3xl font-bold tracking-tight drop-shadow-md">
            Mỗi tách cà phê,
            <br />
            là một trải nghiệm.
          </h2>
          <p className="mt-2 max-w-md text-sm text-white/85 drop-shadow">
            Phản hồi của bạn giúp chúng tôi pha chế và phục vụ tốt hơn mỗi ngày.
          </p>
        </div>
      </div>

      <div className="flex min-h-full items-center justify-center bg-background p-6">
        <div className="w-full max-w-xl space-y-6 py-8">
          <div className="flex flex-col items-center gap-3 text-center lg:hidden">
            <Image
              src="/brand/logo-192.png"
              alt="Cafe HR"
              width={56}
              height={56}
              className="rounded-2xl shadow-md"
              priority
            />
          </div>

          <div className="space-y-2 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              <Coffee className="size-3.5" />
              Phản hồi khách hàng
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Cảm ơn bạn đã ghé Cafe HR! Ý kiến của bạn rất quý
            </h1>
            <p className="text-sm text-muted-foreground">
              Hãy dành 30 giây để cho chúng tôi biết trải nghiệm của bạn —
              mọi đánh giá đều được đội ngũ đọc và trân trọng.
            </p>
          </div>

          <CustomerFeedbackForm />

          <div className="flex justify-center pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="size-3.5" />
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
