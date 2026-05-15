import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  SkillsPrintMatrix,
  type PrintEmployee,
} from "./skills-print-matrix";

export const dynamic = "force-dynamic";

export default async function SkillsPrintPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");
  if (sess.role !== "admin") redirect("/");

  let employees: PrintEmployee[] = [];
  let error: string | null = null;
  try {
    const rows = await prisma.employee.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true, avatarUrl: true },
    });
    employees = rows.map((r) => ({
      id: r.id,
      name: r.name,
      role: r.role,
      avatarUrl: r.avatarUrl,
    }));
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border bg-card p-6 text-sm text-rose-700 dark:text-rose-300">
        Không tải được danh sách nhân viên: {error}
      </div>
    );
  }

  return <SkillsPrintMatrix employees={employees} />;
}
