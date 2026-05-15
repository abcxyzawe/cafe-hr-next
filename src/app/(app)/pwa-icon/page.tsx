import { redirect } from "next/navigation";
import { Smartphone } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PwaIconForm } from "./pwa-icon-form";

export const dynamic = "force-dynamic";

export default async function PwaIconPage() {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl md:text-3xl">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Smartphone className="size-5" />
            </span>
            Tạo icon PWA bằng AI
          </CardTitle>
          <CardDescription>
            Tạo icon mới rồi tải xuống để thay thế thủ công trong
            {" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              public/brand/
            </code>
            . AI sẽ vẽ một icon vuông ~512px dựa trên chữ initial, style và
            màu nền bạn chọn — phù hợp dùng làm icon ứng dụng PWA.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PwaIconForm />
        </CardContent>
      </Card>
    </div>
  );
}
