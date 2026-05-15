import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  try {
    const employee = await prisma.employee.findFirst({
      where: { email: sess.email },
      select: { id: true },
    });

    if (!employee) {
      return NextResponse.json({
        ok: true,
        asOf: now.toISOString(),
        unread: 0,
        breakdown: {
          leaveDecided: 0,
          kudosReceived: 0,
          tasksOverdue: 0,
        },
      });
    }

    const [leaveDecided, kudosReceived, tasksOverdue] = await Promise.all([
      prisma.leaveRequest.count({
        where: {
          employeeId: employee.id,
          decidedAt: { gte: sevenDaysAgo, not: null },
        },
      }),
      prisma.activityLog.count({
        where: {
          action: "kudos.give",
          entityType: "employee",
          entityId: employee.id,
          createdAt: { gte: sevenDaysAgo },
        },
      }),
      prisma.task.count({
        where: {
          assigneeId: employee.id,
          completedAt: null,
          dueDate: { lt: now },
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      asOf: now.toISOString(),
      unread: leaveDecided + kudosReceived + tasksOverdue,
      breakdown: {
        leaveDecided,
        kudosReceived,
        tasksOverdue,
      },
    });
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
