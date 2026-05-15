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
import { MenuIdeasBoard } from "./menu-ideas-board";

export const dynamic = "force-dynamic";

export default async function MenuIdeasPage() {
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
              <Sparkles className="size-5" />
            </span>
            Ý tưởng menu theo mùa
          </CardTitle>
          <CardDescription>
            Chọn mùa và phong cách hương vị, AI sẽ gợi ý 5 món đồ uống mới với
            mô tả ngắn, danh sách nguyên liệu và giá thành ước tính. Bấm
            &quot;Lưu ý tưởng&quot; để giữ lại các món bạn thích.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MenuIdeasBoard />
        </CardContent>
      </Card>
    </div>
  );
}
