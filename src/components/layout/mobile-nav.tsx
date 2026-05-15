"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  User,
  Users,
  CalendarClock,
  ClipboardCheck,
  Wallet,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SidebarBadgeMap } from "./sidebar";

type NavLabels = {
  dashboard: string;
  me: string;
  employees: string;
  shifts: string;
  attendance: string;
  leave: string;
  tasks: string;
  payroll: string;
  reports: string;
  peopleCalendar: string;
  audit: string;
  settings: string;
  changelog: string;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  dotCount?: number;
};

export function MobileNav({
  labels,
  badges,
  isAdmin = false,
  hasEmployeeProfile = false,
}: {
  labels: NavLabels;
  badges?: SidebarBadgeMap;
  isAdmin?: boolean;
  hasEmployeeProfile?: boolean;
}) {
  const pathname = usePathname();

  const items: NavItem[] = isAdmin
    ? [
        {
          href: "/",
          label: labels.dashboard,
          icon: LayoutDashboard,
          dotCount: badges?.birthdaysToday,
        },
        { href: "/employees", label: labels.employees, icon: Users },
        { href: "/shifts", label: labels.shifts, icon: CalendarClock },
        {
          href: "/attendance",
          label: labels.attendance,
          icon: ClipboardCheck,
          dotCount: badges?.openAttendance,
        },
        { href: "/payroll", label: labels.payroll, icon: Wallet },
      ]
    : [
        {
          href: "/",
          label: labels.dashboard,
          icon: LayoutDashboard,
          dotCount: badges?.birthdaysToday,
        },
        ...(hasEmployeeProfile
          ? [{ href: "/me", label: labels.me, icon: User } satisfies NavItem]
          : []),
        { href: "/shifts", label: labels.shifts, icon: CalendarClock },
        {
          href: "/attendance",
          label: labels.attendance,
          icon: ClipboardCheck,
          dotCount: badges?.openAttendance,
        },
        { href: "/tasks", label: labels.tasks, icon: ListChecks },
      ];

  // Cap to 5 visible items just in case
  const visible = items.slice(0, 5);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Điều hướng nhanh"
    >
      {visible.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active ? (
              <span
                aria-hidden="true"
                className="absolute top-1 size-1 rounded-full bg-primary"
              />
            ) : null}
            <div className="relative">
              <Icon className="size-5" />
              {item.dotCount && item.dotCount > 0 ? (
                <span className="absolute -right-1.5 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-bold leading-none text-white shadow">
                  {item.dotCount > 9 ? "9+" : item.dotCount}
                </span>
              ) : null}
            </div>
            <span className="truncate leading-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
