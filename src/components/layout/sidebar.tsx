"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  LayoutDashboard,
  User,
  Users,
  CalendarClock,
  Calendar,
  ClipboardCheck,
  Wallet,
  BarChart3,
  Settings,
  Plane,
  ListChecks,
  ScrollText,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  Star,
  StarOff,
  Activity,
  Flame,
  Heart,
  AlertTriangle,
  Trophy,
  Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { setSidebarCollapsed } from "@/lib/sidebar-state";
import {
  STORAGE_KEY as PINNED_STORAGE_KEY,
  MAX_PINNED,
  getPinned,
  setPinned,
} from "@/lib/pinned-nav";

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

export type SidebarBadgeMap = {
  birthdaysToday?: number;
  pendingLeaves?: number;
  overdueTasks?: number;
  openAttendance?: number;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: { count: number; tone: "primary" | "warning" | "destructive" | "info" };
};

export function Sidebar({
  labels,
  appName,
  appTagline,
  badges,
  collapsed = false,
  isAdmin = false,
  hasEmployeeProfile = false,
}: {
  labels: NavLabels;
  appName: string;
  appTagline: string;
  badges?: SidebarBadgeMap;
  collapsed?: boolean;
  isAdmin?: boolean;
  hasEmployeeProfile?: boolean;
}) {
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [pinned, setPinnedState] = useState<string[]>([]);

  // Hydrate pinned set from localStorage on mount; sync across tabs.
  useEffect(() => {
    setPinnedState(getPinned());
    function onStorage(e: StorageEvent) {
      if (e.key !== null && e.key !== PINNED_STORAGE_KEY) return;
      setPinnedState(getPinned());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function toggle() {
    startTransition(async () => {
      await setSidebarCollapsed(!collapsed);
    });
  }

  const togglePinned = useCallback(
    (href: string) => {
      const current = getPinned();
      const exists = current.includes(href);
      let next: string[];
      if (exists) {
        next = current.filter((h) => h !== href);
      } else {
        if (current.length >= MAX_PINNED) return;
        next = [...current, href];
      }
      setPinned(next);
      setPinnedState(next);
    },
    [],
  );

  const nav: NavItem[] = [
    {
      href: "/",
      label: labels.dashboard,
      icon: LayoutDashboard,
      badge: badges?.birthdaysToday
        ? { count: badges.birthdaysToday, tone: "primary" }
        : undefined,
    },
    ...(hasEmployeeProfile
      ? [{ href: "/me", label: labels.me, icon: User }]
      : []),
    { href: "/employees", label: labels.employees, icon: Users },
    { href: "/shifts", label: labels.shifts, icon: CalendarClock },
    {
      href: "/attendance",
      label: labels.attendance,
      icon: ClipboardCheck,
      badge: badges?.openAttendance
        ? { count: badges.openAttendance, tone: "info" }
        : undefined,
    },
    {
      href: "/leave",
      label: labels.leave,
      icon: Plane,
      badge: badges?.pendingLeaves
        ? { count: badges.pendingLeaves, tone: "warning" }
        : undefined,
    },
    {
      href: "/tasks",
      label: labels.tasks,
      icon: ListChecks,
      badge: badges?.overdueTasks
        ? { count: badges.overdueTasks, tone: "destructive" }
        : undefined,
    },
    { href: "/payroll", label: labels.payroll, icon: Wallet },
    { href: "/reports", label: labels.reports, icon: BarChart3 },
    ...(isAdmin
      ? [{ href: "/people-calendar", label: labels.peopleCalendar, icon: Calendar }]
      : []),
    ...(isAdmin
      ? [{ href: "/audit", label: labels.audit, icon: ScrollText }]
      : []),
    ...(isAdmin
      ? [
          { href: "/admin/insights", label: "Trung tâm phân tích", icon: Gauge },
          { href: "/admin/dashboard-v2", label: "Bảng điều khiển v2", icon: LayoutDashboard },
          { href: "/burnout-board", label: "Cảnh báo quá tải", icon: AlertTriangle },
          { href: "/team-pulse-board", label: "Khả năng vận hành", icon: Heart },
          { href: "/wellness-trends-board", label: "Xu hướng vận hành", icon: Activity },
          { href: "/leaderboard", label: "Bảng xếp hạng", icon: Trophy },
          { href: "/anniversaries-board", label: "Kỷ niệm gắn bó", icon: Sparkles },
        ]
      : []),
    ...(hasEmployeeProfile
      ? [
          { href: "/me/streak", label: "Chuỗi làm việc", icon: Flame },
          { href: "/me/recap-board", label: "Tóm tắt 7 ngày", icon: Sparkles },
        ]
      : []),
    { href: "/settings", label: labels.settings, icon: Settings },
    { href: "/changelog", label: labels.changelog, icon: Sparkles },
  ];

  // Resolve pinned hrefs to the *live* nav items so badges still work and
  // hrefs that no longer match (perm changes, etc.) are silently dropped.
  const navByHref = new Map<string, NavItem>(nav.map((item) => [item.href, item]));
  const pinnedItems: NavItem[] = pinned
    .map((href) => navByHref.get(href))
    .filter((item): item is NavItem => item !== undefined);

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r bg-card/30 backdrop-blur transition-[width] duration-200 ease-out lg:flex",
        collapsed ? "w-16" : "w-60",
      )}
      data-collapsed={collapsed}
    >
      <div
        className={cn(
          "flex h-16 items-center border-b",
          collapsed ? "justify-center px-2" : "gap-2 px-6",
        )}
      >
        <Image
          src="/brand/logo-96.png"
          alt={appName}
          width={36}
          height={36}
          className="rounded-md shrink-0"
          priority
        />
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-sm font-bold leading-tight truncate">{appName}</div>
            <div className="text-xs text-muted-foreground truncate">{appTagline}</div>
          </div>
        )}
      </div>
      <nav className={cn("flex-1 space-y-1 overflow-y-auto", collapsed ? "p-2" : "p-3")}>
        {pinnedItems.length > 0 && (
          <>
            {!collapsed && (
              <div className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Yêu thích
              </div>
            )}
            <div className="space-y-1">
              {pinnedItems.map((item) => (
                <NavRow
                  key={`pinned-${item.href}`}
                  item={item}
                  collapsed={collapsed}
                  pathname={pathname}
                  pinned
                  canPin
                  onTogglePin={togglePinned}
                />
              ))}
            </div>
            <div className="my-2 border-t border-border/60" aria-hidden="true" />
          </>
        )}
        {nav.map((item) => {
          const isPinned = pinned.includes(item.href);
          const canPin = isPinned || pinned.length < MAX_PINNED;
          return (
            <NavRow
              key={item.href}
              item={item}
              collapsed={collapsed}
              pathname={pathname}
              pinned={isPinned}
              canPin={canPin}
              onTogglePin={togglePinned}
            />
          );
        })}
      </nav>
      <div className={cn("border-t", collapsed ? "p-2" : "p-3")}>
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          title={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
          aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
          aria-expanded={!collapsed}
          className={cn(
            "flex w-full items-center rounded-md text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            collapsed ? "justify-center py-2" : "gap-2 px-3 py-2",
            pending && "opacity-60",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <>
              <PanelLeftClose className="size-4" />
              <span>Thu gọn sidebar</span>
            </>
          )}
        </button>
        {!collapsed && (
          <div className="mt-2 px-3 text-[10px] text-muted-foreground/70">
            <p className="font-medium">{appName}</p>
            <p className="opacity-70">v1.0 · {new Date().getFullYear()}</p>
          </div>
        )}
      </div>
    </aside>
  );
}

