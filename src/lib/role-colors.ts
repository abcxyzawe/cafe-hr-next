import { ROLE_LABELS } from "@/lib/utils";

/**
 * Per-role visual palette aligned with `ROLE_GRADIENT` used in `Avatar`.
 * Centralised so calendar / chips / event tints stay in sync.
 *
 * - `dot`        — solid bg for tiny circles
 * - `border`     — left border accent (e.g. `border-l-4`)
 * - `tint`       — soft translucent bg for event pills / row tints
 * - `text`       — readable foreground on tint or transparent surfaces
 * - `activeBg`   — chip background when chip is selected
 * - `ring`       — focus / hover ring colour
 */
export type RoleVisual = {
  dot: string;
  border: string;
  tint: string;
  text: string;
  activeBg: string;
  ring: string;
};

export const ROLE_KEYS = ["barista", "server", "cashier", "manager"] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export const ROLE_VISUAL: Record<RoleKey, RoleVisual> = {
  barista: {
    dot: "bg-amber-500",
    border: "border-amber-500",
    tint: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-300",
    activeBg: "bg-amber-500/15",
    ring: "ring-amber-500/40",
  },
  server: {
    dot: "bg-sky-500",
    border: "border-sky-500",
    tint: "bg-sky-500/10",
    text: "text-sky-700 dark:text-sky-300",
    activeBg: "bg-sky-500/15",
    ring: "ring-sky-500/40",
  },
  cashier: {
    dot: "bg-rose-500",
    border: "border-rose-500",
    tint: "bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-300",
    activeBg: "bg-rose-500/15",
    ring: "ring-rose-500/40",
  },
  manager: {
    dot: "bg-emerald-500",
    border: "border-emerald-500",
    tint: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
    activeBg: "bg-emerald-500/15",
    ring: "ring-emerald-500/40",
  },
};

export function isRoleKey(value: string): value is RoleKey {
  return (ROLE_KEYS as readonly string[]).includes(value);
}

export function getRoleVisual(role: string): RoleVisual | null {
  return isRoleKey(role) ? ROLE_VISUAL[role] : null;
}

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

/** Parse `?roles=barista,server` into a deduped list of valid keys. */
export function parseRolesParam(value: string | undefined): RoleKey[] {
  if (!value) return [];
  const out = new Set<RoleKey>();
  for (const raw of value.split(",")) {
    const t = raw.trim();
    if (isRoleKey(t)) out.add(t);
  }
  return Array.from(out);
}
