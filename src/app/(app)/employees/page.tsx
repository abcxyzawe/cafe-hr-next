import Link from "next/link";
import { Printer, Users } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeForm } from "./employee-form";
import { EmployeeSearchBar } from "./search-bar";
import { BatchAvatarButton } from "./batch-avatar-button";
import { BatchAvatarDialog } from "./batch-avatar-dialog";
import { CsvImportButton } from "./csv-import-dialog";
import { XlsxImportButton } from "./xlsx-import-dialog";
import { EmployeesView } from "./employees-view";
import { RecentEmployeesPick } from "./recent-pick";
import { getEmployeeSparklines } from "@/lib/employee-sparklines";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

const VALID_ROLES = ["barista", "server", "cashier", "manager"] as const;

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string }>;
}) {
  const sp = await searchParams;
  const sess = await getSession();
  const isAdmin = sess?.role === "admin";
  const q = sp.q?.trim() || "";
  const roleFilter =
    sp.role && (VALID_ROLES as readonly string[]).includes(sp.role)
      ? (sp.role as (typeof VALID_ROLES)[number])
      : undefined;

  let employees: Awaited<ReturnType<typeof prisma.employee.findMany>> = [];
  let totalCount = 0;
  let missingAvatar = 0;
  let error: string | null = null;

  try {
    const where: Prisma.EmployeeWhereInput = {};
    if (roleFilter) where.role = roleFilter;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
      ];
    }
    [employees, totalCount, missingAvatar] = await Promise.all([
      prisma.employee.findMany({ where, orderBy: { id: "asc" } }),
      prisma.employee.count(),
      prisma.employee.count({ where: { avatarUrl: null } }),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  let sparklines: Record<number, number[]> = {};
  try {
    const map = await getEmployeeSparklines(employees.map((e) => e.id));
    sparklines = Object.fromEntries(map);
  } catch {
    sparklines = {};
  }

  const filterActive = !!(q || roleFilter);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Thêm nhân viên</CardTitle>
          <CardDescription>
            Nhập thông tin nhân viên mới. Avatar có thể tạo tự động sau khi lưu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmployeeForm />
        </CardContent>
      </Card>

      <RecentEmployeesPick />

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>
                Danh sách ({employees.length}
                {filterActive && totalCount !== employees.length ? ` / ${totalCount}` : ""})
              </CardTitle>
              <CardDescription>Tất cả nhân viên trong quán</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isAdmin && <CsvImportButton />}
              {isAdmin && <XlsxImportButton />}
              <Button asChild variant="outline" size="sm">
                <Link
                  href={
                    roleFilter ? `/employees/print?role=${roleFilter}` : "/employees/print"
                  }
                  target="_blank"
                  prefetch={false}
                >
                  <Printer className="size-4" />
                  In danh sách
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link
                  href={
                    roleFilter
                      ? `/employees/print/cards?role=${roleFilter}`
                      : "/employees/print/cards"
                  }
                  target="_blank"
                  prefetch={false}
                >
                  <Printer className="size-4" />
                  In thẻ nhân viên
                </Link>
              </Button>
              <BatchAvatarButton missingCount={missingAvatar} />
              <BatchAvatarDialog isAdmin={isAdmin} />
            </div>
          </div>
          <EmployeeSearchBar />
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <p className="p-6 text-sm text-destructive">{error}</p>
          ) : employees.length === 0 ? (
            <EmptyState
              illustration={
                filterActive ? undefined : "/illustrations/empty-employees.png"
              }
              icon={filterActive ? Users : undefined}
              title={
                filterActive
                  ? "Không có nhân viên khớp bộ lọc"
                  : "Chưa có nhân viên nào"
              }
              description={
                filterActive
                  ? "Thử bỏ bớt điều kiện lọc hoặc tìm với từ khoá khác."
                  : "Thêm nhân viên đầu tiên bằng form ở trên."
              }
            />
          ) : (
            <EmployeesView
              employees={employees.map((e) => ({
                id: e.id,
                name: e.name,
                role: e.role,
                phone: e.phone,
                email: e.email,
                hourlyRate: Number(e.hourlyRate),
                avatarUrl: e.avatarUrl,
                dateOfBirth: e.dateOfBirth,
                createdAt: e.createdAt,
              }))}
              isAdmin={isAdmin}
              sparklines={sparklines}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
