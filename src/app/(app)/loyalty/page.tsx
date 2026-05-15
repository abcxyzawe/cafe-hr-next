import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { LoyaltyDashboard } from "./loyalty-dashboard";

export const dynamic = "force-dynamic";

export default async function LoyaltyPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Heart className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-2xl tracking-tight md:text-3xl">
                Khách hàng thân thiết
              </CardTitle>
              <CardDescription className="mt-1 text-sm">
                Lưu trên thiết bị này — không đồng bộ giữa thiết bị.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Theo dõi VIP, ghi nhận lượt ghé và phân hạng khách quen của quán.
            Dữ liệu chỉ lưu cục bộ trong trình duyệt (localStorage).
          </p>
        </CardContent>
      </Card>

      <LoyaltyDashboard />
    </div>
  );
}
