"use client";

import * as React from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  STORAGE_KEY as STARRED_STORAGE_KEY,
  loadStars,
} from "@/lib/starred-entities";

type Props = {
  /** True iff `?starred=1` is currently set on the URL. */
  active: boolean;
  /** Pre-built href that toggles the `starred` query param on the URL. */
  toggleHref: string;
};

/**
 * Small pill above the audit table that toggles the "starred only" view.
 * Also surfaces the current count of starred entities so the admin knows
 * whether the filter will hide everything.
 */
export function StarFilterToggle({ active, toggleHref }: Props) {
  const [count, setCount] = React.useState<number>(0);

  React.useEffect(() => {
    setCount(loadStars().size);
    function onStorage(ev: StorageEvent) {
      if (ev.key !== null && ev.key !== STARRED_STORAGE_KEY) return;
      setCount(loadStars().size);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <Button
        asChild
        type="button"
        size="sm"
        variant={active ? "default" : "outline"}
        aria-pressed={active}
      >
        <Link href={toggleHref}>
          <Star
            className="size-4"
            fill={active ? "currentColor" : "none"}
            strokeWidth={active ? 1.5 : 2}
          />
          {active ? "Đang lọc theo mục đã sao" : "Chỉ xem mục đã sao"}
          <span className="ml-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-background/30 px-1.5 text-[11px] tabular-nums">
            {count}
          </span>
        </Link>
      </Button>
      {active && count === 0 && (
        <span className="text-xs text-muted-foreground">
          Bạn chưa đánh sao đối tượng nào — bảng sẽ trống.
        </span>
      )}
    </div>
  );
}
