import { redirect } from "next/navigation";
import { PenLine } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BlogPostForm } from "./blog-post-form";

export const dynamic = "force-dynamic";

export default async function BlogPostPage() {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <PenLine className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-2xl tracking-tight md:text-3xl">
                Trình tạo bài blog (AI)
              </CardTitle>
              <CardDescription className="mt-1 text-sm">
                Nhập chủ đề, chọn đối tượng độc giả, độ dài và CTA — AI sẽ
                soạn một bài blog tiếng Việt với tiêu đề, đoạn mở đầu, 3 mục
                triển khai (mỗi mục 2 đoạn), CTA tuỳ chọn và 3-5 tag gợi ý.
                Có thể sao chép Markdown hoặc tải về file .md.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <BlogPostForm />
        </CardContent>
      </Card>
    </div>
  );
}
