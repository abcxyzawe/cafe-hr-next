import { redirect } from "next/navigation";
import { Coins } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TipSplitForm, type EligibleEmployee } from "./tip-split-form";

export const dynamic = "force-dynamic";

function startOfThisWeekMonday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export default async function TipSplitPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");
  if (sess.role !== "admin") redirect("/");

  const weekStart = startOfThisWeekMonday();

  // Currently clocked-in attendance entries (checkOut still null).
  const open = await prisma.attendance.findMany({
    where: { checkOut: null },
    select: {
      employeeId: true,
      employee: { select: { id: true, name: true, role: true } },
    },
  });

  const uniqueEmployeeIds = Array.from(
    new Set(open.map((o) => o.employeeId)),
  );

  // Aggregate this-week hours from any closed attendance entries.
  let weeklyHoursMap = new Map<number, number>();
  if (uniqueEmployeeIds.length > 0) {
    const weekRows = await prisma.attendance.findMany({
      where: {
        employeeId: { in: uniqueEmployeeIds },
        checkIn: { gte: weekStart },
      },
      select: { employeeId: true, hoursWorked: true },
    });
    weeklyHoursMap = weekRows.reduce<Map<number, number>>((acc, r) => {
      const h = r.hoursWorked !== null ? Number(r.hoursWorked) : 0;
      acc.set(r.employeeId, (acc.get(r.employeeId) ?? 0) + (Number.isFinite(h) ? h : 0));
      return acc;
    }, new Map<number, number>());
  }

  const seen = new Set<number>();
  const eligibleEmployees: EligibleEmployee[] = [];
  for (const o of open) {
    if (seen.has(o.employeeId)) continue;
    seen.add(o.employeeId);
    const weekly = weeklyHoursMap.get(o.employeeId) ?? 0;
    eligibleEmployees.push({
      id: o.employee.id,
      name: o.employee.name,
      role: o.employee.role,
      weeklyHours: Math.round(weekly * 100) / 100,
    });
  }

  eligibleEmployees.sort((a, b) => a.name.localeCompare(b.name, "vi"));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl md:text-3xl">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Coins className="size-5" />
            </span>
            Chia tip ca làm
          </CardTitle>
          <CardDescription>
            Tự động lấy danh sách nhân viên đang trong ca và tính chia tip công
            bằng theo nhiều phương thức: chia đều, theo giờ làm trong tuần, hoặc
            theo trọng số vai trò.
          </CardDescription>
        </CardHeader>
      </Card>

      <TipSplitForm eligibleEmployees={eligibleEmployees} />
    </div>
  );
}
