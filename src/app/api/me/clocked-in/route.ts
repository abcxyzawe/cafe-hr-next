import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const emp = await prisma.employee.findFirst({
    where: { email: sess.email },
    select: { id: true },
  });

  if (!emp) {
    return NextResponse.json(
      { linked: false, isClockedIn: false, openCheckInIso: null },
      { status: 200, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const open = await prisma.attendance.findFirst({
    where: { employeeId: emp.id, checkOut: null },
    orderBy: { checkIn: "desc" },
    select: { checkIn: true },
  });

  return NextResponse.json(
    {
      linked: true,
      isClockedIn: open != null,
      openCheckInIso: open ? open.checkIn.toISOString() : null,
    },
    { status: 200, headers: { "Cache-Control": "private, no-store" } },
  );
}
