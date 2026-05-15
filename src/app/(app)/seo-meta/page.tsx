import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SeoMetaForm } from "./seo-meta-form";

export const dynamic = "force-dynamic";

export default async function SeoMetaPage() {
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
              <Search className="size-5" />
            </span>
            Trình tạo SEO meta bằng AI
          </CardTitle>
          <CardDescription>
            Nhập tên quán và 1-3 điểm khác biệt (USP). AI sẽ tạo trọn bộ
            metadata SEO song ngữ Việt-Anh: title, meta description, 5 keyword,
            OG title và H1 landing — kèm bộ đếm ký tự để bạn paste thẳng vào
            website.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SeoMetaForm />
        </CardContent>
      </Card>
    </div>
  );
}
