import { ACHIEVEMENTS, type AchievementKey } from "@/lib/achievements";
import { AchievementBadge } from "./achievement-badge";

export function AchievementGrid({ earned }: { earned: AchievementKey[] }) {
  const earnedSet = new Set<AchievementKey>(earned);
  const total = ACHIEVEMENTS.length;
  const count = ACHIEVEMENTS.reduce(
    (acc, def) => acc + (earnedSet.has(def.key) ? 1 : 0),
    0,
  );

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          Đã đạt{" "}
          <span className="text-foreground font-bold tabular-nums">{count}</span>
          /{total}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {ACHIEVEMENTS.map((def) => (
          <AchievementBadge
            key={def.key}
            badgeKey={def.key}
            earned={earnedSet.has(def.key)}
          />
        ))}
      </div>
    </div>
  );
}
