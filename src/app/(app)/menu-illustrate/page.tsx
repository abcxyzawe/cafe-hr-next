import { redirect } from "next/navigation";
import { Palette } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MenuIllustrateForm } from "./menu-illustrate-form";

export const dynamic = "force-dynamic";

export default async function MenuIllustratePage() {
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
              <Palette className="size-5" />
            </span>
            Tạo minh họa món AI
          </CardTitle>
          <CardDescription>
            Nhập tên món và mô tả ngắn, chọn phong cách — AI sẽ vẽ một minh
            họa vuông 1:1 phù hợp dùng cho menu, mạng xã hội hoặc bảng giá.
            Có thể chọn nhanh từ danh sách menu đã lưu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MenuIllustrateForm />
        </CardContent>
      </Card>
    </div>
  );
}
