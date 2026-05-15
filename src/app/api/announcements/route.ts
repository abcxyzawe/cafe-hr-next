import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SEVERITY_WHITELIST = new Set([
  "info",
  "success",
  "warning",
  "destructive",
]);

function parsePositiveInt(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function clampLimit(raw: string | null): number {
  const n = parsePositiveInt(raw);
  if (n === null) return 20;
  return Math.min(100, Math.max(1, n));
}

function readMetaString(
  metadata: Prisma.JsonValue | null | undefined,
  key: string,
): string | null {
  if (
    metadata &&
    typeof metadata === "object" &&
    !Array.isArray(metadata)
  ) {
    const value = (metadata as Record<string, Prisma.JsonValue>)[key];
    if (typeof value === "string") return value;
  }
  return null;
}

export async function GET(req: Request) {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const limit = clampLimit(url.searchParams.get("limit"));
  const cursor = parsePositiveInt(url.searchParams.get("cursor"));
  const severityRaw = url.searchParams.get("severity");
  const severity =
    severityRaw && SEVERITY_WHITELIST.has(severityRaw) ? severityRaw : null;

  const where: Prisma.ActivityLogWhereInput = {
    action: "announcement.broadcast",
  };
  if (cursor !== null) {
    where.id = { lt: cursor };
  }
  if (severity) {
    where.metadata = {
      path: ["severity"],
      equals: severity,
    };
  }

  try {
    const rows = await prisma.activityLog.findMany({
      where,
      orderBy: { id: "desc" },
      take: limit + 1,
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
    });

    const hasMore = rows.length > limit;
    const sliced = hasMore ? rows.slice(0, limit) : rows;

    const items = sliced.map((row) => {
      const message = readMetaString(row.metadata, "message") ?? row.summary;
      const sev = readMetaString(row.metadata, "severity") ?? "info";
      return {
        id: row.id,
        message,
        severity: sev,
        sender: row.user
          ? { name: row.user.name, role: row.user.role }
          : null,
        createdAt: row.createdAt.toISOString(),
      };
    });

    const nextCursor =
      hasMore && sliced.length > 0 ? sliced[sliced.length - 1].id : null;

    return NextResponse.json({ ok: true, items, nextCursor });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message.slice(0, 300) : String(e),
      },
      { status: 503 },
    );
  }
}
