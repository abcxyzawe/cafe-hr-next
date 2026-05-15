import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Check = { ok: boolean; detail?: string };

export async function GET() {
  const checks: Record<string, Check> = {};
  const stats: Record<string, number> = {};

  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { ok: true, detail: `${Date.now() - dbStart}ms` };
  } catch (e) {
    checks.database = {
      ok: false,
      detail: e instanceof Error ? e.message.slice(0, 200) : String(e),
    };
  }

  checks.xai = {
    ok: !!process.env.XAI_API_KEY,
    detail: process.env.XAI_API_KEY ? "configured" : "XAI_API_KEY not set",
  };

  if (checks.database.ok) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    try {
      const [employees, attendanceToday, openAttendance, pendingLeaves] =
        await Promise.all([
          prisma.employee.count(),
          prisma.attendance.count({ where: { checkIn: { gte: startOfToday } } }),
          prisma.attendance.count({ where: { checkOut: null } }),
          prisma.leaveRequest.count({ where: { status: "pending" } }),
        ]);
      stats.employees = employees;
      stats.attendanceToday = attendanceToday;
      stats.openAttendance = openAttendance;
      stats.pendingLeaves = pendingLeaves;
    } catch {
      // stats remain partial
    }
  }

  const uptimeSeconds = Math.round(process.uptime());
  const mem = process.memoryUsage();
  const runtime = {
    uptimeSeconds,
    memoryRssMB: Math.round(mem.rss / 1024 / 1024),
    memoryHeapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
    nodeVersion: process.version,
    platform: process.platform,
  };

  const allOk = Object.values(checks).every((c) => c.ok);
  return NextResponse.json(
    {
      ok: allOk,
      checks,
      stats,
      runtime,
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 503 },
  );
}
