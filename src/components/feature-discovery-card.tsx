"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Compass, ArrowRight, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  SITEMAP_ENTRIES,
  SITEMAP_CATEGORY_META,
  type SitemapEntry,
} from "@/lib/sitemap-catalogue";

const STORAGE_KEY = "cafe-hr-feature-seen";

type Props = {
  isAdmin: boolean;
  /** How many to show. Default 3. */
  count?: number;
};

function readSeen(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((v): v is string => typeof v === "string"));
  } catch {
    return new Set();
  }
}

function writeSeen(seen: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(seen)));
}

function pickRandom(pool: SitemapEntry[], count: number): SitemapEntry[] {
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

export function FeatureDiscoveryCard({ isAdmin, count = 3 }: Props) {
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);
  const [shuffleKey, setShuffleKey] = useState(0);

  useEffect(() => {
    setSeen(readSeen());
    setHydrated(true);
  }, []);

  const pool = useMemo(
    () =>
      SITEMAP_ENTRIES.filter(
        (e) => (isAdmin || !e.adminOnly) && !seen.has(e.href),
      ),
    [isAdmin, seen],
  );

  const items = useMemo(
    () => pickRandom(pool, count),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shuffleKey, pool, count],
  );

  function markSeen(href: string) {
    const next = new Set(seen);
    next.add(href);
    setSeen(next);
    writeSeen(next);
  }

  function reshuffle() {
    setShuffleKey((k) => k + 1);
  }

  function resetSeen() {
    setSeen(new Set());
    writeSeen(new Set());
  }

  if (!hydrated) return null;
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Compass className="size-4 text-primary" />
            Khám phá tính năng
          </CardTitle>
          <CardDescription>
            Bạn đã xem hết danh sách. Đặt lại để khám phá thêm.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" size="sm" variant="outline" onClick={resetSeen}>
            <RefreshCw className="size-4" />
            Đặt lại
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-primary/5 via-accent/20 to-background">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Compass className="size-4 text-primary" />
            Khám phá tính năng mới
          </CardTitle>
          <CardDescription>
            {count} gợi ý ngẫu nhiên — bấm để mở. Đã xem sẽ ẩn lần sau.
          </CardDescription>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={reshuffle}
          aria-label="Xáo lại"
        >
          <RefreshCw className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-3">
        {items.map((entry) => {
          const cat = SITEMAP_CATEGORY_META[entry.category];
          return (
            <Link
              key={entry.href}
              href={entry.href}
              onClick={() => markSeen(entry.href)}
              className="group flex flex-col gap-1 rounded-lg border bg-card p-3 transition-all hover:border-primary/40 hover:shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold leading-tight">
                  {entry.label}
                </span>
                <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {entry.description}
              </p>
              {cat && (
                <Badge variant="secondary" className="mt-1 w-fit text-[10px]">
                  {cat.label}
                </Badge>
              )}
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
