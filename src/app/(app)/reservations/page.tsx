import { redirect } from "next/navigation";
import { CalendarClock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { ReservationsBoard } from "./reservations-board";

export const dynamic = "force-dynamic";

function formatHeaderDate(): string {
  const d = new Date();
  const weekday = [
    "Chủ Nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
  ][d.getDay()];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${weekday}, ${dd}/${mm}/${d.getFullYear()}`;
}

export default async function ReservationsPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");

  const headerDate = formatHeaderDate();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <CalendarClock className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-2xl tracking-tight md:text-3xl">
                Đặt bàn của khách
              </CardTitle>
              <CardDescription className="mt-1 text-sm">
                Hôm nay {headerDate}. Theo dõi các nhóm khách đặt bàn tại quán —
                ghi nhận tên, giờ tới và số người để chuẩn bị chỗ ngồi đúng giờ.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Lưu ý: danh sách đặt bàn chỉ <strong>lưu trên thiết bị này</strong>{" "}
            (localStorage của trình duyệt) — mỗi máy/quầy giữ danh sách riêng,
            không đồng bộ qua máy chủ.
          </p>
        </CardContent>
      </Card>

      <ReservationsBoard />
    </div>
  );
}
