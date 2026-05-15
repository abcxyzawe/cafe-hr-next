import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  SITEMAP_ENTRIES,
  SITEMAP_CATEGORY_META,
  type SitemapCategory,
  type SitemapEntry,
} from "@/lib/sitemap-catalogue";
import { resolveSitemapIcon } from "@/lib/sitemap-icons";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Cheatsheet quản trị",
  description:
    "Tổng hợp một trang mọi công cụ quản trị và tính năng AI dành cho admin.",
};


const CATEGORY_ORDER: ReadonlyArray<SitemapCategory> = [
  "main",
  "admin",
  "personal",
  "ops",
  "schedule",
  "people",
  "team",
  "analytics",
  "ai",
  "ai-images",
  "learning",
  "finance",
  "tools",
  "system",
];

const CATEGORY_GRADIENT: Record<SitemapCategory, string> = {
  main: "from-slate-50 to-slate-100 dark:from-slate-900/40 dark:to-slate-800/30",
  admin:
    "from-indigo-50 to-blue-100 dark:from-indigo-900/30 dark:to-blue-900/20",
  personal:
    "from-lime-50 to-emerald-100 dark:from-lime-900/30 dark:to-emerald-900/20",
  ops: "from-sky-50 to-blue-100 dark:from-sky-900/30 dark:to-blue-900/20",
  schedule:
    "from-teal-50 to-cyan-100 dark:from-teal-900/30 dark:to-cyan-900/20",
  people:
    "from-rose-50 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/20",
  team:
    "from-pink-50 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/20",
  analytics:
    "from-emerald-50 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/20",
  ai: "from-violet-50 to-fuchsia-100 dark:from-violet-900/30 dark:to-fuchsia-900/20",
  "ai-images":
    "from-fuchsia-50 to-purple-100 dark:from-fuchsia-900/30 dark:to-purple-900/20",
  learning:
    "from-amber-50 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/20",
  finance:
    "from-yellow-50 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/20",
  tools:
    "from-cyan-50 to-sky-100 dark:from-cyan-900/30 dark:to-sky-900/20",
  system:
    "from-zinc-50 to-stone-100 dark:from-zinc-900/40 dark:to-stone-800/30",
};

const CATEGORY_ICON_TINT: Record<SitemapCategory, string> = {
  main: "bg-slate-200/70 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200",
  admin:
    "bg-indigo-200/70 text-indigo-800 dark:bg-indigo-700/40 dark:text-indigo-100",
  personal:
    "bg-lime-200/70 text-lime-800 dark:bg-lime-700/40 dark:text-lime-100",
  ops: "bg-sky-200/70 text-sky-800 dark:bg-sky-700/40 dark:text-sky-100",
  schedule:
    "bg-teal-200/70 text-teal-800 dark:bg-teal-700/40 dark:text-teal-100",
  people:
    "bg-rose-200/70 text-rose-800 dark:bg-rose-700/40 dark:text-rose-100",
  team:
    "bg-pink-200/70 text-pink-800 dark:bg-pink-700/40 dark:text-pink-100",
  analytics:
    "bg-emerald-200/70 text-emerald-800 dark:bg-emerald-700/40 dark:text-emerald-100",
  ai: "bg-violet-200/70 text-violet-800 dark:bg-violet-700/40 dark:text-violet-100",
  "ai-images":
    "bg-fuchsia-200/70 text-fuchsia-800 dark:bg-fuchsia-700/40 dark:text-fuchsia-100",
  learning:
    "bg-amber-200/70 text-amber-800 dark:bg-amber-700/40 dark:text-amber-100",
  finance:
    "bg-yellow-200/70 text-yellow-800 dark:bg-yellow-700/40 dark:text-yellow-100",
  tools: "bg-cyan-200/70 text-cyan-800 dark:bg-cyan-700/40 dark:text-cyan-100",
  system:
    "bg-zinc-200/70 text-zinc-700 dark:bg-zinc-700/40 dark:text-zinc-200",
};

export default async function AdminCheatsheetPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");
  if (sess.role !== "admin") redirect("/");

  const adminEntries: ReadonlyArray<SitemapEntry> = SITEMAP_ENTRIES.filter(
    (e) => e.adminOnly === true,
  );

  const grouped = new Map<SitemapCategory, SitemapEntry[]>();
  for (const cat of CATEGORY_ORDER) grouped.set(cat, []);
  for (const e of adminEntries) {
    const list = grouped.get(e.category);
    if (list) list.push(e);
  }

  const total = adminEntries.length;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <header className="rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Chỉ dành cho quản trị viên
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Cheatsheet quản trị
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Tổng hợp nhanh tất cả công cụ quản trị và tính năng AI nâng cao
              trong hệ thống. Bookmark trang này để truy cập tức thì mọi tính
              năng dành cho admin mà không cần cuộn sitemap.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <Badge variant="secondary" className="text-sm">
              {total} công cụ admin
            </Badge>
            <Link
              href="/sitemap"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Xem sitemap đầy đủ
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <div className="space-y-10">
        {CATEGORY_ORDER.map((cat) => {
          const items = grouped.get(cat) ?? [];
          if (items.length === 0) return null;
          const meta = SITEMAP_CATEGORY_META[cat];
          const gradient = CATEGORY_GRADIENT[cat];
          const iconTint = CATEGORY_ICON_TINT[cat];
          return (
            <section key={cat} className="space-y-4">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">
                    {meta.label}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {meta.description}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0">
                  {items.length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((entry) => {
                  const Icon = resolveSitemapIcon(entry.iconName);
                  return (
                    <Link
                      key={entry.href}
                      href={entry.href}
                      className={cn(
                        "group relative flex h-full items-start gap-3 rounded-xl border p-4 shadow-sm transition-all",
                        "bg-gradient-to-br",
                        gradient,
                        "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                          iconTint,
                        )}
                        aria-hidden="true"
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium leading-tight">
                            {entry.label}
                          </span>
                          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                        </div>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {entry.description}
                        </p>
                        <p className="truncate font-mono text-[11px] text-muted-foreground/80">
                          {entry.href}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <footer className="rounded-xl border border-dashed bg-muted/30 p-4 text-center text-xs text-muted-foreground">
        Đăng nhập với quyền quản trị viên cần thiết để truy cập các trang này.
      </footer>
    </div>
  );
}
