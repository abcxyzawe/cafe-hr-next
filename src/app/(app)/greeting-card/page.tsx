import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GreetingCardForm } from "./greeting-card-form";

export const dynamic = "force-dynamic";

export default async function GreetingCardPage() {
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
              <Sparkles className="size-5" />
            </span>
            Tạo thiệp chúc mừng AI
          </CardTitle>
          <CardDescription>
            Chọn dịp, nhập tên người nhận và chọn giọng văn — AI sẽ vẽ một nền
            thiệp theo chủ đề và viết kèm lời chúc tiếng Việt khoảng 30-40 từ.
            Lời chúc được phủ bằng CSS để dễ in hoặc tải về.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GreetingCardForm />
        </CardContent>
      </Card>
    </div>
  );
}
