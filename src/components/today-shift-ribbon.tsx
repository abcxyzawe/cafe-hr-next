import Link from "next/link";
import { Sun, Sunset, Moon, ArrowRight, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { ShiftSlot, TodayShiftSlotData } from "@/lib/today-shifts";

const SLOT_VISUAL: Record<
  ShiftSlot,
  { icon: React.ComponentType<{ className?: string }>; tone: string; ring: string }
> = {
  morning: {
    icon: Sun,
    tone: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    ring: "ring-amber-500/30",
  },
  afternoon: {
    icon: Sunset,
    tone: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    ring: "ring-orange-500/30",
  },
  evening: {
    icon: Moon,
    tone: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    ring: "ring-indigo-500/30",
  },
};

export function TodayShiftRibbon({ slots }: { slots: TodayShiftSlotData[] }) {
  const totalAssigned = slots.reduce((acc, s) => acc + s.assignees.length, 0);
  if (totalAssigned === 0) return null;

  return (
    <section className="rounded-2xl border bg-card/60 p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Lịch ca hôm nay
        </h3>
        <Link
          href="/shifts"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:underline"
        >
          Mở lịch tuần
          <ArrowRight className="size-3" />
        </Link>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {slots.map((s) => (
          <SlotCard key={s.slot} data={s} />
        ))}
      </div>
    </section>
  );
}

function SlotCard({ data }: { data: TodayShiftSlotData }) {
  const visual = SLOT_VISUAL[data.slot];
  const Icon = visual.icon;
  const empty = data.assignees.length === 0;
  const activeCount = data.assignees.filter((a) => a.active).length;

  return (
    <Link
      href="/shifts"
      className={cn(
        "group flex items-center gap-3 rounded-xl border bg-background p-3 transition-all hover:border-primary/30 hover:shadow-md",
        empty && "opacity-70",
      )}
    >
      <div
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl ring-2 ring-offset-2 ring-offset-background transition-all group-hover:scale-105",
          visual.tone,
          visual.ring,
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold">{data.label}</span>
          <span className="text-[10px] text-muted-foreground">{data.timeRange}</span>
          {activeCount > 0 && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {activeCount} đang làm
            </span>
          )}
        </div>
        {empty ? (
          <p className="mt-0.5 flex items-center gap-1 text-[11px] italic text-muted-foreground">
            <Users className="size-3" /> Chưa có ai xếp ca
          </p>
        ) : (
          <div className="mt-1 flex items-center gap-1.5">
            <div className="flex -space-x-1.5">
              {data.assignees.slice(0, 5).map((a) => (
                <span
                  key={a.id}
                  title={`${a.name}${a.active ? " · đang làm" : ""}`}
                  className={cn(
                    "ring-2 ring-background rounded-full",
                    a.active && "ring-emerald-500/60",
                  )}
                >
                  <Avatar src={a.avatarUrl} fallback={a.name} alt={a.name} size={22} />
                </span>
              ))}
            </div>
            <span className="text-[11px] text-muted-foreground">
              {data.assignees.length === 1
                ? data.assignees[0].name.split(" ").slice(-1)[0]
                : `${data.assignees.length} người`}
              {data.assignees.length > 5 && ` · +${data.assignees.length - 5}`}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
