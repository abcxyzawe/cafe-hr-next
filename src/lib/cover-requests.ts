import "server-only";
import { prisma } from "./prisma";
import { readCoverMetadata } from "./cover-metadata";

export type OpenCoverRequest = {
  shiftId: number;
  originalName: string;
  originalEmployeeId: number;
  dateIso: string;
  shiftType: "morning" | "afternoon" | "evening" | null;
  requestedAt: string;
  requestedById: number;
};

function isValidShiftType(
  v: string | null,
): v is "morning" | "afternoon" | "evening" | null {
  return v === null || v === "morning" || v === "afternoon" || v === "evening";
}

export async function getOpenCoverRequests(): Promise<OpenCoverRequest[]> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const logs = await prisma.activityLog.findMany({
    where: {
      action: "shift.cover_request",
      entityType: "shift",
      createdAt: { gte: sevenDaysAgo },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Group by shiftId — keep latest per shift
  const latestByShift = new Map<
    number,
    { requestedAt: Date; requestedById: number; originalEmployeeId: number; originalName: string }
  >();
  for (const log of logs) {
    const sid = log.entityId;
    if (sid == null) continue;
    if (latestByShift.has(sid)) continue; // logs are desc — first hit is latest
    const meta = readCoverMetadata(log.metadata);
    if (!meta) continue;
    if (meta.cancelled || meta.claimed) continue;
    latestByShift.set(sid, {
      requestedAt: log.createdAt,
      requestedById: meta.requestedById,
      originalEmployeeId: meta.originalEmployeeId,
      originalName: meta.originalEmployeeName,
    });
  }

  if (latestByShift.size === 0) return [];

  const shiftIds = Array.from(latestByShift.keys());
  const shifts = await prisma.shift.findMany({
    where: { id: { in: shiftIds } },
    select: {
      id: true,
      employeeId: true,
      shiftDate: true,
      shiftType: true,
    },
  });

  const result: OpenCoverRequest[] = [];
  for (const s of shifts) {
    const entry = latestByShift.get(s.id);
    if (!entry) continue;
    // Skip if shift has been reassigned away from original requester
    if (s.employeeId !== entry.originalEmployeeId) continue;
    const st: string | null = s.shiftType;
    if (!isValidShiftType(st)) continue;
    result.push({
      shiftId: s.id,
      originalName: entry.originalName,
      originalEmployeeId: entry.originalEmployeeId,
      dateIso: s.shiftDate.toISOString().slice(0, 10),
      shiftType: st,
      requestedAt: entry.requestedAt.toISOString(),
      requestedById: entry.requestedById,
    });
  }

  // Sort by date asc so the most-imminent shift shows first
  result.sort((a, b) => a.dateIso.localeCompare(b.dateIso));
  return result;
}
