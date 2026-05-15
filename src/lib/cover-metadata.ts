// Pure helpers + types for shift cover-request metadata stored in ActivityLog.
// Kept separate from the "use server" actions file so non-async helpers can
// be re-used by server queries and components.

export type CoverRequestMetadata = {
  requestedById: number;
  requestedAt: string;
  originalEmployeeId: number;
  originalEmployeeName: string;
  cancelled?: boolean;
  cancelledAt?: string;
  cancelledBy?: number;
  claimed?: boolean;
  claimedById?: number;
  claimedByName?: string;
  claimedAt?: string;
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function readCoverMetadata(
  raw: unknown,
): CoverRequestMetadata | null {
  if (!isObject(raw)) return null;
  const requestedById = raw.requestedById;
  const requestedAt = raw.requestedAt;
  const originalEmployeeId = raw.originalEmployeeId;
  const originalEmployeeName = raw.originalEmployeeName;
  if (typeof requestedById !== "number") return null;
  if (typeof requestedAt !== "string") return null;
  if (typeof originalEmployeeId !== "number") return null;
  if (typeof originalEmployeeName !== "string") return null;
  return {
    requestedById,
    requestedAt,
    originalEmployeeId,
    originalEmployeeName,
    cancelled: raw.cancelled === true ? true : undefined,
    cancelledAt:
      typeof raw.cancelledAt === "string" ? raw.cancelledAt : undefined,
    cancelledBy:
      typeof raw.cancelledBy === "number" ? raw.cancelledBy : undefined,
    claimed: raw.claimed === true ? true : undefined,
    claimedById:
      typeof raw.claimedById === "number" ? raw.claimedById : undefined,
    claimedByName:
      typeof raw.claimedByName === "string" ? raw.claimedByName : undefined,
    claimedAt: typeof raw.claimedAt === "string" ? raw.claimedAt : undefined,
  };
}
