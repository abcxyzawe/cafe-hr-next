import { redirect } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { CHECKLIST_PRESETS } from "@/lib/checklist-presets";
import { ChecklistCard } from "./checklist-card";

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

export default async function ChecklistPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");

  const headerDate = formatHeaderDate();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <ClipboardCheck className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-2xl tracking-tight md:text-3xl">
                Checklist vận hành hàng ngày
              </CardTitle>
              <CardDescription className="mt-1 text-sm">
                Hôm nay {headerDate}. Hoàn thành 3 nhóm việc dưới đây cho ca của
                bạn — trạng thái lưu trên trình duyệt và tự đặt lại mỗi ngày.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Mẹo: tick từng việc khi vừa làm xong — các mục đã hoàn thành sẽ tự
            chuyển xuống cuối danh sách. Dùng nút &quot;Đặt lại hôm nay&quot;
            nếu cần làm lại từ đầu.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {CHECKLIST_PRESETS.map((preset) => (
          <ChecklistCard key={preset.key} preset={preset} />
        ))}
      </div>
    </div>
  );
}
