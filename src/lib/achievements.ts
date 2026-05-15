/**
 * Achievement Badges — pure logic.
 *
 * Defines the badge catalogue and a pure `computeEarned` function that maps
 * pre-aggregated employee facts to a list of earned badge keys. No Prisma,
 * no I/O — safe to import from anywhere (server or client).
 */

export type AchievementTier = "bronze" | "silver" | "gold";

export type AchievementKey =
  | "first_shift"
  | "ten_shifts"
  | "fifty_shifts"
  | "hundred_shifts"
  | "month_perfect"
  | "streak_7"
  | "streak_14"
  | "early_bird"
  | "night_owl"
  | "kudos_5";

export type AchievementIconName =
  | "sprout"
  | "award"
  | "medal"
  | "trophy"
  | "sparkles"
  | "flame"
  | "sunrise"
  | "moon"
  | "heart";

export type AchievementDef = {
  key: AchievementKey;
  label: string;
  description: string;
  iconName: AchievementIconName;
  tier: AchievementTier;
};

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  {
    key: "first_shift",
    label: "Lần đầu lên ca",
    description: "Hoàn thành ca đầu tiên",
    iconName: "sprout",
    tier: "bronze",
  },
  {
    key: "ten_shifts",
    label: "10 ca",
    description: "Hoàn thành 10 ca",
    iconName: "award",
    tier: "bronze",
  },
  {
    key: "fifty_shifts",
    label: "50 ca",
    description: "Hoàn thành 50 ca",
    iconName: "medal",
    tier: "silver",
  },
  {
    key: "hundred_shifts",
    label: "100 ca",
    description: "Hoàn thành 100 ca",
    iconName: "trophy",
    tier: "gold",
  },
  {
    key: "month_perfect",
    label: "Tháng hoàn hảo",
    description: "Có ca trong cả 4 tuần liên tiếp tháng này",
    iconName: "sparkles",
    tier: "silver",
  },
  {
    key: "streak_7",
    label: "Streak 7 ngày",
    description: "Làm 7 ngày liên tiếp",
    iconName: "flame",
    tier: "bronze",
  },
  {
    key: "streak_14",
    label: "Streak 14 ngày",
    description: "Làm 14 ngày liên tiếp",
    iconName: "flame",
    tier: "silver",
  },
  {
    key: "early_bird",
    label: "Dậy sớm",
    description: "5 ca sáng (trước 8:00) đúng giờ",
    iconName: "sunrise",
    tier: "bronze",
  },
  {
    key: "night_owl",
    label: "Thợ đêm",
    description: "5 ca tối hoàn thành",
    iconName: "moon",
    tier: "bronze",
  },
  {
    key: "kudos_5",
    label: "Đáng yêu",
    description: "Nhận ≥ 5 lượt khen",
    iconName: "heart",
    tier: "silver",
  },
] as const;

/**
 * Pre-aggregated facts about an employee, ready to be tested against badge
 * thresholds. Built by `getEarnedBadges` (server-side accessor).
 */
export type EmployeeFacts = {
  /** Number of attendance rows that have a checkOut. */
  completedShifts: number;
  /**
   * ISO-week keys (e.g. "2026-W20") of weeks within the *current calendar
   * month* that have at least one attendance row.
   */
  weeksThisMonth: Set<string>;
  /** Current consecutive-days streak (today or yesterday). */
  currentStreak: number;
  /** Longest historical consecutive-days streak. */
  longestStreak: number;
  /**
   * Morning shifts (start < 08:00) where the employee checked in within a
   * 10-minute grace window of the scheduled start time.
   */
  earlyOnTimeShifts: number;
  /** Evening shifts (start >= 17:00) that have a checkOut. */
  eveningCompletedShifts: number;
  /** Total kudos received from activity log. */
  kudosCount: number;
};

/**
 * Pure rule engine — given the facts, return which badge keys are earned.
 * Order of returned keys mirrors `ACHIEVEMENTS`.
 */
export function computeEarned(facts: EmployeeFacts): AchievementKey[] {
  const earned: AchievementKey[] = [];
  if (facts.completedShifts >= 1) earned.push("first_shift");
  if (facts.completedShifts >= 10) earned.push("ten_shifts");
  if (facts.completedShifts >= 50) earned.push("fifty_shifts");
  if (facts.completedShifts >= 100) earned.push("hundred_shifts");
  if (facts.weeksThisMonth.size >= 4) earned.push("month_perfect");
  if (facts.longestStreak >= 7) earned.push("streak_7");
  if (facts.longestStreak >= 14) earned.push("streak_14");
  if (facts.earlyOnTimeShifts >= 5) earned.push("early_bird");
  if (facts.eveningCompletedShifts >= 5) earned.push("night_owl");
  if (facts.kudosCount >= 5) earned.push("kudos_5");
  return earned;
}

/**
 * Look up a badge definition by key. Returns `undefined` for unknown keys.
 */
export function getAchievement(
  key: AchievementKey,
): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.key === key);
}

/**
 * Numeric weight per tier — useful when picking the "newest"/"best" badge
 * an employee has earned (heuristic, since we don't store earned-at).
 */
export const TIER_WEIGHT: Record<AchievementTier, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
};
