import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StorefrontForm } from "./storefront-form";

export const dynamic = "force-dynamic";

export default async function StorefrontMockupPage() {
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
              <Building2 className="size-5" />
            </span>
            Mockup mặt tiền quán bằng AI
          </CardTitle>
          <CardDescription>
            Nhập tên quán, chọn phong cách kiến trúc, kiểu mặt tiền và yếu tố
            nhấn mạnh — AI sẽ dựng một ảnh mockup ngoại thất 16:9 để bạn tham
            khảo, in ấn hoặc gửi cho kiến trúc sư.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StorefrontForm />
        </CardContent>
      </Card>
    </div>
  );
}
