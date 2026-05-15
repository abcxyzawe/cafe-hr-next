import { redirect } from "next/navigation";
import { UtensilsCrossed } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlateStylingForm } from "./plate-styling-form";

export const dynamic = "force-dynamic";

export default async function PlateStylingPage() {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-amber-200/60 via-rose-200/50 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl md:text-3xl">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 text-white shadow-md">
              <UtensilsCrossed className="size-5" />
            </span>
            Concept trình bày món bằng AI
          </CardTitle>
          <CardDescription>
            Nhập tên món, chọn kiểu đĩa, phong cách trình bày và nền chụp — AI
            sẽ dựng một ảnh concept vuông 1024x1024 để bếp, marketing và nhiếp
            ảnh tham khảo trước khi chụp thật.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlateStylingForm />
        </CardContent>
      </Card>
    </div>
  );
}
