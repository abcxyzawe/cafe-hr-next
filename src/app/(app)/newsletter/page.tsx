import { redirect } from "next/navigation";
import { Newspaper } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NewsletterForm } from "./newsletter-form";

export const dynamic = "force-dynamic";

export default async function NewsletterPage() {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-indigo-500/15 via-violet-500/20 to-background">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md">
              <Newspaper className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-2xl tracking-tight text-transparent md:text-3xl">
                Bản tin nội bộ hàng tuần (AI)
              </CardTitle>
              <CardDescription className="mt-1 text-sm">
                Chọn tuần kết thúc, văn phong, độ dài và các tuỳ chọn. AI sẽ
                soạn bản tin tiếng Việt cho đội ngũ quán cà phê — bao gồm tin
                nổi bật, thành tựu, kế hoạch tuần tới, lời nhắn quản lý, và
                tuỳ chọn câu trích dẫn cùng cập nhật thời tiết. Sao chép
                Markdown / HTML hoặc in trực tiếp.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <NewsletterForm />
        </CardContent>
      </Card>
    </div>
  );
}
