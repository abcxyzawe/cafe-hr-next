"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ROLE_VISUAL,
  isRoleKey,
  type RoleKey,
} from "@/lib/role-colors";

export type RoleChip = {
  key: RoleKey;
  label: string;
  count: number;
};

interface RoleFilterChipsProps {
  roles: RoleChip[];
  selected: RoleKey[];
  pathname?: string;
}

export function RoleFilterChips({
  roles,
  selected,
  pathname = "/people-calendar",
}: RoleFilterChipsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedSet = React.useMemo(() => new Set(selected), [selected]);

  function navigate(nextRoles: RoleKey[]) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextRoles.length === 0) {
      params.delete("roles");
    } else {
      params.set("roles", nextRoles.join(","));
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function toggle(key: RoleKey) {
    const next = new Set(selectedSet);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    // Preserve a stable canonical order
    const ordered: RoleKey[] = [];
    for (const r of roles) {
      if (next.has(r.key) && isRoleKey(r.key)) ordered.push(r.key);
    }
    navigate(ordered);
  }

  function clearAll() {
    navigate([]);
  }

  const allActive = selectedSet.size === 0;

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      role="group"
      aria-label="Lọc theo vai trò"
    >
      <button
        type="button"
        onClick={clearAll}
        aria-pressed={allActive}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
          allActive
            ? "border-primary bg-primary/15 text-primary"
            : "border-border bg-card text-muted-foreground hover:bg-accent",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "inline-block size-2 rounded-full",
            allActive ? "bg-primary" : "bg-muted-foreground/40",
          )}
        />
        Tất cả
      </button>
      {roles.map((r) => {
        const visual = ROLE_VISUAL[r.key];
        const active = selectedSet.has(r.key);
        return (
          <button
            key={r.key}
            type="button"
            onClick={() => toggle(r.key)}
            aria-pressed={active}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              active
                ? cn(visual.activeBg, visual.text, "border-transparent")
                : "border-border bg-card text-muted-foreground hover:bg-accent",
            )}
          >
            <span
              aria-hidden
              className={cn("inline-block size-2 rounded-full", visual.dot)}
            />
            <span>{r.label}</span>
            <Badge
              variant="outline"
              className={cn(
                "ml-0.5 px-1.5 py-0 text-[10px] tabular-nums",
                active ? "border-current/30" : "border-border",
              )}
            >
              {r.count}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}
