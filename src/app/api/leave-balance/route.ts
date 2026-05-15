import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllLeaveBalances } from "@/lib/leave-balance";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (sess.role !== "admin") {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  try {
    const balances = await getAllLeaveBalances();
    const totals = balances.reduce(
      (acc, b) => ({
        annualUsed: acc.annualUsed + b.annualUsed,
        sickUsed: acc.sickUsed + b.sickUsed,
        riskCount:
          acc.riskCount +
          (b.predictedExhaustionMonth !== null &&
          b.predictedExhaustionMonth - new Date().getMonth() - 1 <= 3
            ? 1
            : 0),
      }),
      { annualUsed: 0, sickUsed: 0, riskCount: 0 },
    );

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      totals: {
        employees: balances.length,
        annualUsed: totals.annualUsed,
        sickUsed: totals.sickUsed,
        atRiskCount: totals.riskCount,
      },
      balances: balances.map((b) => ({
        employeeId: b.employeeId,
        name: b.name,
        role: b.role,
        avatarUrl: b.avatarUrl,
        annualUsed: b.annualUsed,
        annualRemaining: b.annualRemaining,
        sickUsed: b.sickUsed,
        sickRemaining: b.sickRemaining,
        monthsElapsed: b.monthsElapsed,
        monthlyUsageRate: b.monthlyUsageRate,
        predictedExhaustionMonth: b.predictedExhaustionMonth,
      })),
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
