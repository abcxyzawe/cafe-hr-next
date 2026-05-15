"use client";

import * as React from "react";
import Link from "next/link";
import { Search, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  SITEMAP_CATEGORY_META,
  type SitemapCategory,
  type SitemapEntry,
} from "@/lib/sitemap-catalogue";
import { resolveSitemapIcon } from "@/lib/sitemap-icons";

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

type SitemapGridProps = {
  entries: ReadonlyArray<SitemapEntry>;
  isAdmin: boolean;
};

export function SitemapGrid({ entries, isAdmin }: SitemapGridProps) {
  const [query, setQuery] = React.useState("");

  const normalized = query.trim().toLocaleLowerCase("vi");

  const filtered = React.useMemo(() => {
    if (!normalized) return entries;
    return entries.filter((e) => {
      const hay =
        `${e.label} ${e.description} ${e.href}`.toLocaleLowerCase("vi");
      return hay.includes(normalized);
    });
  }, [entries, normalized]);

  const grouped = React.useMemo(() => {
    const map = new Map<SitemapCategory, SitemapEntry[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const e of filtered) {
      const list = map.get(e.category);
      if (list) list.push(e);
    }
    return map;
  }, [filtered]);

  const totalVisible = filtered.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm trang theo tên hoặc mô tả…"
            aria-label="Tìm kiếm trang"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">{totalVisible} trang</Badge>
          {isAdmin ? (
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Đang xem với quyền quản trị
            </span>
          ) : (
            <span>Một số mục dành riêng cho quản trị viên đã được ẩn.</span>
          )}
        </div>
      </div>

      {totalVisible === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/30 p-10 text-center text-sm text-muted-foreground">
          Không tìm thấy trang nào khớp với{" "}
          <span className="font-medium text-foreground">
            “{query.trim()}”
          </span>
          .
        </div>
      ) : (
        <div className="space-y-8">
          {CATEGORY_ORDER.map((cat) => {
            const items = grouped.get(cat) ?? [];
            if (items.length === 0) return null;
            const meta = SITEMAP_CATEGORY_META[cat];
            return (
              <section key={cat} className="space-y-3">
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">
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
                  {items.map((entry) => (
                    <SitemapTile key={entry.href} entry={entry} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SitemapTile({ entry }: { entry: SitemapEntry }) {
  const Icon = resolveSitemapIcon(entry.iconName);
  return (
    <Link
      href={entry.href}
      className={cn(
        "group relative flex h-full gap-3 rounded-xl border bg-card p-4 text-card-foreground shadow-sm transition-all",
        "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          "bg-primary/10 text-primary transition-colors group-hover:bg-primary/15",
        )}
        aria-hidden="true"
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium leading-tight">
            {entry.label}
          </span>
          {entry.adminOnly ? (
            <Badge variant="warning" className="shrink-0">
              Admin
            </Badge>
          ) : null}
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
}
