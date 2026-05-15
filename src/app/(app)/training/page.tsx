import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrainingForm } from "./training-form";

export const dynamic = "force-dynamic";

export default async function TrainingPage() {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-accent/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="size-5 text-primary" />
            Soạn lộ trình đào tạo
          </CardTitle>
          <CardDescription>
            Chọn vai trò, mức kinh nghiệm và thời lượng — AI sẽ soạn một lộ
            trình đào tạo tiếng Việt khoảng 250 từ với mục tiêu, lịch trình
            theo ngày và cách đánh giá. Bạn có thể chỉnh sửa, sao chép hoặc
            tải xuống dưới dạng Markdown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TrainingForm />
        </CardContent>
      </Card>
    </div>
  );
}
