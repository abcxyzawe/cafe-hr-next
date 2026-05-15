import Link from "next/link";
import {
  UserPlus,
  CalendarPlus,
  Calendar,
  Plane,
  ListChecks,
  Wallet,
  Tablet,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Action = {
  href: string;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  external?: boolean;
};

const ACTIONS_ADMIN: Action[] = [
  {
    href: "/employees",
    label: "Thêm nhân viên",
    hint: "Quản lý đội ngũ",
    icon: UserPlus,
    accent:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  {
    href: "/shifts",
    label: "Lập lịch ca",
    hint: "Tuần này / sau",
    icon: CalendarPlus,
    accent:
      "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  },
  {
    href: "/leave",
    label: "Đơn nghỉ phép",
    hint: "Duyệt + tạo",
    icon: Plane,
    accent:
      "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  },
  {
    href: "/tasks",
    label: "Giao việc",
    hint: "Task hôm nay",
    icon: ListChecks,
    accent:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  },
  {
    href: "/payroll",
    label: "Bảng lương",
    hint: "Excel · CSV · In",
    icon: Wallet,
    accent:
      "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  },
  {
    href: "/kiosk",
    label: "Kiosk chấm công",
    hint: "Mở tablet self-service",
    icon: Tablet,
    accent:
      "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200",
    external: true,
  },
  {
    href: "/people-calendar",
    label: "Lịch sự kiện đội",
    hint: "Sinh nhật · nghỉ phép",
    icon: Calendar,
    accent:
      "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
  },
];

const ACTIONS_STAFF: Action[] = [
  {
    href: "/attendance",
    label: "Chấm công",
    hint: "Check-in / out",
    icon: CalendarPlus,
    accent:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  {
    href: "/shifts",
    label: "Lịch ca tuần",
    hint: "Xem lịch của bạn",
    icon: CalendarPlus,
    accent:
      "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  },
  {
    href: "/leave",
    label: "Đơn nghỉ phép",
    hint: "Xem trạng thái",
    icon: Plane,
    accent:
      "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  },
  {
    href: "/tasks",
    label: "Việc của tôi",
    hint: "Task được giao",
    icon: ListChecks,
    accent:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  },
];

export function QuickActions({ isAdmin }: { isAdmin: boolean }) {
  const actions = isAdmin ? ACTIONS_ADMIN : ACTIONS_STAFF;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Truy cập nhanh</CardTitle>
        <CardDescription>Các thao tác thường dùng</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.href}
              href={a.href}
              target={a.external ? "_blank" : undefined}
              rel={a.external ? "noopener" : undefined}
              className="group relative flex flex-col items-start gap-2 rounded-xl border bg-card p-3 transition-all hover:scale-[1.02] hover:shadow-md"
            >
              <div
                className={`flex size-9 items-center justify-center rounded-lg ${a.accent}`}
              >
                <Icon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight">
                  {a.label}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {a.hint}
                </p>
              </div>
              {a.external && (
                <ArrowUpRight className="absolute right-2 top-2 size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              )}
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
