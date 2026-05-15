import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";

type Step = {
  index: number;
  label: string;
  href: string;
};

const STEPS: Step[] = [
  { index: 1, label: "Thêm nhân viên đầu tiên", href: "/employees" },
  { index: 2, label: "Lập lịch ca làm việc", href: "/shifts" },
  { index: 3, label: "Tuỳ chỉnh giao diện", href: "/settings/appearance" },
];

export function OnboardingHero() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="grid gap-0 md:grid-cols-[300px_1fr]">
        <div className="hidden md:block relative bg-gradient-to-br from-amber-100 via-orange-100 to-rose-100 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-rose-950/30">
          {/* Native <img> so a missing file falls back gracefully to the gradient. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/illustrations/onboarding-hero.png"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
          />
        </div>
        <div className="space-y-4 p-6 md:p-8">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100/50 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
            <Sparkles className="size-3" />
            Bắt đầu thôi!
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold leading-tight tracking-tight md:text-3xl">
              Chào mừng đến với Cafe HR!
            </h2>
            <p className="text-sm text-muted-foreground">
              Bắt đầu trong 3 bước nhanh
            </p>
          </div>
          <ol className="space-y-2">
            {STEPS.map((step) => (
              <li key={step.index}>
                <Link
                  href={step.href}
                  className="group flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-sm font-medium transition hover:border-primary/40 hover:bg-accent/40"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                    {step.index}
                  </span>
                  <span className="flex-1">{step.label}</span>
                  <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Card>
  );
}
