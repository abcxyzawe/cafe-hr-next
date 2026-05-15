import { redirect } from "next/navigation";
import { Wand2 } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NameGeneratorForm } from "./name-generator-form";

export const dynamic = "force-dynamic";

export default async function NameGeneratorPage() {
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
              <Wand2 className="size-5" />
            </span>
            Đặt tên quán cà phê bằng AI
          </CardTitle>
          <CardDescription>
            Chọn vibe, phong cách ngôn ngữ và thêm vài từ khoá gợi ý (nếu có).
            AI sẽ đề xuất 8 cái tên kèm tagline và lý do lựa chọn — sao chép
            ngay những cái bạn ưng ý.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NameGeneratorForm />
        </CardContent>
      </Card>
    </div>
  );
}
