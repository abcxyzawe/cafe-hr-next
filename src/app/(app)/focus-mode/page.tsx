import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { FocusBoard, type FocusEmployee, type FocusAttendance, type FocusShift } from "./focus-board";

export const dynamic = "force-dynamic";

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default async function FocusModePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const employee = await prisma.employee.findFirst({
    where: { email: session.email },
    select: {
      id: true,
      name: true,
      role: true,
      avatarUrl: true,
      email: true,
    },
  });

  if (!employee) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <Card className="border-amber-300/40 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-amber-600 dark:text-amber-400" />
              Chưa link với hồ sơ nhân viên
            </CardTitle>
            <CardDescription>
              Tài khoản{" "}
              <span className="font-medium text-foreground">
                {session.email}
              </span>{" "}
              chưa được liên kết với một hồ sơ nhân viên trong hệ thống.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Vui lòng liên hệ quản trị viên để liên kết tài khoản.
            </p>
            <Button asChild variant="outline">
              <Link href="/me">
                <ArrowLeft className="size-4" /> Quay lại Của tôi
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const employeeId = employee.id;
  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [currentAttendance, todayShift, tasksDoneToday] = await Promise.all([
    prisma.attendance.findFirst({
      where: {
        employeeId,
        checkIn: { gte: today, lt: tomorrow },
      },
      orderBy: { checkIn: "desc" },
      select: {
        id: true,
        checkIn: true,
        checkOut: true,
        hoursWorked: true,
      },
    }),
    prisma.shift.findFirst({
      where: { employeeId, shiftDate: today },
      orderBy: { startTime: "asc" },
      select: {
        id: true,
        shiftType: true,
        startTime: true,
        endTime: true,
      },
    }),
    prisma.task.count({
      where: {
        assigneeId: employeeId,
        completedAt: { gte: today, lt: tomorrow },
      },
    }),
  ]);

  const focusEmployee: FocusEmployee = {
    id: employee.id,
    name: employee.name,
    role: employee.role,
    avatarUrl: employee.avatarUrl,
  };

  const focusAttendance: FocusAttendance | null = currentAttendance
    ? {
        id: currentAttendance.id,
        checkInIso: currentAttendance.checkIn.toISOString(),
        checkOutIso: currentAttendance.checkOut
          ? currentAttendance.checkOut.toISOString()
          : null,
        hoursWorked:
          currentAttendance.hoursWorked != null
            ? Number(currentAttendance.hoursWorked)
            : null,
      }
    : null;

  const focusShift: FocusShift | null = todayShift
    ? {
        id: todayShift.id,
        shiftType: todayShift.shiftType ?? null,
        startTime: todayShift.startTime,
        endTime: todayShift.endTime,
      }
    : null;

  return (
    <FocusBoard
      employee={focusEmployee}
      currentAttendance={focusAttendance}
      todayShift={focusShift}
      tasksDoneToday={tasksDoneToday}
    />
  );
}
