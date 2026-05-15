import { redirect } from "next/navigation";
import { Leaf } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { SustainabilityBoard } from "./sustainability-board";

export const dynamic = "force-dynamic";

export default async function SustainabilityPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-emerald-200/40 via-lime-100/40 to-background dark:from-emerald-500/15 dark:via-lime-500/10">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
              <Leaf className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-2xl tracking-tight md:text-3xl">
                Theo dõi bền vững
              </CardTitle>
              <CardDescription className="mt-1 text-sm">
                Ghi lại các hành động thân thiện môi trường mỗi ngày: ủ phân,
                tái chế, ly tái sử dụng và lượng nước tiết kiệm. Dữ liệu lưu
                trên thiết bị này.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Mẹo: Nhập số liệu vào ô bên dưới và bấm ra ngoài (blur) để lưu. Eco
            score và thống kê tuần sẽ tự cập nhật.
          </p>
        </CardContent>
      </Card>

      <SustainabilityBoard />
    </div>
  );
}
