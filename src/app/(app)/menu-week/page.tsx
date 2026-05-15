import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MenuWeekForm } from "./menu-week-form";

export const dynamic = "force-dynamic";

export default async function MenuWeekPage() {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl md:text-3xl">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <CalendarDays className="size-5" />
            </span>
            Menu tuần xoay vòng
          </CardTitle>
          <CardDescription>
            Chọn mùa và chủ đề trọng tâm — AI sẽ lập một menu đặc biệt 7 ngày
            (Thứ Hai đến Chủ Nhật), mỗi ngày một món gợi ý kèm mô tả ngắn. Bạn
            có thể tải về dạng Markdown để in hoặc chia sẻ.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MenuWeekForm />
        </CardContent>
      </Card>
    </div>
  );
}
