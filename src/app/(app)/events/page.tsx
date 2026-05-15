import { redirect } from "next/navigation";
import { CalendarHeart } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { EventsBoard } from "./events-board";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-amber-500/15 via-rose-500/10 to-background">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <CalendarHeart className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-2xl tracking-tight md:text-3xl">
                Lịch sự kiện cafe
              </CardTitle>
              <CardDescription className="mt-1 text-sm">
                Lên lịch các buổi thử nếm, workshop, live music hay khuyến mãi
                sắp tới — đội ngũ có thể chuẩn bị trước và sao chép thông báo
                cho khách.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Lưu ý: lịch sự kiện chỉ <strong>lưu trên thiết bị này</strong>{" "}
            (localStorage của trình duyệt) — mỗi máy giữ danh sách riêng, không
            đồng bộ qua máy chủ.
          </p>
        </CardContent>
      </Card>

      <EventsBoard />
    </div>
  );
}
