import { redirect } from "next/navigation";
import { Mic } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PodcastScriptForm } from "./podcast-script-form";

export const dynamic = "force-dynamic";

export default async function PodcastScriptPage() {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Mic className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-2xl tracking-tight md:text-3xl">
                Trình tạo kịch bản podcast (AI)
              </CardTitle>
              <CardDescription className="mt-1 text-sm">
                Nhập chủ đề, chọn thời lượng, phong cách và tên host — AI sẽ
                soạn một kịch bản podcast tiếng Việt cho quán cà phê: hook mở
                đầu, 3 segment có tiêu đề và nội dung host monologue, kèm CTA
                kết bài. Có thể sao chép toàn văn hoặc tải về file .md.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PodcastScriptForm />
        </CardContent>
      </Card>
    </div>
  );
}
