import { redirect } from "next/navigation";
import { Boxes } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { InventoryGrid } from "./inventory-grid";

export const dynamic = "force-dynamic";

function formatHeaderDate(): string {
  const d = new Date();
  const weekday = [
    "Chủ Nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
  ][d.getDay()];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${weekday}, ${dd}/${mm}/${d.getFullYear()}`;
}

export default async function InventoryPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");

  const headerDate = formatHeaderDate();
  const isAdmin = sess.role === "admin";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Boxes className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-2xl tracking-tight md:text-3xl">
                Tồn kho
              </CardTitle>
              <CardDescription className="mt-1 text-sm">
                Hôm nay {headerDate}. Theo dõi nhanh số lượng nguyên vật liệu và
                bao bì còn lại trong quán.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Lưu ý: dữ liệu tồn kho chỉ <strong>lưu trên thiết bị này</strong>{" "}
            (localStorage của trình duyệt) — mỗi máy/quầy sẽ giữ số liệu riêng,
            không đồng bộ qua máy chủ.
          </p>
        </CardContent>
      </Card>

      <InventoryGrid isAdmin={isAdmin} />
    </div>
  );
}
