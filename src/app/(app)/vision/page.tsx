import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { VisionBoard } from "./vision-board";

export const dynamic = "force-dynamic";

export default async function VisionPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");
  if (sess.role !== "admin") redirect("/");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-rose-100/60 via-amber-100/40 to-sky-100/40 dark:from-rose-500/15 dark:via-amber-500/10 dark:to-sky-500/10">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Sparkles className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-2xl tracking-tight md:text-3xl">
                Bảng cảm hứng quán
              </CardTitle>
              <CardDescription className="mt-1 text-sm">
                Ghim ảnh tham khảo, câu nói truyền cảm hứng hay mục tiêu lớn lên
                bảng để giữ cho cả đội luôn nhớ về tầm nhìn chung.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Lưu ý: bảng cảm hứng chỉ <strong>lưu trên thiết bị này</strong>{" "}
            (localStorage của trình duyệt) — không đồng bộ qua máy chủ.
          </p>
        </CardContent>
      </Card>

      <VisionBoard />
    </div>
  );
}
