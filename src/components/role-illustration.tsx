import type { ReactNode } from "react";
import { cn, ROLE_LABELS } from "@/lib/utils";

const KNOWN_ROLES = new Set(["barista", "server", "cashier", "manager"]);

export type RoleIllustrationProps = {
  role: string;
  size?: number;
  className?: string;
  fallback?: ReactNode;
};

export function RoleIllustration({
  role,
  size = 64,
  className,
  fallback,
}: RoleIllustrationProps) {
  if (KNOWN_ROLES.has(role)) {
    return (
      <img
        src={`/illustrations/role-${role}.png`}
        width={size}
        height={size}
        loading="lazy"
        alt=""
        className={cn("rounded-xl object-cover", className)}
      />
    );
  }

  if (fallback !== undefined) {
    return <>{fallback}</>;
  }

  const label = ROLE_LABELS[role] ?? role;
  const initial = label.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.max(12, size * 0.4) }}
      className={cn(
        "flex items-center justify-center rounded-xl bg-muted text-muted-foreground font-semibold",
        className,
      )}
    >
      {initial}
    </div>
  );
}
