import { redirect } from "next/navigation";
import { Camera } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IgPostForm } from "./ig-post-form";

export const dynamic = "force-dynamic";

export default async function IgPostPage() {
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
              <Camera className="size-5" />
            </span>
            Trình tạo IG post AI
          </CardTitle>
          <CardDescription>
            Mô tả chủ đề, chọn vibe và màu nhấn — AI sẽ vẽ một ảnh vuông 1:1
            phù hợp Instagram. Caption / overlay được phủ bằng CSS sau khi ảnh
            tạo xong, dễ dàng tải về để đăng.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <IgPostForm />
        </CardContent>
      </Card>
    </div>
  );
}
