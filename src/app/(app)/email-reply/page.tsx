import { redirect } from "next/navigation";
import { Mail } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmailReplyForm } from "./email-reply-form";

export const dynamic = "force-dynamic";

export default async function EmailReplyPage() {
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
              <Mail className="size-5" />
            </span>
            Trợ lý phản hồi email khách hàng
          </CardTitle>
          <CardDescription>
            Dán email/tin nhắn gốc của khách, chọn tone phù hợp, AI sẽ soạn một
            phản hồi tiếng Việt khoảng 100-150 từ — có lời chào, thân bài và ký
            tên &ldquo;Đội Cafe HR&rdquo;. Bạn có thể chỉnh sửa trước khi gửi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmailReplyForm />
        </CardContent>
      </Card>
    </div>
  );
}
