import { redirect } from "next/navigation";
import { Star } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReviewsBoard } from "./reviews-board";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const sess = await getSession();
  if (!sess) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-amber-100/40 via-orange-100/30 to-background dark:from-amber-900/20 dark:via-orange-900/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl md:text-3xl">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md">
              <Star className="size-5 fill-current" />
            </span>
            Đánh giá khách hàng
          </CardTitle>
          <CardDescription>
            Ghi nhận nhanh ý kiến khách tại quán: số sao, nguồn (tại quán /
            Google / FB) và bình luận ngắn. Theo dõi điểm trung bình hôm nay
            và xu hướng 7 ngày.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReviewsBoard />
        </CardContent>
      </Card>
    </div>
  );
}
