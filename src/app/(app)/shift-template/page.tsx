import { redirect } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShiftTemplateForm } from "./shift-template-form";
import type { ShiftTemplateEmployee } from "./shift-template-types";

export const dynamic = "force-dynamic";

export default async function ShiftTemplatePage() {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    redirect("/");
  }

  const rows = await prisma.employee.findMany({
    select: { id: true, name: true, role: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  const employees: ShiftTemplateEmployee[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    role: String(r.role),
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl md:text-3xl">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <CalendarRange className="size-5" />
            </span>
            AI gợi ý mẫu lịch tuần
          </CardTitle>
          <CardDescription>
            Đặt mục tiêu nhân sự cho từng ca (sáng/chiều/tối) theo từng vai
            trò. AI sẽ đề xuất một mẫu lịch xoay vòng 7 ngày (Thứ Hai đến Chủ
            Nhật) đảm bảo đủ nhân sự, phân bổ giờ công bằng và mỗi nhân viên
            có ít nhất một ngày nghỉ.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ShiftTemplateForm employees={employees} />
        </CardContent>
      </Card>
    </div>
  );
}
