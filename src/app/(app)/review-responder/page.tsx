import { redirect } from "next/navigation";
import { MessageCircleHeart } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReviewResponderForm } from "./review-responder-form";

export const dynamic = "force-dynamic";

export default async function ReviewResponderPage() {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl md:text-3xl">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <MessageCircleHeart className="size-5" />
            </span>
            Trợ lý phản hồi đánh giá khách hàng
          </CardTitle>
          <CardDescription>
            Dán nội dung đánh giá khách hàng từ Google, Facebook, ShopeeFood,
            GrabFood, Foody hoặc kênh nội bộ. AI sẽ phân tích cảm xúc, nhận
            diện các vấn đề chính, gợi ý hành động cho đội ngũ và soạn 3 biến
            thể phản hồi (Thấu cảm / Chuyên nghiệp / Ấm áp) để bạn chọn và
            đăng lên nền tảng. Hỗ trợ in ấn và xuất Markdown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReviewResponderForm />
        </CardContent>
      </Card>
    </div>
  );
}
