import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const SEED_MARKER = "seed-dev-data.v1";
const DAYS_BACK = 60;
const SHIFT_TYPES = ["morning", "afternoon", "evening"] as const;
const SHIFT_TIMES: Record<(typeof SHIFT_TYPES)[number], [string, string]> = {
  morning: ["07:00", "12:00"],
  afternoon: ["12:00", "17:00"],
  evening: ["17:00", "22:00"],
};

const TASK_TITLES = [
  "Kiểm kê kho cà phê",
  "Vệ sinh máy pha tuần",
  "Sắp xếp menu mới",
  "Đặt hàng nguyên liệu",
  "Bàn giao ca",
  "Kiểm tra POS",
  "Quay video marketing",
  "Bảo dưỡng máy xay",
  "Cập nhật bảng giá",
  "Đào tạo nhân viên mới",
  "Khảo sát khách hàng",
  "Lên kế hoạch khuyến mãi",
];

const KUDOS_SUMMARIES = [
  "Phục vụ khách rất chu đáo, được khách khen ngợi.",
  "Hoàn thành ca không lỗi đơn nào.",
  "Hỗ trợ đồng đội xử lý peak giờ trưa.",
  "Sáng tạo món mới được khách yêu thích.",
  "Đến sớm và setup ca rất ngăn nắp.",
  "Giải quyết khiếu nại khách điềm tĩnh.",
];

function rand(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function withTime(d: Date, hh: number, mm: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm, 0, 0);
}

