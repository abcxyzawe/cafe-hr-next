"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Award, X, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ROLE_LABELS } from "@/lib/utils";

type Person = {
  id: number;
  name: string;
  avatarUrl: string | null;
  role: string;
  yearsCount: number;
};

const DISMISS_KEY = "cafe-hr-anniversary-banner-dismissed";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function ordinalYears(n: number): string {
  // Vietnamese-friendly phrasing
  if (n === 1) return "1 năm";
  if (n === 2) return "2 năm";
  if (n === 3) return "3 năm";
  if (n === 5) return "tròn 5 năm 🎉";
  if (n === 10) return "tròn 10 năm 🏆";
  return `${n} năm`;
}

export function AnniversaryBanner({ people }: { people: Person[] }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(DISMISS_KEY);
    if (stored !== todayKey()) setDismissed(false);
  }, []);

  if (people.length === 0 || dismissed) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, todayKey());
    setDismissed(true);
  }

  const headline =
    people.length === 1
      ? `Hôm nay là kỷ niệm ${ordinalYears(people[0].yearsCount)} làm việc của ${people[0].name}!`
      : `${people.length} nhân viên tròn kỷ niệm làm việc hôm nay 🎉`;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-orange-500/10 p-4 sm:p-5 shadow-sm">
      <button
        onClick={dismiss}
        aria-label="Đóng"
        className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
      >
        <X className="size-4" />
      </button>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md">
          <Award className="size-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles className="size-4 text-amber-500" />
            <span className="truncate">{headline}</span>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {people.slice(0, 8).map((p) => (
              <Link
                key={p.id}
                href={`/employees/${p.id}`}
                title={`${p.name} — ${ordinalYears(p.yearsCount)} làm việc`}
                data-employee-id={p.id}
                className="flex items-center gap-1.5 rounded-full border bg-card pl-1 pr-2.5 py-0.5 text-xs transition-all hover:scale-105 hover:border-amber-400/60"
              >
                <Avatar src={p.avatarUrl} fallback={p.name} alt={p.name} size={24} />
                <span className="font-medium truncate max-w-[120px]">{p.name}</span>
                <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-200 tabular-nums">
                  {p.yearsCount}{p.yearsCount === 1 ? "" : ""}y
                </span>
              </Link>
            ))}
            {people.length > 8 && (
              <span className="text-xs text-muted-foreground">
                +{people.length - 8} người khác
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
