import { redirect } from "next/navigation";
import { ClipboardList, Sparkles } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { SurveyBuilderBoard } from "./survey-builder-board";

export const dynamic = "force-dynamic";

export default async function SurveyBuilderPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");
  if (sess.role !== "admin") redirect("/");

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-sky-500/10 via-violet-500/5 to-background">
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="size-5 text-sky-500" />
            Trình tạo khảo sát khách hàng
          </CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1">
              <Sparkles className="size-3.5 text-muted-foreground" />
              Tạo khảo sát, chia sẻ link/QR cho khách. Phản hồi lưu trên
              localStorage của thiết bị mở liên kết.
            </span>
          </CardDescription>
        </CardHeader>
      </Card>

      <SurveyBuilderBoard />
    </div>
  );
}