async function main() {
  console.log(`Seeding dev data (${DAYS_BACK} days of history)...`);

  const marker = await prisma.activityLog.findFirst({
    where: { action: SEED_MARKER },
  });
  if (marker) {
    console.log(`> Already seeded (marker found at ${marker.createdAt.toISOString()}). Aborting.`);
    return;
  }

  const employees = await prisma.employee.findMany({
    select: { id: true, role: true, hourlyRate: true },
    orderBy: { id: "asc" },
  });
  if (employees.length === 0) {
    console.error("No employees found. Run `prisma db seed` first.");
    process.exit(1);
  }
  console.log(`> Found ${employees.length} employees.`);

  const adminUser = await prisma.user.findFirst({ where: { role: "admin" } });
  const adminUid = adminUser?.id ?? null;

  const today = startOfDay(new Date());

  const shiftsToCreate: Prisma.ShiftCreateManyInput[] = [];
  const attendanceToCreate: Prisma.AttendanceCreateManyInput[] = [];

  for (let dayOffset = -DAYS_BACK; dayOffset <= 0; dayOffset++) {
    const date = addDays(today, dayOffset);
    const dow = date.getDay();
    const isClosed = dow === 0 && Math.random() < 0.2;
    if (isClosed) continue;

    for (const slot of SHIFT_TYPES) {
      const baristas = employees.filter((e) => e.role === "barista");
      const servers = employees.filter((e) => e.role === "server");
      const cashiers = employees.filter((e) => e.role === "cashier");
      const managers = employees.filter((e) => e.role === "manager");
      const assigned: number[] = [];
      if (baristas.length > 0) assigned.push(pick(baristas).id);
      if (servers.length > 0 && Math.random() < 0.9) assigned.push(pick(servers).id);
      if (cashiers.length > 0 && Math.random() < 0.6) assigned.push(pick(cashiers).id);
      if (slot === "afternoon" && managers.length > 0 && Math.random() < 0.5) {
        assigned.push(pick(managers).id);
      }

      const [startHH, endHH] = SHIFT_TIMES[slot];
      for (const empId of new Set(assigned)) {
        shiftsToCreate.push({
          employeeId: empId,
          shiftDate: date,
          shiftType: slot,
          startTime: startHH,
          endTime: endHH,
        });

        if (dayOffset < 0 && Math.random() < 0.92) {
          const [sh, sm] = startHH.split(":").map(Number);
          const [eh, em] = endHH.split(":").map(Number);
          const lateMinutes = Math.random() < 0.15 ? rand(5, 25) : rand(-10, 5);
          const earlyOutMinutes = Math.random() < 0.1 ? rand(0, 20) : rand(-15, 5);
          const checkInDate = withTime(date, sh, sm + lateMinutes);
          const checkOutDate = withTime(date, eh, em - earlyOutMinutes);
          const hours = (checkOutDate.getTime() - checkInDate.getTime()) / 3_600_000;
          attendanceToCreate.push({
            employeeId: empId,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            hoursWorked: new Prisma.Decimal(Math.max(0, hours).toFixed(2)),
          });
        }
      }
    }
  }

  await prisma.shift.createMany({ data: shiftsToCreate, skipDuplicates: true });
  console.log(`> Created ${shiftsToCreate.length} shifts.`);
  await prisma.attendance.createMany({ data: attendanceToCreate });
  console.log(`> Created ${attendanceToCreate.length} attendance rows.`);

  const tasksToCreate: Prisma.TaskCreateManyInput[] = [];
  for (let i = 0; i < 80; i++) {
    const createdOffset = -rand(0, DAYS_BACK);
    const createdAt = addDays(today, createdOffset);
    const dueOffset = rand(0, 10);
    const dueDate = addDays(createdAt, dueOffset);
    const isCompleted = Math.random() < 0.7;
    const completedAt = isCompleted
      ? addDays(createdAt, rand(1, Math.max(1, dueOffset + 2)))
      : null;
    if (completedAt && completedAt > today) continue;
    const assignee = pick(employees);
    tasksToCreate.push({
      title: pick(TASK_TITLES),
      assigneeId: assignee.id,
      priority: pick(["low", "normal", "high", "urgent"] as const),
      dueDate,
      completedAt,
      completedByName: completedAt ? "Auto-seed" : null,
      createdById: adminUid,
      createdByName: "Seed dữ liệu",
      createdAt,
    });
  }
  await prisma.task.createMany({ data: tasksToCreate });
  console.log(`> Created ${tasksToCreate.length} tasks.`);

  const leavesToCreate: Prisma.LeaveRequestCreateManyInput[] = [];
  const leaveTypes = ["annual", "sick", "personal", "unpaid"] as const;
  for (let i = 0; i < 18; i++) {
    const emp = pick(employees);
    const startOffset = rand(-DAYS_BACK, 30);
    const start = addDays(today, startOffset);
    const duration = rand(1, 5);
    const end = addDays(start, duration);
    const decided = startOffset < 0 || Math.random() < 0.7;
    leavesToCreate.push({
      employeeId: emp.id,
      type: pick(leaveTypes),
      startDate: start,
      endDate: end,
      reason: "Nghỉ phép theo kế hoạch",
      status: decided ? "approved" : "pending",
      decidedAt: decided ? addDays(start, -2) : null,
      decidedById: decided ? adminUid : null,
    });
  }
  await prisma.leaveRequest.createMany({ data: leavesToCreate });
  console.log(`> Created ${leavesToCreate.length} leave requests.`);

  const kudosToCreate: Prisma.ActivityLogCreateManyInput[] = [];
  for (let i = 0; i < 60; i++) {
    const offset = -rand(0, DAYS_BACK);
    const createdAt = addDays(today, offset);
    const emp = pick(employees);
    kudosToCreate.push({
      userId: adminUid,
      action: "kudos.give",
      entityType: "employee",
      entityId: emp.id,
      summary: pick(KUDOS_SUMMARIES),
      createdAt,
    });
  }
  await prisma.activityLog.createMany({ data: kudosToCreate });
  console.log(`> Created ${kudosToCreate.length} kudos activity logs.`);

  await prisma.activityLog.create({
    data: {
      userId: adminUid,
      action: SEED_MARKER,
      entityType: "system",
      summary: `Seeded ${DAYS_BACK} days of dev data on ${new Date().toISOString()}.`,
    },
  });

  console.log("Dev data seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
