import { redirect } from "next/navigation";
import { Quote } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { TestimonialsBoard } from "./testimonials-board";

export const dynamic = "force-dynamic";

export default async function TestimonialsPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-background">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md">
              <Quote className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-2xl tracking-tight md:text-3xl">
                Tường cảm nhận khách hàng
              </CardTitle>
              <CardDescription className="mt-1 text-sm">
                Tổng hợp những lời khen tặng từ khách. Bật chế độ trình chiếu
                khi đặt máy tính bảng tại quầy để mỗi lời cảm ơn xuất hiện
                lần lượt.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <TestimonialsBoard />
    </div>
  );
}
