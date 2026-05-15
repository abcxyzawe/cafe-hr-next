import Image from "next/image";
import { Sun, Sunrise, Sunset, Users, ClipboardCheck, CalendarClock, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { recentActivities } from "@/lib/activity";
import { getTodayShiftSlots } from "@/lib/today-shifts";
import { getTodaySnapshot } from "@/lib/today";
import { Avatar } from "@/components/ui/avatar";
import { ROLE_LABELS, formatHours } from "@/lib/utils";
import { LiveClock } from "./live-clock";
import { ActivityTicker } from "./activity-ticker";
import { AutoRefresh } from "./auto-refresh";
import { DrinkOfTheDayCard } from "./drink-card";

export const dynamic = "force-dynamic";

const SHIFT_VISUAL = {
  morning: { icon: Sunrise, label: "Sáng", tone: "from-amber-500 to-orange-400" },
  afternoon: { icon: Sun, label: "Chiều", tone: "from-orange-500 to-rose-400" },
  evening: { icon: Sunset, label: "Tối", tone: "from-indigo-500 to-violet-500" },
} as const;

async function getStats() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const [employees, working, shiftsToday, monthHoursAgg, todayCheckIns] = await Promise.all([
    prisma.employee.count(),
    prisma.attendance.count({ where: { checkOut: null } }),
    prisma.shift.count({
      where: { shiftDate: { gte: startOfToday, lt: endOfToday } },
    }),
    prisma.attendance.aggregate({
      _sum: { hoursWorked: true },
      where: { checkIn: { gte: startOfMonth }, checkOut: { not: null } },
    }),
    prisma.attendance.count({
      where: { checkIn: { gte: startOfToday, lt: endOfToday } },
    }),
  ]);

  return {
    employees,
    working,
    shiftsToday,
    todayCheckIns,
    monthHours: Number(monthHoursAgg._sum.hoursWorked ?? 0),
  };
}

export default async function OfficeDisplayPage() {
  const [stats, slots, snapshot, activities] = await Promise.all([
    getStats().catch(() => ({
      employees: 0,
      working: 0,
      shiftsToday: 0,
      todayCheckIns: 0,
      monthHours: 0,
    })),
    getTodayShiftSlots().catch(() => []),
    getTodaySnapshot().catch(() => null),
    recentActivities(8).catch(() => []),
  ]);

  return (
    <div className="flex h-full flex-col p-6 lg:p-10">
      <AutoRefresh intervalMs={30_000} />

      {/* Top bar: logo + clock */}
      <header className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/brand/logo-96.png"
            alt="Cafe HR"
            width={56}
            height={56}
            className="rounded-xl shadow-lg"
            priority
          />
          <div>
            <p className="text-xs uppercase tracking-widest text-white/50">
              Cafe HR · Office Display
            </p>
            <h1 className="text-3xl font-bold tracking-tight">Phòng vận hành</h1>
          </div>
        </div>
        <LiveClock />
      </header>

      {/* Hero metric: who is working right now */}
      <section className="mt-8 flex flex-1 flex-col gap-6 lg:flex-row">
        <div className="flex-1 rounded-3xl bg-gradient-to-br from-emerald-500/30 to-emerald-500/5 p-8 ring-1 ring-emerald-400/30 shadow-2xl">
          <p className="text-sm uppercase tracking-widest text-emerald-200/80">
            Đang làm việc
          </p>
          <div className="mt-2 flex items-end gap-3">
            <span className="text-9xl font-black leading-none tabular-nums">
              {stats.working}
            </span>
            <span className="mb-3 text-2xl text-white/70">
              / {stats.employees} nhân viên
            </span>
          </div>
          {snapshot && snapshot.onShift.length > 0 && (
            <div className="mt-6">
              <p className="mb-3 text-xs uppercase tracking-widest text-white/50">
                Trên ca ngay bây giờ
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {snapshot.onShift.slice(0, 12).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-3 ring-1 ring-white/20"
                    title={p.name}
                  >
                    <Avatar src={p.avatarUrl} fallback={p.name} size={28} />
                    <div className="text-sm">
                      <p className="font-semibold leading-tight">{p.name.split(" ").slice(-1)[0]}</p>
                      <p className="text-[10px] text-white/60">
                        {ROLE_LABELS[p.role] ?? p.role}
                      </p>
                    </div>
                  </div>
                ))}
                {snapshot.onShift.length > 12 && (
                  <span className="text-sm text-white/60">
                    +{snapshot.onShift.length - 12} người khác
                  </span>
                )}
              </div>
            </div>
          )}
          {snapshot && snapshot.onShift.length === 0 && (
            <p className="mt-6 text-base italic text-white/50">
              Hiện chưa có ai chấm công vào ca
            </p>
          )}
        </div>

        {/* Side panel: stats + activity */}
        <div className="flex w-full flex-col gap-4 lg:w-[420px]">
          <DrinkOfTheDayCard />
          <div className="grid grid-cols-2 gap-3">
            <BigStat
              icon={Users}
              label="Nhân viên"
              value={stats.employees}
              tone="bg-sky-500/15 text-sky-200"
            />
            <BigStat
              icon={CalendarClock}
              label="Ca hôm nay"
              value={stats.shiftsToday}
              tone="bg-violet-500/15 text-violet-200"
            />
            <BigStat
              icon={ClipboardCheck}
              label="Check-in hôm nay"
              value={stats.todayCheckIns}
              tone="bg-emerald-500/15 text-emerald-200"
            />
            <BigStat
              icon={Wallet}
              label="Giờ tháng"
              value={formatHours(stats.monthHours)}
              tone="bg-amber-500/15 text-amber-200"
            />
          </div>

          <div className="flex-1 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur">
            <ActivityTicker
              initial={activities.map((a) => ({
                id: a.id,
                action: a.action,
                summary: a.summary,
                createdAt: a.createdAt.toISOString(),
                user: a.user,
              }))}
            />
          </div>
        </div>
      </section>

      {/* Bottom: today's shift slots */}
      {slots.length > 0 && (
        <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {slots.map((s) => {
            const v = SHIFT_VISUAL[s.slot];
            const Icon = v.icon;
            const activeCount = s.assignees.filter((a) => a.active).length;
            return (
              <div
                key={s.slot}
                className={`rounded-2xl bg-gradient-to-br ${v.tone} p-4 shadow-lg ring-1 ring-white/20`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="size-5" />
                    <span className="text-sm font-bold uppercase tracking-wider">
                      {v.label} · {s.timeRange}
                    </span>
                  </div>
                  {activeCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-bold">
                      <span className="size-1.5 rounded-full bg-emerald-300 animate-pulse" />
                      {activeCount} đang làm
                    </span>
                  )}
                </div>
                {s.assignees.length === 0 ? (
                  <p className="text-xs italic text-white/70">Chưa có ai xếp ca</p>
                ) : (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {s.assignees.slice(0, 8).map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center gap-1.5 rounded-full bg-black/20 py-0.5 pl-0.5 pr-2"
                        title={a.name}
                      >
                        <Avatar
                          src={a.avatarUrl}
                          fallback={a.name}
                          size={20}
                        />
                        <span className="text-xs font-medium">
                          {a.name.split(" ").slice(-1)[0]}
                        </span>
                      </div>
                    ))}
                    {s.assignees.length > 8 && (
                      <span className="text-xs text-white/70">
                        +{s.assignees.length - 8}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

function BigStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur">
      <div className={`mb-2 inline-flex size-9 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="size-5" />
      </div>
      <p className="text-3xl font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px] uppercase tracking-widest text-white/60">
        {label}
      </p>
    </div>
  );
}
