"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  ChevronRight,
  Clock,
  Coffee,
  Flame,
  Lightbulb,
  Package,
  Printer,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  SOPS,
  SOP_CATEGORY_LABEL,
  type Sop,
} from "@/lib/sop-catalogue";

type CategoryFilter = "all" | Sop["category"];

const ICON_MAP: Record<
  Sop["iconName"],
  React.ComponentType<{ className?: string }>
> = {
  users: Users,
  sparkles: Sparkles,
  "shield-check": ShieldCheck,
  scale: Scale,
  coffee: Coffee,
  flame: Flame,
  package: Package,
};

const CATEGORY_TONE: Record<
  Sop["category"],
  { chip: string; iconWrap: string }
> = {
  service: {
    chip:
      "border-transparent bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
    iconWrap:
      "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  },
  cleaning: {
    chip:
      "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    iconWrap:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  safety: {
    chip:
      "border-transparent bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
    iconWrap:
      "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  },
  cash: {
    chip:
      "border-transparent bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-300",
    iconWrap:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
};

const CATEGORY_ORDER: Sop["category"][] = [
  "service",
  "cleaning",
  "safety",
  "cash",
];

const PRINT_BODY_CLASS = "sop-print-active";

function ensurePrintStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById("sop-print-style")) return;
  const style = document.createElement("style");
  style.id = "sop-print-style";
  style.textContent = `
    @media print {
      body.${PRINT_BODY_CLASS} > *:not(.sop-print-target) { display: none !important; }
      body.${PRINT_BODY_CLASS} .sop-print-target { position: static !important; box-shadow: none !important; }
      body.${PRINT_BODY_CLASS} .sop-print-target details { border: 1px solid #ccc; }
      body.${PRINT_BODY_CLASS} .sop-print-target details[open] > div { display: block !important; }
    }
  `;
  document.head.appendChild(style);
}

function printSop(sopId: string): void {
  if (typeof window === "undefined") return;
  const node = document.getElementById(`sop-${sopId}`);
  if (!node) {
    window.print();
    return;
  }
  const detailsEl =
    node instanceof HTMLDetailsElement ? node : null;
  const wasOpen = detailsEl?.open ?? false;
  if (detailsEl) detailsEl.open = true;

  ensurePrintStyles();
  node.classList.add("sop-print-target");
  document.body.classList.add(PRINT_BODY_CLASS);

  const cleanup = () => {
    node.classList.remove("sop-print-target");
    document.body.classList.remove(PRINT_BODY_CLASS);
    if (detailsEl && !wasOpen) detailsEl.open = false;
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);

  window.print();
  // Fallback cleanup in case afterprint does not fire (some browsers).
  window.setTimeout(cleanup, 1000);
}

export function SopLibrary() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");

  const trimmed = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    return SOPS.filter((s) => {
      if (category !== "all" && s.category !== category) return false;
      if (!trimmed) return true;
      return (
        s.title.toLowerCase().includes(trimmed) ||
        s.description.toLowerCase().includes(trimmed)
      );
    });
  }, [category, trimmed]);

  const categoryCounts = useMemo(() => {
    const counts: Record<Sop["category"], number> = {
      service: 0,
      cleaning: 0,
      safety: 0,
      cash: 0,
    };
    for (const s of SOPS) counts[s.category] += 1;
    return counts;
  }, []);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <BookOpen className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-2xl tracking-tight md:text-3xl">
                Quy trình chuẩn (SOP)
              </CardTitle>
              <CardDescription className="mt-1 text-sm">
                Thư viện {SOPS.length} quy trình vận hành chuẩn cho quán cà
                phê — phục vụ, vệ sinh, an toàn và xử lý tiền mặt. Mở từng
                thẻ để xem các bước chi tiết.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm theo tên hoặc mô tả..."
                className="pl-8 pr-8"
                aria-label="Tìm SOP"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Xóa tìm kiếm"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <CategoryChip
              active={category === "all"}
              onClick={() => setCategory("all")}
              label={`Tất cả (${SOPS.length})`}
            />
            {CATEGORY_ORDER.map((c) => (
              <CategoryChip
                key={c}
                active={category === c}
                onClick={() => setCategory(c)}
                label={`${SOP_CATEGORY_LABEL[c]} (${categoryCounts[c]})`}
                tone={CATEGORY_TONE[c].chip}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Không có quy trình nào khớp với bộ lọc hiện tại.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((sop) => (
            <SopCard key={sop.id} sop={sop} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  label,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  tone?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : tone
            ? cn("hover:opacity-80", tone)
            : "border-border bg-background text-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}

function SopCard({ sop }: { sop: Sop }) {
  const Icon = ICON_MAP[sop.iconName];
  const tone = CATEGORY_TONE[sop.category];

  return (
    <details
      id={`sop-${sop.id}`}
      data-title={sop.title}
      className="group rounded-xl border bg-card shadow-sm transition-shadow open:shadow-md"
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 hover:bg-muted/40">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            tone.iconWrap,
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold leading-tight md:text-base">
              {sop.title}
            </h3>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {sop.description}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge className={cn("gap-1", tone.chip)}>
              {SOP_CATEGORY_LABEL[sop.category]}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Clock className="size-3" />
              {sop.estimatedMinutes} phút
            </Badge>
            <Badge variant="outline">{sop.steps.length} bước</Badge>
          </div>
        </div>
        <ChevronRight className="hidden size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90 sm:block" />
      </summary>
      <div className="border-t px-4 pb-4 pt-3">
        <ol className="space-y-2">
          {sop.steps.map((step, idx) => (
            <li
              key={idx}
              className={cn(
                "flex items-start gap-2.5 rounded-lg p-2 text-sm leading-relaxed",
                step.warning && "bg-amber-50 dark:bg-amber-950/30",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                  step.warning
                    ? "bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100"
                    : "bg-primary/10 text-primary",
                )}
              >
                {idx + 1}
              </span>
              <span className="flex-1">
                {step.warning && (
                  <AlertTriangle className="mr-1 inline size-3.5 text-amber-700 dark:text-amber-400" />
                )}
                {step.text}
              </span>
            </li>
          ))}
        </ol>

        {sop.tips && sop.tips.length > 0 && (
          <div className="mt-3 rounded-lg bg-cyan-50 p-3 dark:bg-cyan-950/30">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-cyan-900 dark:text-cyan-200">
              <Lightbulb className="size-3.5" />
              Lưu ý & mẹo
            </div>
            <ul className="space-y-1 pl-1 text-xs text-cyan-900/90 dark:text-cyan-100/90">
              {sop.tips.map((t, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="mt-1 size-1 shrink-0 rounded-full bg-cyan-700 dark:bg-cyan-300" />
                  <span className="flex-1">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => printSop(sop.id)}
          >
            <Printer className="size-4" />
            In quy trình
          </Button>
        </div>
      </div>
    </details>
  );
}
