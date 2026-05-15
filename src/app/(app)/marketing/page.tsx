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
import { MarketingForm } from "./marketing-form";

export const dynamic = "force-dynamic";

export default async function MarketingPage() {
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
            Tạo nội dung marketing bằng AI
          </CardTitle>
          <CardDescription>
            Nhập chủ đề chiến dịch, chọn tông giọng và ưu đãi nổi bật. AI sẽ
            sinh đồng thời slogan, caption mạng xã hội và bài quảng cáo Facebook
            sẵn sàng để đăng.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MarketingForm />
        </CardContent>
      </Card>
    </div>
  );
}
