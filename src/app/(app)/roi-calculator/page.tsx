import { redirect } from "next/navigation";
import { TrendingUp } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RoiCalculator } from "./roi-calculator";

export const dynamic = "force-dynamic";

export default async function RoiCalculatorPage() {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl md:text-3xl">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <TrendingUp className="size-5" />
            </span>
            ROI &amp; điểm hòa vốn
          </CardTitle>
          <CardDescription>
            Mô phỏng dòng tiền 24 tháng cho quán cà phê. Nhập vốn đầu tư, chi
            phí cố định, doanh thu tháng và biên lợi nhuận gộp để xem điểm hòa
            vốn, lợi nhuận lũy kế và độ nhạy theo doanh thu (±10%).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RoiCalculator />
        </CardContent>
      </Card>
    </div>
  );
}
