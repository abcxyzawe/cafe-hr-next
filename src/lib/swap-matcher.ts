// Pure scoring logic for the "Smart shift swap matcher" feature.
// No DB, no server-only imports — safe to unit-test or call from any layer.

import { ROLE_LABELS } from "./utils";

export type SwapCandidate = {
  employeeId: number;
  name: string;
  role: string;
  avatarUrl: string | null;
  weekHours: number;
  daysSinceLastSeen: number | null;
  matchScore: number;
  matchReasons: string[];
};

export type SwapMatcherInput = {
  shift: {
    id: number;
    employeeId: number;
    shiftDate: Date;
    startTime: string | null;
    endTime: string | null;
  };
  candidates: Array<{
    id: number;
    name: string;
    role: string;
    avatarUrl: string | null;
    weekHours: number;
    daysSinceLastSeen: number | null;
    hasConflictThatDay: boolean;
  }>;
  shiftRole: string;
};

const ROLE_BONUS = 0;
const RECENT_BONUS = 10;
const STALE_PENALTY = 30;
const MAX_RESULTS = 3;

function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

function formatHours(hours: number): string {
  // Show one decimal only if needed
  const rounded = Math.round(hours * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function rankSwapCandidates(input: SwapMatcherInput): SwapCandidate[] {
  const { shift, candidates, shiftRole } = input;

  const scored: SwapCandidate[] = [];
  for (const c of candidates) {
    if (c.id === shift.employeeId) continue;
    if (c.role !== shiftRole) continue;
    if (c.hasConflictThatDay) continue;

    const reasons: string[] = [];
    let score = 100 - c.weekHours + ROLE_BONUS;

    reasons.push(`Cùng vai trò ${roleLabel(c.role)}`);
    reasons.push(`Tuần này làm ${formatHours(c.weekHours)} giờ`);

    const days = c.daysSinceLastSeen;
    if (days === null || days > 14) {
      score -= STALE_PENALTY;
      reasons.push(
        days === null ? "Chưa thấy hoạt động gần đây" : `Hoạt động ${days} ngày trước`,
      );
    } else if (days <= 7) {
      score += RECENT_BONUS;
      reasons.push(`Hoạt động ${days} ngày trước`);
    } else {
      reasons.push(`Hoạt động ${days} ngày trước`);
    }

    scored.push({
      employeeId: c.id,
      name: c.name,
      role: c.role,
      avatarUrl: c.avatarUrl,
      weekHours: c.weekHours,
      daysSinceLastSeen: c.daysSinceLastSeen,
      matchScore: Math.round(score * 10) / 10,
      matchReasons: reasons,
    });
  }

  scored.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    if (a.weekHours !== b.weekHours) return a.weekHours - b.weekHours;
    return a.name.localeCompare(b.name);
  });

  return scored.slice(0, MAX_RESULTS);
}
