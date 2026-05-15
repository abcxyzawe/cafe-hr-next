import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

type Role = "barista" | "server" | "cashier" | "manager";
type ShiftType = "morning" | "afternoon" | "evening";

const SAMPLE: Array<{
  name: string;
  role: Role;
  phone?: string;
  email?: string;
  hourlyRate: number;
}> = [
  { name: "Nguyễn Văn An", role: "barista", phone: "0901234567", email: "an@cafe.vn", hourlyRate: 35000 },
  { name: "Trần Thị Bình", role: "barista", phone: "0902345678", email: "binh@cafe.vn", hourlyRate: 35000 },
  { name: "Lê Hoàng Cường", role: "server", phone: "0903456789", email: "cuong@cafe.vn", hourlyRate: 28000 },
  { name: "Phạm Mai Dung", role: "server", phone: "0904567890", email: "dung@cafe.vn", hourlyRate: 28000 },
  { name: "Hoàng Thị Em", role: "cashier", phone: "0905678901", email: "em@cafe.vn", hourlyRate: 30000 },
  { name: "Đỗ Quốc Anh", role: "manager", phone: "0906789012", email: "doquocanh@cafe.vn", hourlyRate: 55000 },
];

async function tryMigrateFromSqlite() {
  const sqlitePath = path.resolve(__dirname, "..", "..", "cafe-hr", "data", "cafe_hr.db");
  if (!fs.existsSync(sqlitePath)) return null;
  let Database: typeof import("better-sqlite3");
  try {
    const sqliteModulePath = path.resolve(__dirname, "..", "..", "cafe-hr", "node_modules", "better-sqlite3");
    Database = require(sqliteModulePath);
  } catch {
    return null;
  }
  console.log(`> Importing data from legacy SQLite: ${sqlitePath}`);
  const db = new Database(sqlitePath, { readonly: true });
  try {
    const employees = db
      .prepare(
        "SELECT id, name, role, phone, email, hourly_rate, avatar_url, created_at FROM employees ORDER BY id",
      )
      .all() as Array<{
      id: number;
      name: string;
      role: string;
      phone: string | null;
      email: string | null;
      hourly_rate: number;
      avatar_url: string | null;
      created_at: string | null;
    }>;
    return { employees, db };
  } catch (e) {
    console.warn("> Failed to read legacy SQLite, skipping migration:", e instanceof Error ? e.message : e);
    db.close();
    return null;
  }
}

async function seedDefaultUser() {
  const email = "admin@cafe.vn";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`> Default user already exists (${email}).`);
    return;
  }
  const passwordHash = await bcrypt.hash("admin", 10);
  await prisma.user.create({
    data: {
      email,
      name: "Quản trị viên",
      passwordHash,
      role: "admin",
    },
  });
  console.log(`> Created default admin user: ${email} / admin`);
}

async function main() {
  console.log("Seeding cafe_hr database...");

  await seedDefaultUser();

  const existing = await prisma.employee.count();
  if (existing > 0) {
    console.log(`> Database already has ${existing} employees. Skipping seed.`);
    return;
  }

  const legacy = await tryMigrateFromSqlite();
  if (legacy && legacy.employees.length > 0) {
    for (const e of legacy.employees) {
      await prisma.employee.create({
        data: {
          name: e.name,
          role: e.role as Role,
          phone: e.phone,
          email: e.email,
          hourlyRate: e.hourly_rate ?? 30000,
          avatarUrl: e.avatar_url,
        },
      });
    }
    console.log(`> Migrated ${legacy.employees.length} employees from SQLite`);
    legacy.db.close();
  } else {
    for (const s of SAMPLE) {
      await prisma.employee.create({ data: s });
    }
    console.log(`> Created ${SAMPLE.length} sample employees`);
  }

  // Seed a couple of shifts for today
  const employees = await prisma.employee.findMany({ orderBy: { id: "asc" } });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const shiftPlans: Array<[Role, ShiftType, string, string]> = [
    ["barista", "morning", "07:00", "12:00"],
    ["server", "morning", "07:00", "12:00"],
    ["cashier", "afternoon", "12:00", "17:00"],
    ["barista", "evening", "17:00", "22:00"],
  ];
  for (const [role, type, start, end] of shiftPlans) {
    const emp = employees.find((e) => e.role === role);
    if (emp) {
      await prisma.shift.create({
        data: {
          employeeId: emp.id,
          shiftDate: today,
          shiftType: type,
          startTime: start,
          endTime: end,
        },
      });
    }
  }
  console.log(`> Created sample shifts for today`);

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
