import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS } from "@/lib/utils";
import { PWAInstallBanner } from "@/components/pwa-install-banner";
import { KioskGrid } from "./kiosk-grid";
import { RecentCheckinsTicker } from "./recent-ticker";
import { KioskWeatherClock } from "./kiosk-weather-clock";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kiosk chấm công — Cafe HR",
};

export default async function KioskPage() {
  let employees: Array<{
    id: number;
    name: string;
    role: string;
    avatarUrl: string | null;
    hasPin: boolean;
    onShift: boolean;
  }> = [];
  let recentTicker: Array<{
    id: number;
    action: string;
    summary: string;
    createdAt: string;
  }> = [];
  let error: string | null = null;

  try {
    const [emps, openAttendances, recents] = await Promise.all([
      prisma.employee.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          role: true,
          avatarUrl: true,
          pinHash: true,
        },
      }),
      prisma.attendance.findMany({
        where: { checkOut: null },
        select: { employeeId: true },
      }),
      prisma.activityLog.findMany({
        where: { action: { in: ["kiosk.checkin", "kiosk.checkout"] } },
        orderBy: { id: "desc" },
        take: 6,
        select: { id: true, action: true, summary: true, createdAt: true },
      }),
    ]);
    const openSet = new Set(openAttendances.map((a) => a.employeeId));
    employees = emps.map((e) => ({
      id: e.id,
      name: e.name,
      role: e.role,
      avatarUrl: e.avatarUrl,
      hasPin: !!e.pinHash,
      onShift: openSet.has(e.id),
    }));
    recentTicker = recents.map((r) => ({
      id: r.id,
      action: r.action,
      summary: r.summary,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-amber-50 via-background to-orange-50 dark:from-stone-950 dark:via-background dark:to-stone-900">
      <header className="relative h-32 shrink-0 overflow-hidden">
        <Image
          src="/assets/kiosk-welcome.jpg"
          alt=""
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/20" />
        <div className="relative z-10 flex h-full items-center justify-between px-8 text-white">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/logo-96.png"
              alt="Cafe HR"
              width={48}
              height={48}
              className="rounded-xl shadow"
              priority
            />
            <div>
              <h1 className="text-2xl font-bold tracking-tight drop-shadow">
                Chấm công Kiosk
              </h1>
              <p className="text-xs opacity-90 drop-shadow">
                Chọn ảnh của bạn và nhập PIN để check-in / check-out
              </p>
            </div>
          </div>
          <KioskWeatherClock />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 lg:p-10">
        {error ? (
          <p className="text-center text-sm text-destructive">{error}</p>
        ) : (
          <KioskGrid
            employees={employees.map((e) => ({
              ...e,
              roleLabel: ROLE_LABELS[e.role] ?? e.role,
            }))}
          />
        )}
      </main>

      <footer className="shrink-0 border-t bg-card/40 px-6 py-3 backdrop-blur">
        <RecentCheckinsTicker initial={recentTicker} />
      </footer>

      <PWAInstallBanner />
    </div>
  );
}

