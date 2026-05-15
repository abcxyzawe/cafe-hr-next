import { redirect } from "next/navigation";
import { Target } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KpiForm } from "./kpi-form";

export const dynamic = "force-dynamic";

export default async function KpiFrameworkPage() {
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
              <Target className="size-5" />
            </span>
            Bộ khung KPI quán cà phê
          </CardTitle>
          <CardDescription>
            Chọn giai đoạn vận hành và 1-3 mục tiêu kinh doanh ưu tiên. AI sẽ
            đề xuất 5 KPI khởi đầu kèm định nghĩa, ngưỡng mục tiêu, tần suất đo
            lường và lý do quan trọng — phù hợp cho việc theo dõi kết quả vận
            hành quán.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <KpiForm />
        </CardContent>
      </Card>
    </div>
  );
}
