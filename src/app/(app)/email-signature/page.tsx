import { redirect } from "next/navigation";
import { Mail } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { EmailSigBuilder } from "./email-sig-builder";

export const dynamic = "force-dynamic";

export default async function EmailSignaturePage() {
  const sess = await getSession();
  if (!sess) redirect("/login");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Mail className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-2xl tracking-tight md:text-3xl">
                Chữ ký email
              </CardTitle>
              <CardDescription className="mt-1 text-sm">
                Tạo chữ ký HTML chuyên nghiệp để dán vào Gmail, Outlook hay bất
                kỳ trình email nào — preview hiển thị bằng inline-style an toàn,
                bản nháp tự lưu trên trình duyệt.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Mẹo: nhập thông tin bên trái, chọn tone màu phù hợp với thương hiệu,
            rồi bấm &quot;Sao chép HTML&quot; và dán vào phần cài đặt chữ ký
            của email client (Gmail → Settings → Signature).
          </p>
        </CardContent>
      </Card>

      <EmailSigBuilder />
    </div>
  );
}
