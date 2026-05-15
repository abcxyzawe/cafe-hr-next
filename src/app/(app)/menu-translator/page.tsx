import { redirect } from "next/navigation";
import { Languages } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MenuTranslatorForm } from "./menu-translator-form";

export const dynamic = "force-dynamic";

export default async function MenuTranslatorPage() {
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
              <Languages className="size-5" />
            </span>
            Dịch menu sang tiếng Anh
          </CardTitle>
          <CardDescription>
            Dán danh sách món từ menu (mỗi món một dòng, có thể kèm giá). AI sẽ
            dịch sang tiếng Anh kèm mô tả ngắn — phù hợp để giới thiệu cho
            khách du lịch hoặc khách nước ngoài.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MenuTranslatorForm />
        </CardContent>
      </Card>
    </div>
  );
}
