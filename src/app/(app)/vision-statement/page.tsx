import { redirect } from "next/navigation";
import { Compass } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VisionStatementForm } from "./vision-statement-form";

export const dynamic = "force-dynamic";

export default async function VisionStatementPage() {
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
              <Compass className="size-5" />
            </span>
            Tuyên ngôn thương hiệu bằng AI
          </CardTitle>
          <CardDescription>
            Nhập số năm hoạt động, đối tượng khách mục tiêu và USP cốt lõi
            của quán. AI sẽ soạn Tầm nhìn (1 câu), Sứ mệnh (1-2 câu) và 5
            Giá trị cốt lõi cho thương hiệu của bạn — sẵn sàng dán lên
            trang Giới thiệu hoặc tải về dạng Markdown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VisionStatementForm />
        </CardContent>
      </Card>
    </div>
  );
}
