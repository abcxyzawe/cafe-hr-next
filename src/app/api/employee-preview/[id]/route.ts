import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export type EmployeePreviewData = {
  id: number;
  name: string;
  role: string;
  hourlyRate: number;
  avatarUrl: string | null;
  isActive: boolean;
  lastActivity: string | null;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return NextResponse.json(
      { error: "Invalid employee id" },
      { status: 400 },
    );
  }

  const employee = await prisma.employee.findUnique({
    where: { id: numericId },
    select: {
      id: true,
      name: true,
      role: true,
      hourlyRate: true,
      avatarUrl: true,
    },
  });
  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  // Open attendance row = currently on shift
  const openAttendance = await prisma.attendance.findFirst({
    where: { employeeId: numericId, checkOut: null },
    select: { id: true },
  });

  // Latest activity referencing this employee — best effort, never blocks response
  let lastActivity: string | null = null;
  try {
    const log = await prisma.activityLog.findFirst({
      where: { entityType: "employee", entityId: numericId },
      orderBy: { createdAt: "desc" },
      select: { summary: true },
    });
    lastActivity = log?.summary ?? null;
  } catch {
    lastActivity = null;
  }

  const body: EmployeePreviewData = {
    id: employee.id,
    name: employee.name,
    role: employee.role,
    hourlyRate: Number(employee.hourlyRate),
    avatarUrl: employee.avatarUrl,
    isActive: openAttendance != null,
    lastActivity,
  };

  return NextResponse.json(body, {
    status: 200,
    headers: {
      "Cache-Control": "private, max-age=30",
    },
  });
}
