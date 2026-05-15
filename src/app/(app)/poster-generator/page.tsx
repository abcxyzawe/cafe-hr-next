import { redirect } from "next/navigation";
import { ImageIcon } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PosterForm } from "./poster-form";

export const dynamic = "force-dynamic";

export default async function PosterGeneratorPage() {
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
              <ImageIcon className="size-5" />
            </span>
            Trình tạo poster AI
          </CardTitle>
          <CardDescription>
            Mô tả chủ đề, chọn phong cách và tông màu — AI sẽ vẽ một poster
            quảng cáo dọc cho quán cà phê. Headline được phủ bằng CSS sau khi
            ảnh tạo xong, dễ dàng tải về hoặc in trực tiếp.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PosterForm />
        </CardContent>
      </Card>
    </div>
  );
}
