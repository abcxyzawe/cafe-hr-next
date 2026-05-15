import { redirect } from "next/navigation";
import { Megaphone } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SocialContentForm } from "./social-content-form";

export const dynamic = "force-dynamic";

export default async function SocialContentPage() {
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
              <Megaphone className="size-5" />
            </span>
            Trình tạo nội dung social bằng AI
          </CardTitle>
          <CardDescription>
            Nhập chủ đề (món mới, sự kiện, ưu đãi…) và chọn tông giọng. AI sẽ
            tạo trọn bộ 3 nội dung cho Instagram, TikTok và Facebook — mỗi nền
            tảng được tối ưu theo định dạng riêng, kèm bộ đếm ký tự để bạn
            paste thẳng lên app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SocialContentForm />
        </CardContent>
      </Card>
    </div>
  );
}
