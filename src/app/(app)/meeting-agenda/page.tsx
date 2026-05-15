import { redirect } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MeetingAgendaForm } from "./meeting-agenda-form";

export const dynamic = "force-dynamic";

export default async function MeetingAgendaPage() {
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
              <CalendarClock className="size-5" />
            </span>
            Trợ lý chương trình họp AI
          </CardTitle>
          <CardDescription>
            Chọn loại cuộc họp, thời lượng và số người tham dự. AI sẽ dựng một
            chương trình họp có thứ tự thời gian rõ ràng, phân vai chủ trì,
            ghi chú chuẩn bị và tiêu chí thành công cho từng mục. Hỗ trợ in
            ấn và xuất Markdown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MeetingAgendaForm />
        </CardContent>
      </Card>
    </div>
  );
}
