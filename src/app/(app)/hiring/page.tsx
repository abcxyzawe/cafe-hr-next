import { redirect } from "next/navigation";
import { Briefcase } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HiringForm } from "./hiring-form";

export const dynamic = "force-dynamic";

export default async function HiringPage() {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-accent/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="size-5 text-primary" />
            Soạn tin tuyển dụng
          </CardTitle>
          <CardDescription>
            Chọn vai trò, ca làm việc và quyền lợi nổi bật — AI sẽ viết tin
            tuyển dụng tiếng Việt khoảng 150 từ. Bạn có thể chỉnh sửa, sao
            chép hoặc tải xuống dưới dạng Markdown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HiringForm />
        </CardContent>
      </Card>
    </div>
  );
}
