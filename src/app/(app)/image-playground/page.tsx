import { redirect } from "next/navigation";
import { ImageIcon } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlaygroundForm } from "./playground-form";

export const dynamic = "force-dynamic";

export default async function ImagePlaygroundPage() {
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
              <ImageIcon className="size-5" />
            </span>
            Sân chơi tạo ảnh AI
          </CardTitle>
          <CardDescription>
            Mô tả một hình ảnh chủ đề quán cà phê hoặc thương hiệu, AI sẽ vẽ
            cho bạn. Phù hợp để tạo nhanh hình minh hoạ cho banner, mạng xã
            hội hoặc menu nội bộ.
            <br />
            <span className="mt-1 inline-block text-xs italic">
              Lưu trên thiết bị này: 6 ảnh gần nhất chỉ được lưu trong trình
              duyệt của bạn. Đường dẫn ảnh có thể hết hạn sau một thời gian.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlaygroundForm />
        </CardContent>
      </Card>
    </div>
  );
}
