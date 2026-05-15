import { redirect } from "next/navigation";
import { MessagesSquare } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StaffCoachingForm } from "./staff-coaching-form";

export const dynamic = "force-dynamic";

export default async function StaffCoachingPage() {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-teal-500/15 via-cyan-400/20 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl md:text-3xl">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-md">
              <MessagesSquare className="size-5" />
            </span>
            Trợ lý soạn kịch bản huấn luyện nhân sự
          </CardTitle>
          <CardDescription>
            Nhập thông tin nhân sự, lý do và tình huống cụ thể. AI sẽ soạn
            một kịch bản nói chuyện 1:1 chia theo các giai đoạn rõ ràng, kèm
            câu thoại mẫu, gợi ý nên nói / cần tránh, tiêu chí thành công và
            các nhánh tình huống. Hỗ trợ in ấn và sao chép Markdown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StaffCoachingForm />
        </CardContent>
      </Card>
    </div>
  );
}
