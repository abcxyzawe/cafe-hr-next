import { redirect } from "next/navigation";
import { Target } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { GoalsBoard } from "./goals-board";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Target className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-2xl tracking-tight md:text-3xl">
                Mục tiêu cá nhân
              </CardTitle>
              <CardDescription className="mt-1 text-sm">
                Đặt mục tiêu giờ làm, số ca, thu nhập hay kỹ năng cho riêng bạn
                và theo dõi tiến độ từng ngày.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Lưu ý: danh sách mục tiêu chỉ <strong>lưu trên thiết bị này</strong>{" "}
            (localStorage của trình duyệt) — không đồng bộ qua máy chủ.
          </p>
        </CardContent>
      </Card>

      <GoalsBoard />
    </div>
  );
}
