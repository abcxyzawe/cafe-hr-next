import { redirect } from "next/navigation";
import { MessageSquareHeart } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GreetingsBoard } from "./greetings-board";

export const dynamic = "force-dynamic";

export default async function GreetingsPage() {
  const sess = await getSession();
  if (!sess) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl md:text-3xl">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <MessageSquareHeart className="size-5" />
            </span>
            Kịch bản chào & phục vụ
          </CardTitle>
          <CardDescription>
            Bộ câu mẫu tiếng Việt cho nhân viên: chào đón, giới thiệu menu, gợi
            ý thêm, xử lý phàn nàn, hỏi sở thích và tạm biệt khách. Bấm “Sao
            chép” để dùng nhanh trong sổ tay hoặc đào tạo nhân viên mới.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GreetingsBoard />
        </CardContent>
      </Card>
    </div>
  );
}
