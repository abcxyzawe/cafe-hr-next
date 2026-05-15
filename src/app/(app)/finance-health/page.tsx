import { redirect } from "next/navigation";
import { Activity } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FinanceHealthForm } from "./finance-health-form";

export const dynamic = "force-dynamic";

export default async function FinanceHealthPage() {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl md:text-3xl">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Activity className="size-5" />
            </span>
            Sức khỏe tài chính bằng AI
          </CardTitle>
          <CardDescription>
            Tổng hợp doanh thu và chi phí (lưu cục bộ trên thiết bị này) cùng
            với số liệu lương từ máy chủ. AI sẽ chấm điểm sức khỏe tài chính
            (0-100) và đề xuất 3 điểm mạnh, 3 rủi ro, 3 việc cần làm để cải
            thiện.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FinanceHealthForm />
        </CardContent>
      </Card>
    </div>
  );
}
