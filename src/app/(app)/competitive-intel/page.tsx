import { redirect } from "next/navigation";
import { Swords } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CompetitiveForm } from "./competitive-form";

export const dynamic = "force-dynamic";

export default async function CompetitiveIntelPage() {
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
              <Swords className="size-5" />
            </span>
            Phân tích cạnh tranh AI
          </CardTitle>
          <CardDescription>
            Mô tả quán của bạn cùng 1-3 đối thủ chính. AI sẽ tóm tắt điểm khác
            biệt, gợi ý 3 cơ hội đáng theo đuổi và 3 rủi ro cần cảnh giác để
            bạn ra quyết định nhanh hơn.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CompetitiveForm />
        </CardContent>
      </Card>
    </div>
  );
}
