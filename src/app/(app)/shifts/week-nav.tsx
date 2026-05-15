"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WeekNav({ weekStart }: { weekStart: string }) {
  const router = useRouter();
  const d = new Date(weekStart);
  const prev = new Date(d);
  prev.setDate(d.getDate() - 7);
  const next = new Date(d);
  next.setDate(d.getDate() + 7);
  const today = new Date().toISOString().slice(0, 10);

  const go = (date: Date) =>
    router.push(`/shifts?date=${date.toISOString().slice(0, 10)}`);

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        onClick={() => go(prev)}
        aria-label="Tuần trước"
      >
        <ChevronLeft className="size-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push(`/shifts?date=${today}`)}
      >
        <CalendarDays className="size-4" />
        Hôm nay
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => go(next)}
        aria-label="Tuần sau"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
