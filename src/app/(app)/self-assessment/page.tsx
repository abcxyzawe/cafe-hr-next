import { redirect } from "next/navigation";
import { HeartPulse, Lock } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SelfAssessmentBoard } from "./self-assessment-board";

export const dynamic = "force-dynamic";

export default async function SelfAssessmentPage() {
  const sess = await getSession();
  if (!sess) {
    redirect("/login");
  }

  const initialRole = sess.role === "admin" ? "manager" : "barista";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <HeartPulse className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-2xl tracking-tight md:text-3xl">
                Tự đánh giá hạnh phúc trong công việc
              </CardTitle>
              <CardDescription className="mt-1 text-sm">
                AI sẽ soạn 10 câu hỏi tự phản chiếu phù hợp với vai trò của
                bạn. Trả lời theo thang 1-5 để xem chỉ số hạnh phúc tổng thể
                và lưu lại nhật ký riêng tư.
              </CardDescription>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/70 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                <Lock className="size-3 text-primary" />
                Riêng tư trên thiết bị này — không chia sẻ với quản lý hay
                đồng nghiệp.
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SelfAssessmentBoard initialRole={initialRole} />
        </CardContent>
      </Card>
    </div>
  );
}
