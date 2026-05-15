export type LoyaltyTier = "regular" | "silver" | "gold" | "vip";

export type LoyaltyCustomer = {
  id: string;
  name: string;
  phone: string;
  notes: string;
  tier: LoyaltyTier;
  visitCount: number;
  lastVisit: string | null;
  createdAt: string;
};

export const TIER_LABELS: Record<LoyaltyTier, string> = {
  regular: "Khách thường",
  silver: "Bạc",
  gold: "Vàng",
  vip: "VIP",
};

// Tailwind class strings for left-border tint per tier.
export const TIER_TINTS: Record<LoyaltyTier, string> = {
  regular: "border-l-4 border-l-slate-300 dark:border-l-slate-600",
  silver: "border-l-4 border-l-zinc-400 dark:border-l-zinc-300",
  gold: "border-l-4 border-l-amber-500 dark:border-l-amber-400",
  vip: "border-l-4 border-l-fuchsia-600 dark:border-l-fuchsia-400",
};

export const TIER_BADGES: Record<LoyaltyTier, string> = {
  regular:
    "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-200",
  silver: "bg-zinc-200 text-zinc-800 dark:bg-zinc-500/20 dark:text-zinc-100",
  gold: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
  vip: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/15 dark:text-fuchsia-200",
};

export const TIER_OPTIONS: ReadonlyArray<LoyaltyTier> = [
  "regular",
  "silver",
  "gold",
  "vip",
];
