import { redirect } from "next/navigation";
import { Wallet } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BudgetForm } from "./budget-form";

export const dynamic = "force-dynamic";

export default async function BudgetAllocatorPage() {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl md:text-3xl">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Wallet className="size-5" />
            </span>
            Phân bổ ngân sách quán cà phê
          </CardTitle>
          <CardDescription>
            Nhập tổng ngân sách tháng (VND) và giai đoạn vận hành. AI sẽ chia
            ngân sách cho 6 hạng mục — nguyên liệu, lương, tiện ích, marketing,
            bảo trì và dự phòng — kèm tỉ trọng phần trăm và lý do ngắn gọn.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BudgetForm />
        </CardContent>
      </Card>
    </div>
  );
}
