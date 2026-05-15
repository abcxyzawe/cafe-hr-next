import { redirect } from "next/navigation";
import { Palette } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MoodBoardForm } from "./mood-board-form";

export const dynamic = "force-dynamic";

export default async function MoodBoardPage() {
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
              <Palette className="size-5" />
            </span>
            Mood board AI cho quán
          </CardTitle>
          <CardDescription>
            Chọn aesthetic và 3 từ khoá — AI sẽ dựng 4 ảnh đồng bộ với 4 góc
            chụp khác nhau (chi tiết nội thất, tĩnh vật bàn, flat-lay từ
            trên, ánh sáng cửa sổ) để bạn so sánh, tải về hoặc pin lên Vision
            Board.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MoodBoardForm />
        </CardContent>
      </Card>
    </div>
  );
}
