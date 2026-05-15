import { redirect } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FaqForm } from "./faq-form";

export const dynamic = "force-dynamic";

export default async function FaqGeneratorPage() {
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
              <HelpCircle className="size-5" />
            </span>
            Tạo FAQ cho khách hàng
          </CardTitle>
          <CardDescription>
            Nhập một chủ đề (ví dụ: <span className="font-medium">menu và giá cả</span>,{" "}
            <span className="font-medium">đặt bàn</span>,{" "}
            <span className="font-medium">phương thức thanh toán</span>) — AI sẽ tạo
            10 cặp câu hỏi & trả lời tiếng Việt sẵn sàng đăng lên website hoặc
            fanpage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FaqForm />
        </CardContent>
      </Card>
    </div>
  );
}
