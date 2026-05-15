import Image from "next/image";
import { LoginForm } from "./login-form";
import { getT } from "@/lib/i18n";
import { Check } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cafe HR",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next = "/" } = await searchParams;
  const t = await getT();

  const features = [
    "Chấm công, ca làm, bảng lương — tất cả trong một",
    "AI tạo ảnh đại diện và gợi ý thông minh",
    "Báo cáo trực quan, xuất Excel & PDF",
  ];

  return (
    <div className="flex min-h-svh bg-background">
      {/* LEFT pane: branded hero */}
      <div
        className="relative hidden md:flex md:flex-1 bg-cover bg-center"
        style={{ backgroundImage: "url(/illustrations/login-hero.png)" }}
      >
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-background/95 via-background/40 to-transparent dark:from-background dark:via-background/60" />

        {/* Content */}
        <div className="relative z-10 flex w-full flex-col justify-between p-10 lg:p-14">
          {/* Top: brand mark */}
          <div className="flex items-center gap-3">
            <Image
              src="/brand/logo-96.png"
              alt={t("app.name")}
              width={48}
              height={48}
              className="rounded-xl shadow-md"
              priority
            />
            <span className="text-lg font-semibold tracking-tight text-foreground">
              {t("app.name")}
            </span>
          </div>

          {/* Middle: tagline + features */}
          <div className="max-w-lg space-y-8">
            <div className="space-y-3">
              <h2 className="text-4xl font-bold leading-tight tracking-tight text-foreground lg:text-5xl">
                Cafe HR
              </h2>
              <p className="text-lg text-muted-foreground lg:text-xl">
                Quản lý nhân sự quán cà phê thông minh
              </p>
            </div>

            <ul className="space-y-3">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                  <span className="text-sm text-foreground/90 lg:text-base">
                    {f}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Footer */}
          <p className="text-xs text-muted-foreground">
            © 2026 Cafe HR · Made with care
          </p>
        </div>
      </div>

      {/* RIGHT pane: login form */}
      <div className="flex w-full md:max-w-md md:flex-shrink-0 items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-sm space-y-6">
          {/* Mobile-only logo (left pane is hidden on mobile) */}
          <div className="flex flex-col items-center gap-2 text-center md:hidden">
            <Image
              src="/brand/logo-192.png"
              alt={t("app.name")}
              width={64}
              height={64}
              className="rounded-2xl shadow-md"
              priority
            />
            <h1 className="text-2xl font-bold tracking-tight">
              {t("app.name")}
            </h1>
          </div>

          {/* Welcome */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">
              Chào mừng trở lại 👋
            </h1>
            <p className="text-sm text-muted-foreground">
              Đăng nhập để tiếp tục
            </p>
          </div>

          {/* Form card */}
          <div className="rounded-2xl border bg-card p-6 shadow-xl">
            <LoginForm
              next={next}
              labels={{
                email: t("login.email"),
                password: t("login.password"),
                submit: t("login.signInButton"),
                demoHint: t("login.demoHint"),
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