function NavRow({
  item,
  collapsed,
  pathname,
  pinned,
  canPin,
  onTogglePin,
}: {
  item: NavItem;
  collapsed: boolean;
  pathname: string;
  pinned: boolean;
  canPin: boolean;
  onTogglePin: (href: string) => void;
}) {
  const Icon = item.icon;
  const active =
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

  function handleContextMenu(e: React.MouseEvent<HTMLAnchorElement>) {
    // Right-click toggles pin (only if pinning is allowed or already pinned).
    if (!canPin && !pinned) return;
    e.preventDefault();
    onTogglePin(item.href);
  }

  function handleStarClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    onTogglePin(item.href);
  }

  const starTitle = pinned
    ? "Bỏ ghim khỏi Yêu thích"
    : canPin
      ? "Ghim vào Yêu thích"
      : `Tối đa ${MAX_PINNED} mục yêu thích`;

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      onContextMenu={handleContextMenu}
      className={cn(
        "group relative flex items-center rounded-md text-sm font-medium transition-colors",
        collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-foreground/70 hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {item.badge && !collapsed && (
        <NavBadge count={item.badge.count} tone={item.badge.tone} active={active} />
      )}
      {item.badge && collapsed && (
        <span
          className={cn(
            "absolute right-1 top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-1 text-[9px] font-bold tabular-nums shadow-sm",
            toneDot(item.badge.tone),
          )}
        >
          {item.badge.count > 9 ? "9+" : item.badge.count}
        </span>
      )}
      {!collapsed && (canPin || pinned) && (
        <button
          type="button"
          onClick={handleStarClick}
          title={starTitle}
          aria-label={starTitle}
          aria-pressed={pinned}
          className={cn(
            "flex size-5 items-center justify-center rounded transition-opacity",
            pinned
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 focus:opacity-100",
            active
              ? "text-white/90 hover:text-white"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {pinned ? (
            <Star
              className={cn(
                "size-3.5",
                active ? "fill-amber-200" : "fill-amber-400 text-amber-500",
              )}
            />
          ) : (
            <StarOff className="size-3.5" />
          )}
        </button>
      )}
      {collapsed && pinned && (
        <span
          className="pointer-events-none absolute left-0.5 top-0.5 size-1.5 rounded-full bg-amber-400 shadow"
          aria-hidden="true"
        />
      )}
      {collapsed && (
        <span className="pointer-events-none absolute left-full ml-2 hidden whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs font-medium text-foreground shadow-md group-hover:block z-50">
          {item.label}
        </span>
      )}
    </Link>
  );
}

function NavBadge({
  count,
  tone,
  active,
}: {
  count: number;
  tone: "primary" | "warning" | "destructive" | "info";
  active: boolean;
}) {
  const tones: Record<typeof tone, string> = {
    primary: "bg-primary/15 text-primary",
    warning: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    destructive: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    info: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  };
  return (
    <span
      className={cn(
        "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums",
        active ? "bg-white/25 text-white" : tones[tone],
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function toneDot(tone: "primary" | "warning" | "destructive" | "info") {
  switch (tone) {
    case "primary":
      return "bg-primary text-primary-foreground";
    case "warning":
      return "bg-amber-500 text-white";
    case "destructive":
      return "bg-rose-500 text-white";
    case "info":
      return "bg-emerald-500 text-white";
  }
}
