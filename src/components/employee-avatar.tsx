import * as React from "react";
import { cn } from "@/lib/utils";

export type EmployeeAvatarRole =
  | "barista"
  | "server"
  | "cashier"
  | "manager"
  | (string & {});

export type EmployeeAvatarProps = {
  name: string;
  role?: EmployeeAvatarRole;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  shape?: "circle" | "rounded";
  showRing?: boolean;
  status?: "online" | "offline" | "leave" | "warning";
  badgeCount?: number;
  title?: string;
  className?: string;
};

const SIZE_MAP: Record<
  NonNullable<EmployeeAvatarProps["size"]>,
  { box: string; text: string; ring: string; dot: string; badge: string }
> = {
  xs: {
    box: "size-6",
    text: "text-[10px]",
    ring: "ring-1 ring-offset-1",
    dot: "size-1.5 -bottom-0 -right-0",
    badge: "size-3.5 text-[8px] -top-0.5 -right-0.5",
  },
  sm: {
    box: "size-8",
    text: "text-xs",
    ring: "ring-1 ring-offset-1",
    dot: "size-2 -bottom-0 -right-0",
    badge: "size-4 text-[9px] -top-1 -right-1",
  },
  md: {
    box: "size-10",
    text: "text-sm",
    ring: "ring-2 ring-offset-2",
    dot: "size-2.5 -bottom-0.5 -right-0.5",
    badge: "size-5 text-[10px] -top-1 -right-1",
  },
  lg: {
    box: "size-14",
    text: "text-base",
    ring: "ring-2 ring-offset-2",
    dot: "size-3 bottom-0 right-0",
    badge: "size-6 text-xs -top-1 -right-1",
  },
  xl: {
    box: "size-20",
    text: "text-2xl",
    ring: "ring-4 ring-offset-2",
    dot: "size-3.5 bottom-1 right-1",
    badge: "size-7 text-xs -top-1 -right-1",
  },
};

const ROLE_GRADIENT: Record<string, string> = {
  barista: "from-amber-500 via-orange-500 to-rose-500",
  server: "from-emerald-500 via-teal-500 to-cyan-500",
  cashier: "from-sky-500 via-blue-500 to-indigo-500",
  manager: "from-violet-500 via-fuchsia-500 to-pink-500",
};

const ROLE_RING: Record<string, string> = {
  barista: "ring-orange-300",
  server: "ring-emerald-300",
  cashier: "ring-blue-300",
  manager: "ring-fuchsia-300",
};

const STATUS_COLOR: Record<
  NonNullable<EmployeeAvatarProps["status"]>,
  string
> = {
  online: "bg-emerald-500 ring-emerald-200 dark:ring-emerald-900",
  offline: "bg-slate-400 ring-slate-200 dark:ring-slate-800",
  leave: "bg-amber-500 ring-amber-200 dark:ring-amber-900",
  warning: "bg-red-500 ring-red-200 dark:ring-red-900",
};

function deriveInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const tokens = trimmed.split(/\s+/);
  if (tokens.length === 1) {
    return tokens[0].slice(0, 2).toUpperCase();
  }
  const first = tokens[0]?.[0] ?? "";
  const last = tokens[tokens.length - 1]?.[0] ?? "";
  return `${first}${last}`.toUpperCase();
}

function hashHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  }
  return ((h % 360) + 360) % 360;
}

function fallbackGradient(name: string): string {
  const hue = hashHue(name);
  const hue2 = (hue + 35) % 360;
  return `linear-gradient(135deg, hsl(${hue} 70% 50%), hsl(${hue2} 70% 45%))`;
}

export function EmployeeAvatar({
  name,
  role,
  src,
  size = "md",
  shape = "circle",
  showRing = false,
  status,
  badgeCount,
  title,
  className,
}: EmployeeAvatarProps): React.ReactElement {
  const sizing = SIZE_MAP[size];
  const initials = deriveInitials(name);
  const shapeCls = shape === "circle" ? "rounded-full" : "rounded-lg";
  const gradient = role && ROLE_GRADIENT[role];
  const ringCls = role && ROLE_RING[role];
  const inlineStyle: React.CSSProperties | undefined = gradient
    ? undefined
    : { backgroundImage: fallbackGradient(name) };

  return (
    <span
      className={cn("relative inline-flex shrink-0", className)}
      title={title ?? name}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center overflow-hidden font-semibold text-white shadow-sm",
          sizing.box,
          shapeCls,
          showRing && [
            sizing.ring,
            "ring-offset-background",
            ringCls ?? "ring-primary/40",
          ],
          gradient && ["bg-gradient-to-br", gradient],
        )}
        style={inlineStyle}
        aria-label={`Ảnh đại diện của ${name}`}
      >
        {src ? (
          <img
            src={src}
            alt={name}
            className={cn("size-full object-cover", shapeCls)}
            loading="lazy"
          />
        ) : (
          <span className={cn("select-none tracking-tight", sizing.text)}>
            {initials}
          </span>
        )}
      </span>
      {status && (
        <span
          className={cn(
            "absolute rounded-full ring-2 ring-background",
            sizing.dot,
            STATUS_COLOR[status],
          )}
          aria-label={`Trạng thái: ${status}`}
          role="status"
        />
      )}
      {typeof badgeCount === "number" && badgeCount > 0 && (
        <span
          className={cn(
            "absolute inline-flex items-center justify-center rounded-full bg-red-500 text-white font-bold ring-2 ring-background tabular-nums",
            sizing.badge,
          )}
          aria-label={`${badgeCount} thông báo mới`}
        >
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}
    </span>
  );
}

export type EmployeeAvatarStackProps = {
  employees: Array<{
    id: string | number;
    name: string;
    role?: EmployeeAvatarRole;
    src?: string | null;
  }>;
  size?: EmployeeAvatarProps["size"];
  max?: number;
  showRing?: boolean;
  className?: string;
};

export function EmployeeAvatarStack({
  employees,
  size = "sm",
  max = 5,
  showRing = true,
  className,
}: EmployeeAvatarStackProps): React.ReactElement {
  const shown = employees.slice(0, max);
  const overflow = employees.length - shown.length;
  const sizing = SIZE_MAP[size];
  return (
    <div
      className={cn("inline-flex items-center -space-x-2", className)}
      role="group"
      aria-label={`${employees.length} nhân viên`}
    >
      {shown.map((e) => (
        <EmployeeAvatar
          key={e.id}
          name={e.name}
          role={e.role}
          src={e.src}
          size={size}
          showRing={showRing}
          className="border-2 border-background rounded-full"
        />
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full border-2 border-background bg-muted text-muted-foreground font-medium tabular-nums",
            sizing.box,
            sizing.text,
          )}
          title={`Và ${overflow} người khác`}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
