import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { MenuBoard } from "./menu-board";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");

  const isAdmin = sess.role === "admin";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background print:hidden">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <BookOpen className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-2xl tracking-tight md:text-3xl">
                Menu quán
              </CardTitle>
              <CardDescription className="mt-1 text-sm">
                Bảng menu công khai — gồm 5 nhóm: Cà phê, Đồ uống đá, Trà, Bánh
                và Khác.{" "}
                {isAdmin
                  ? "Bạn có thể thêm, sửa và xoá món trực tiếp ở đây."
                  : "Chỉ admin mới có quyền chỉnh sửa danh sách."}{" "}
                In bằng nút bên dưới (khổ A4 dọc).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Dữ liệu lưu trên trình duyệt thiết bị này. Mỗi máy có thể có danh
            sách menu riêng — đồng bộ thủ công nếu cần.
          </p>
        </CardContent>
      </Card>

      <MenuBoard isAdmin={isAdmin} />
    </div>
  );
}
