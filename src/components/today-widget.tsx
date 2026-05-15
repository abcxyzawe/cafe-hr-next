import Link from "next/link";
import { Plane, Activity, CalendarClock, Cake } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABELS } from "@/lib/utils";
import { LiveElapsed } from "@/components/live-elapsed";

type LeavePerson = {
  id: number;
  name: string;
  avatarUrl: string | null;
  type: string;
};

type OnShiftPerson = {
  id: number;
  name: string;
  avatarUrl: string | null;
  role: string;
  startedAt: Date;
};

type BirthdayPerson = {
  id: number;
  name: string;
  avatarUrl: string | null;
  turningAge: number;
};

const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: "Phép",
  sick: "Ốm",
  personal: "Cá nhân",
  unpaid: "K.lương",
};

const LEAVE_TYPE_VARIANT: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
  annual: "default",
  sick: "warning",
  personal: "secondary",
  unpaid: "destructive",
};

export function TodayWidget({
  onLeave,
  onShift,
  birthdays,
  shiftsToday,
}: {
  onLeave: LeavePerson[];
  onShift: OnShiftPerson[];
  birthdays: BirthdayPerson[];
  shiftsToday: number;
}) {
  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Tình hình hôm nay</CardTitle>
          <CardDescription className="capitalize">{today}</CardDescription>
        </div>
        <Badge variant="secondary" className="gap-1">
          <CalendarClock className="size-3" />
          {shiftsToday} ca xếp lịch
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          {/* On shift now */}
          <Section
            icon={Activity}
            iconClass="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
            title="Đang trong ca"
            count={onShift.length}
            empty="Không có ai đang làm"
          >
            {onShift.slice(0, 4).map((p) => (
              <Link
                key={p.id}
                href={`/employees/${p.id}`}
                className="-mx-1 flex items-center gap-2 rounded-md px-1 py-1 hover:bg-accent"
                data-employee-id={p.id}
              >
                <div className="relative">
                  <Avatar src={p.avatarUrl} alt={p.name} fallback={p.name} size={28} />
                  <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-card" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {ROLE_LABELS[p.role] ?? p.role} ·{" "}
                    <LiveElapsed start={p.startedAt} />
                  </p>
                </div>
              </Link>
            ))}
            {onShift.length > 4 && (
              <p className="px-1 text-[10px] text-muted-foreground">
                +{onShift.length - 4} người khác
              </p>
            )}
          </Section>

          {/* On leave */}
          <Section
            icon={Plane}
            iconClass="bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
            title="Nghỉ phép hôm nay"
            count={onLeave.length}
            empty="Không ai nghỉ"
            href="/leave?view=calendar"
          >
            {onLeave.slice(0, 4).map((p) => (
              <Link
                key={p.id}
                href={`/employees/${p.id}`}
                className="-mx-1 flex items-center gap-2 rounded-md px-1 py-1 hover:bg-accent"
              >
                <Avatar src={p.avatarUrl} alt={p.name} fallback={p.name} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{p.name}</p>
                </div>
                <Badge
                  variant={LEAVE_TYPE_VARIANT[p.type] ?? "secondary"}
                  className="text-[9px]"
                >
                  {LEAVE_TYPE_LABELS[p.type] ?? p.type}
                </Badge>
              </Link>
            ))}
            {onLeave.length > 4 && (
              <p className="px-1 text-[10px] text-muted-foreground">
                +{onLeave.length - 4} người khác
              </p>
            )}
          </Section>

          {/* Birthdays today */}
          <Section
            icon={Cake}
            iconClass="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
            title="Sinh nhật hôm nay"
            count={birthdays.length}
            empty="Không có sinh nhật"
          >
            {birthdays.map((p) => (
              <Link
                key={p.id}
                href={`/employees/${p.id}`}
                className="-mx-1 flex items-center gap-2 rounded-md px-1 py-1 hover:bg-accent"
              >
                <Avatar src={p.avatarUrl} alt={p.name} fallback={p.name} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Tròn {p.turningAge} tuổi 🎂
                  </p>
                </div>
              </Link>
            ))}
          </Section>
        </div>
      </CardContent>
    </Card>
  );
}

function Section({
  icon: Icon,
  iconClass,
  title,
  count,
  empty,
  href,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  title: string;
  count: number;
  empty: string;
  href?: string;
  children: React.ReactNode;
}) {
  const heading = (
    <div className="mb-2 flex items-center gap-2">
      <div className={`flex size-7 items-center justify-center rounded-md ${iconClass}`}>
        <Icon className="size-3.5" />
      </div>
      <h4 className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <span
        className={`ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums ${
          count > 0
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {count}
      </span>
    </div>
  );
  return (
    <div>
      {href ? (
        <Link href={href} className="block hover:opacity-80">
          {heading}
        </Link>
      ) : (
        heading
      )}
      {count === 0 ? (
        <p className="px-1 py-2 text-xs italic text-muted-foreground">{empty}</p>
      ) : (
        <div className="space-y-0.5">{children}</div>
      )}
    </div>
  );
}
