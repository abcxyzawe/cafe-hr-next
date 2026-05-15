import { redirect } from "next/navigation";
import { Clapperboard } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StoryboardForm } from "./storyboard-form";

export const dynamic = "force-dynamic";

export default async function StoryboardPage() {
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
              <Clapperboard className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-2xl tracking-tight md:text-3xl">
                Trình tạo storyboard video (AI)
              </CardTitle>
              <CardDescription className="mt-1 text-sm">
                Nhập ý tưởng, chọn thời lượng và phong cách — AI sẽ phác thảo
                storyboard 6 khung hình cho video ngắn dạng dọc của quán cà phê
                (TikTok / Reels): mỗi khung có mô tả cảnh quay, lời voiceover
                tiếng Việt và thời lượng ước tính. Có thể tải về dưới dạng .md.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <StoryboardForm />
        </CardContent>
      </Card>
    </div>
  );
}
