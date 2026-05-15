import {
  Activity,
  UserPlus,
  UserMinus,
  Sparkles,
  Pencil,
  LogIn,
  LogOut,
  CalendarPlus,
  CalendarMinus,
  Clock,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

type ActivityItem = {
  id: number;
  action: string;
  summary: string;
  createdAt: Date;
  user: { id: number; name: string; email: string; role: string } | null;
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "employee.create": UserPlus,
  "employee.update": Pencil,
  "employee.delete": UserMinus,
  "employee.avatar": Sparkles,
  "employee.avatar.batch": Sparkles,
  "shift.create": CalendarPlus,
  "shift.delete": CalendarMinus,
  "attendance.checkin": LogIn,
  "attendance.checkout": LogOut,
  "user.login": LogIn,
  "user.logout": LogOut,
  "user.create": UserPlus,
  "user.password": Pencil,
};

const ACCENT_MAP: Record<string, string> = {
  "employee.create": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  "employee.delete": "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  "employee.avatar": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "employee.avatar.batch": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "shift.delete": "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  "user.login": "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  "user.logout": "bg-muted text-muted-foreground",
};

function relativeTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} ngày trước`;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

export function ActivityRow({ item }: { item: ActivityItem }) {
  const Icon = ICON_MAP[item.action] ?? Clock;
  const accent = ACCENT_MAP[item.action] ?? "bg-secondary text-secondary-foreground";
  return (
    <div className="flex items-start gap-3">
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-full ${accent}`}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm">{item.summary}</p>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          {item.user && (
            <>
              <Avatar fallback={item.user.name} size={14} className="size-3.5" />
              <span className="truncate">{item.user.name}</span>
              <span>·</span>
            </>
          )}
          <span>{relativeTime(item.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
        <Activity className="size-6 opacity-40" />
        <p>Chưa có hoạt động nào</p>
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const Icon = ICON_MAP[item.action] ?? Clock;
        const accent = ACCENT_MAP[item.action] ?? "bg-secondary text-secondary-foreground";
        return (
          <li key={item.id} className="flex items-start gap-3">
            <div
              className={`flex size-8 shrink-0 items-center justify-center rounded-full ${accent}`}
            >
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm">{item.summary}</p>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                {item.user && (
                  <>
                    <Avatar fallback={item.user.name} size={14} className="size-3.5" />
                    <span className="truncate">{item.user.name}</span>
                    <span>·</span>
                  </>
                )}
                <span>{relativeTime(item.createdAt)}</span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
