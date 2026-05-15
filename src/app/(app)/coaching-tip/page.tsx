import { redirect } from "next/navigation";
import { Lightbulb } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CoachingTipForm } from "./coaching-tip-form";
import type { CoachingTipEmployee } from "./coaching-tip-types";

export const dynamic = "force-dynamic";

const ROLE_LABEL_VN: Record<string, string> = {
  barista: "Pha chế (barista)",
  server: "Phục vụ bàn",
  cashier: "Thu ngân",
  manager: "Quản lý",
};

export default async function CoachingTipPage() {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    redirect("/");
  }

  const rows = await prisma.employee.findMany({
    select: { id: true, name: true, role: true },
    orderBy: [{ name: "asc" }],
  });

  const employees: CoachingTipEmployee[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    role: ROLE_LABEL_VN[r.role] ?? r.role,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-amber-100/60 via-primary/10 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl md:text-3xl">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Lightbulb className="size-5" />
            </span>
            Lời khuyên coaching cho nhân viên
          </CardTitle>
          <CardDescription>
            Chọn một nhân viên và lĩnh vực cần huấn luyện — AI sẽ soạn một lời
            khuyên tiếng Việt dài khoảng 80 từ, gọi đích danh nhân viên và phù
            hợp với vai trò của họ. Có thể sao chép hoặc tải về dạng Markdown
            để gửi riêng cho nhân viên.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CoachingTipForm employees={employees} />
        </CardContent>
      </Card>
    </div>
  );
}
