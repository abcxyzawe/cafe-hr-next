import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThankYouForm } from "./thank-you-form";

export const dynamic = "force-dynamic";

export default async function ThankYouPage() {
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
              <Heart className="size-5" />
            </span>
            Trợ lý lời cảm ơn khách hàng
          </CardTitle>
          <CardDescription>
            Chọn ngữ cảnh khách, kênh gửi và (tuỳ chọn) tên khách. AI sẽ soạn 3
            phiên bản lời cảm ơn tiếng Việt — ngắn, vừa và dài (kèm ưu đãi nhỏ)
            — phù hợp với SMS, email hoặc tin nhắn Facebook. Bạn có thể sao chép
            phiên bản ưng ý để gửi trực tiếp.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThankYouForm />
        </CardContent>
      </Card>
    </div>
  );
}
