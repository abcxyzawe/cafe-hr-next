import { redirect } from "next/navigation";
import { Timer } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { BreakTimer } from "./break-timer";

export const dynamic = "force-dynamic";

export default async function BreakTimerPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Timer className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-2xl tracking-tight md:text-3xl">
                Hẹn giờ Pomodoro &amp; nghỉ giữa ca
              </CardTitle>
              <CardDescription className="mt-1 text-sm">
                Tập trung làm việc theo từng chu kỳ ngắn, xen kẽ các đoạn nghỉ
                hồi sức. Cài đặt và số chu kỳ hôm nay được lưu trong trình duyệt
                của bạn.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Mẹo: rời tab vẫn không sao — tiêu đề tab sẽ hiện thời gian còn lại,
            và một tiếng chuông nhỏ sẽ vang lên mỗi khi đổi pha.
          </p>
        </CardContent>
      </Card>

      <BreakTimer />
    </div>
  );
}
