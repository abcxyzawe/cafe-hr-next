import {
  Award,
  Flame,
  Heart,
  Lock,
  Medal,
  Moon,
  Sparkles,
  Sprout,
  Sunrise,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getAchievement,
  type AchievementIconName,
  type AchievementKey,
  type AchievementTier,
} from "@/lib/achievements";

type IconComponent = React.ComponentType<{ className?: string }>;

const ICON_MAP: Record<AchievementIconName, IconComponent> = {
  sprout: Sprout,
  award: Award,
  medal: Medal,
  trophy: Trophy,
  sparkles: Sparkles,
  flame: Flame,
  sunrise: Sunrise,
  moon: Moon,
  heart: Heart,
};

const TIER_RING: Record<AchievementTier, string> = {
  bronze: "ring-amber-400/60 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  silver: "ring-slate-400/60 bg-slate-50 text-slate-700 dark:bg-slate-900/40 dark:text-slate-200",
  gold: "ring-yellow-400/70 bg-yellow-50 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300",
};

type Size = "sm" | "md";

const SIZE_STYLES: Record<Size, { wrap: string; icon: string; label: string }> = {
  sm: {
    wrap: "gap-1.5 px-2 py-1 text-[11px]",
    icon: "size-3.5",
    label: "max-w-[7.5rem]",
  },
  md: {
    wrap: "gap-2 px-2.5 py-1.5 text-xs",
    icon: "size-4",
    label: "max-w-[9rem]",
  },
};

export function AchievementBadge({
  badgeKey,
  earned,
  size = "md",
}: {
  badgeKey: AchievementKey;
  earned: boolean;
  size?: Size;
}) {
  const def = getAchievement(badgeKey);
  if (!def) return null;
  const Icon = ICON_MAP[def.iconName];
  const sizing = SIZE_STYLES[size];

  return (
    <span
      title={`${def.label} — ${def.description}`}
      className={cn(
        "relative inline-flex items-center rounded-full ring-1 font-medium",
        sizing.wrap,
        earned
          ? TIER_RING[def.tier]
          : "ring-border bg-muted/60 text-muted-foreground grayscale",
      )}
    >
      <Icon
        className={cn(
          sizing.icon,
          earned ? "" : "opacity-60",
        )}
        aria-hidden
      />
      <span className={cn("truncate", sizing.label)}>{def.label}</span>
      {!earned && (
        <Lock
          className={cn(
            "ml-0.5 opacity-70",
            size === "sm" ? "size-2.5" : "size-3",
          )}
          aria-label="chưa đạt"
        />
      )}
    </span>
  );
}
