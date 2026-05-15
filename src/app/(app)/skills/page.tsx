import { redirect } from "next/navigation";
import { Award } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SkillMatrix, type MatrixEmployee } from "./skill-matrix";

export const dynamic = "force-dynamic";

export default async function SkillsPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");
  if (sess.role !== "admin") redirect("/");

  let employees: MatrixEmployee[] = [];
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

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Award className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-2xl tracking-tight md:text-3xl">
                Ma trận kỹ năng nhân viên
              </CardTitle>
              <CardDescription className="mt-1 text-sm">
                Đánh giá nhanh trình độ của từng nhân viên trên 8 nhóm kỹ năng
                cốt lõi của quán. Bấm số sao (0–3) để cập nhật.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Lưu ý: dữ liệu kỹ năng chỉ <strong>lưu trên thiết bị này</strong>{" "}
            (localStorage của trình duyệt) — không đồng bộ qua máy chủ.
          </p>
        </CardContent>
      </Card>

      {error ? (
        <Card>
          <CardContent className="py-6 text-sm text-rose-700 dark:text-rose-300">
            Không tải được danh sách nhân viên: {error}
          </CardContent>
        </Card>
      ) : (
        <SkillMatrix employees={employees} />
      )}
    </div>
  );
}
