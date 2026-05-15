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
import { SentimentForm } from "./sentiment-form";

export const dynamic = "force-dynamic";

export default async function FeedbackSentimentPage() {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl md:text-3xl">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Heart className="size-5" />
            </span>
            Phân tích cảm xúc phản hồi
          </CardTitle>
          <CardDescription>
            Dán hoặc nhập phản hồi của khách hàng / nhân viên. AI sẽ chấm điểm
            cảm xúc, gợi ra 3 chủ đề chính và đề xuất 1 hành động cụ thể giúp
            quản lý quán phản hồi nhanh.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SentimentForm />
        </CardContent>
      </Card>
    </div>
  );
}
