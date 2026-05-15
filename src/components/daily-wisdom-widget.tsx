import Link from "next/link";
import { Lightbulb, ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SOPS } from "@/lib/sop-catalogue";
import { RECIPES } from "@/lib/recipe-catalogue";

type Tip = {
  source: "sop" | "recipe";
  category: string;
  title: string;
  text: string;
  href: string;
};

function buildTipPool(): Tip[] {
  const tips: Tip[] = [];
  for (const sop of SOPS) {
    for (const step of sop.steps) {
      tips.push({
        source: "sop",
        category: sop.title,
        title: sop.title,
        text: step.text,
        href: "/sop",
      });
    }
    if (sop.tips) {
      for (const t of sop.tips) {
        tips.push({
          source: "sop",
          category: sop.title,
          title: `Mẹo · ${sop.title}`,
          text: t,
          href: "/sop",
        });
      }
    }
  }
  for (const r of RECIPES) {
    for (const step of r.steps) {
      tips.push({
        source: "recipe",
        category: r.name,
        title: r.name,
        text: step,
        href: "/recipes",
      });
    }
  }
  return tips;
}

function todayHash(): number {
  const d = new Date();
  const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  let h = 0;
  for (let i = 0; i < k.length; i++) {
    h = (h * 31 + k.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function DailyWisdomWidget() {
  const pool = buildTipPool();
  if (pool.length === 0) return null;
  const tip = pool[todayHash() % pool.length];

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-amber-950/30 dark:via-orange-950/30 dark:to-rose-950/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Lightbulb className="size-4 text-amber-600 dark:text-amber-400" />
          Mẹo hôm nay
        </CardTitle>
        <CardDescription className="text-xs">
          {tip.source === "sop" ? "Từ Quy trình" : "Từ Sổ tay pha chế"} ·{" "}
          {tip.category}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-foreground/90">
          “{tip.text}”
        </p>
        <Link
          href={tip.href}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Xem chi tiết
          <ArrowRight className="size-3" />
        </Link>
      </CardContent>
    </Card>
  );
}
