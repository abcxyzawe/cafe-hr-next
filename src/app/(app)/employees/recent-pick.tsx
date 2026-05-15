"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import {
  loadRecentEmployees,
  STORAGE_KEY,
  type RecentEmployee,
} from "@/lib/recent-employees";
import { ROLE_LABELS } from "@/lib/utils";

const MAX_DISPLAY = 8;

export function RecentEmployeesPick() {
  const [items, setItems] = useState<RecentEmployee[]>([]);

  useEffect(() => {
    setItems(loadRecentEmployees());
    function onStorage(e: StorageEvent) {
      if (e.key && e.key !== STORAGE_KEY) return;
      setItems(loadRecentEmployees());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (items.length === 0) return null;

  const display = items.slice(0, MAX_DISPLAY);

  return (
    <section className="rounded-lg border bg-card p-3">
      <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Vừa xem
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {display.map((emp) => (
          <Link
            key={emp.id}
            href={`/employees/${emp.id}`}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border bg-background px-2 py-1 text-xs font-medium transition-colors hover:bg-accent"
          >
            <Avatar
              src={emp.avatarUrl}
              alt={emp.name}
              fallback={emp.name}
              size={24}
            />
            <span className="max-w-[120px] truncate">{emp.name}</span>
            <span className="hidden text-[10px] text-muted-foreground sm:inline">
              {ROLE_LABELS[emp.role] ?? emp.role}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
