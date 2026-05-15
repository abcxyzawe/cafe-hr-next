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
import { InteriorForm } from "./interior-form";

export const dynamic = "force-dynamic";

export default async function InteriorDesignPage() {
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
              <Palette className="size-5" />
            </span>
            Gợi ý thiết kế nội thất AI
          </CardTitle>
          <CardDescription>
            Chọn phong cách, ngân sách và diện tích — AI sẽ đề xuất 4 concept
            nội thất khác nhau cho quán cà phê của bạn, kèm bảng màu, các yếu
            tố then chốt và dự trù chi phí ước tính.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InteriorForm />
        </CardContent>
      </Card>
    </div>
  );
}
