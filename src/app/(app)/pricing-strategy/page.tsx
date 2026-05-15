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
import { PricingForm } from "./pricing-form";

export const dynamic = "force-dynamic";

export default async function PricingStrategyPage() {
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
            Cố vấn chiến lược giá
          </CardTitle>
          <CardDescription>
            Nhập chi phí trung bình mỗi ly, giá đối thủ và biên lợi nhuận mục
            tiêu, AI sẽ đề xuất giá bán cho tối đa 5 món cùng lý do ngắn gọn —
            giúp bạn cân bằng giữa cạnh tranh và lợi nhuận.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PricingForm />
        </CardContent>
      </Card>
    </div>
  );
}
