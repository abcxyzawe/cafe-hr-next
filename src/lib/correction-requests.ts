import "server-only";
import { prisma } from "./prisma";

export type CorrectionRequest = {
  id: number;
  employeeId: number;
  employeeName: string;
  date: string;
  type: string;
  note: string;
  desiredCheckIn: string | null;
  desiredCheckOut: string | null;
  createdAt: Date;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export async function getOpenCorrectionRequests(
  limit = 10,
): Promise<CorrectionRequest[]> {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const rows = await prisma.activityLog.findMany({
    where: {
      action: "attendance.correction_request",
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      createdAt: true,
      metadata: true,
    },
  });

  const items: CorrectionRequest[] = [];
  for (const r of rows) {
    const meta = r.metadata;
    if (!isRecord(meta)) continue;
    if (meta.status !== "pending") continue;

    const employeeId = asNumber(meta.employeeId);
    const employeeName = asString(meta.employeeName);
    const date = asString(meta.date);
    const type = asString(meta.type);
    const note = asString(meta.note);
    if (employeeId === null || !employeeName || !date || !type || note === null) {
      continue;
    }

    items.push({
      id: r.id,
      employeeId,
      employeeName,
      date,
      type,
      note,
      desiredCheckIn: asString(meta.desiredCheckIn),
      desiredCheckOut: asString(meta.desiredCheckOut),
      createdAt: r.createdAt,
    });
  }

  items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return items.slice(0, limit);
}
