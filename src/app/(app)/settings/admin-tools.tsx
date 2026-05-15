import Link from "next/link";
import { Download, Database, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export async function AdminToolsCard() {
  const [employees, users, attendance, shifts, payroll, notes, activities] =
    await Promise.all([
      prisma.employee.count(),
      prisma.user.count(),
      prisma.attendance.count(),
      prisma.shift.count(),
      prisma.payroll.count(),
      prisma.employeeNote.count(),
      prisma.activityLog.count(),
    ]);

  const stats = [
    { label: "Người dùng", value: users },
    { label: "Nhân viên", value: employees },
    { label: "Ca làm", value: shifts },
    { label: "Chấm công", value: attendance },
    { label: "Lương kỳ", value: payroll },
    { label: "Ghi chú", value: notes },
    { label: "Audit log", value: activities },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="size-5" />
          Công cụ quản trị
        </CardTitle>
        <CardDescription>
          Thống kê dữ liệu hiện tại và công cụ sao lưu (chỉ admin)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-lg border bg-card/40 p-3 text-center"
            >
              <p className="text-2xl font-bold leading-none text-primary">
                {s.value.toLocaleString("vi-VN")}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
              <FileJson className="size-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium">OpenAPI specification</h4>
              <p className="text-xs text-muted-foreground">
                Spec mô tả tất cả API endpoints — paste vào Swagger UI / Postman / Insomnia
                để khám phá API.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/api/openapi.json" target="_blank" prefetch={false}>
                <Download className="size-4" />
                Xem spec
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
