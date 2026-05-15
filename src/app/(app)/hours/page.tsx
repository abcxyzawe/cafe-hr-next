import { redirect } from "next/navigation";
import { Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { HoursBoard } from "./hours-board";

export const dynamic = "force-dynamic";

export default async function HoursPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");
  if (sess.role !== "admin") redirect("/");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background print:hidden">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Clock className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-2xl tracking-tight md:text-3xl">
                Giờ hoạt động của quán
              </CardTitle>
              <CardDescription className="mt-1 text-sm">
                Đặt lịch mở/đóng cửa cho từng ngày trong tuần. Có thể đánh dấu
                ngày nghỉ và áp dụng nhanh cho cả tuần.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Lưu ý: lịch giờ hoạt động chỉ{" "}
            <strong>lưu trên thiết bị này</strong> (localStorage) — mỗi máy/quầy
            sẽ có lịch riêng, không đồng bộ qua máy chủ.
          </p>
        </CardContent>
      </Card>

      <HoursBoard />
    </div>
  );
}
