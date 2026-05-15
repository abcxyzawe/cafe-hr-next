import Link from "next/link";
import Image from "next/image";
import { Sparkles, ArrowRight, Users, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OnboardingCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-amber-50 via-background to-emerald-50/30 shadow-sm dark:from-amber-950/30 dark:via-background dark:to-emerald-950/20">
      <div className="absolute -right-8 -top-8 size-48 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="absolute -bottom-8 -left-8 size-48 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="relative grid gap-6 p-6 md:grid-cols-[1fr_240px] md:p-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100/50 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
            <Sparkles className="size-3" />
            Bắt đầu thôi!
          </div>
          <h2 className="text-2xl font-bold leading-tight tracking-tight md:text-3xl">
            Chào mừng đến với Cafe HR
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Hệ thống đã sẵn sàng. Bước đầu tiên là thêm nhân viên vào quán — sau
            đó bạn có thể lập lịch ca, chấm công và tính lương ngay.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="lg">
              <Link href="/employees">
                <Users className="size-4" />
                Thêm nhân viên đầu tiên
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/api/employees/template.csv" prefetch={false}>
                <FileSpreadsheet className="size-4" />
                Tải mẫu CSV
              </Link>
            </Button>
          </div>
          <ol className="space-y-1.5 pt-2 text-xs text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="flex size-4 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                1
              </span>
              Thêm nhân viên (thủ công hoặc import CSV)
            </li>
            <li className="flex items-center gap-2">
              <span className="flex size-4 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                2
              </span>
              Lập lịch ca tuần đầu
            </li>
            <li className="flex items-center gap-2">
              <span className="flex size-4 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                3
              </span>
              Đặt PIN kiosk để nhân viên tự chấm công
            </li>
          </ol>
        </div>
        <div className="relative hidden aspect-square overflow-hidden rounded-xl shadow-md md:block">
          <Image
            src="/assets/welcome-first-employee.jpg"
            alt=""
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>
    </div>
  );
}
