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
import { ShiftOptimizerForm } from "./shift-optimizer-form";
import {
  roleLabel,
  type ShiftOptimizerEmployeeGroup,
} from "./types";

export const dynamic = "force-dynamic";

export default async function ShiftOptimizerPage() {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    redirect("/");
  }

  const rows = await prisma.employee.findMany({
    select: { id: true, name: true, role: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  const groupsMap = new Map<string, ShiftOptimizerEmployeeGroup>();
  for (const r of rows) {
    const role = String(r.role);
    let group = groupsMap.get(role);
    if (!group) {
      group = {
        role,
        roleLabel: roleLabel(role),
        members: [],
      };
      groupsMap.set(role, group);
    }
    group.members.push({ id: r.id, name: r.name, role });
  }
  const groups: ShiftOptimizerEmployeeGroup[] = Array.from(groupsMap.values());

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl md:text-3xl">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <CalendarRange className="size-5" />
            </span>
            Tối ưu ca làm với AI
          </CardTitle>
          <CardDescription>
            Chọn tuần bắt đầu từ Thứ 2, dự kiến lưu lượng khách và ghi chú
            riêng. AI sẽ đề xuất lịch xếp ca 7 ngày × 3 khung (Sáng / Chiều /
            Tối) dựa trên đội ngũ hiện tại, kèm lý do và cảnh báo cho quản lý
            cân nhắc trước khi chốt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ShiftOptimizerForm employees={groups} />
        </CardContent>
      </Card>
    </div>
  );
}
