"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";

const OPTIONS = [25, 50, 100, 200] as const;

type Props = {
  /** Currently active page-size (one of [25, 50, 100, 200]). */
  value: number;
  /** All current URL query params (excluding `per` and `page`) to preserve. */
  currentParams: Record<string, string | undefined>;
};

/**
 * Client wrapper that renders a small <Select> for choosing page size.
 * Navigates to `/audit?...&per=N&page=1` so pagination resets when size
 * changes, and preserves all other filter params from the URL.
 */
export function PerPageSelector({ value, currentParams }: Props) {
  const router = useRouter();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = Number(e.target.value);
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(currentParams)) {
      if (v === undefined || v === "") continue;
      if (k === "per" || k === "page") continue;
      q.set(k, v);
    }
    q.set("per", String(next));
    q.set("page", "1");
    const qs = q.toString();
    router.push(qs ? `/audit?${qs}` : "/audit");
  }

  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="whitespace-nowrap">Mỗi trang:</span>
      <Select
        value={String(value)}
        onChange={onChange}
        aria-label="Số bản ghi mỗi trang"
        className="h-8 w-[72px] px-2 text-xs"
      >
        {OPTIONS.map((opt) => (
          <option key={opt} value={String(opt)}>
            {opt}
          </option>
        ))}
      </Select>
    </label>
  );
}
