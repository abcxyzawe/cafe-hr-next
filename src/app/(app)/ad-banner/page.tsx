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
import { AdBannerForm } from "./ad-banner-form";

export const dynamic = "force-dynamic";

export default async function AdBannerPage() {
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
            Trình tạo Ad Banner AI
          </CardTitle>
          <CardDescription>
            Mô tả chiến dịch, chọn phong cách và nền tảng — AI sẽ vẽ một ad
            banner ngang 1.91:1 với khoảng âm bên phải để phủ headline. Văn bản
            offer/CTA được overlay bằng CSS, không nhúng vào ảnh.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdBannerForm />
        </CardContent>
      </Card>
    </div>
  );
}
