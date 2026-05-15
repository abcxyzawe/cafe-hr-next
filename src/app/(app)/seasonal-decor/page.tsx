import { redirect } from "next/navigation";
import { Snowflake } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SeasonalDecorForm } from "./seasonal-decor-form";

export const dynamic = "force-dynamic";

export default async function SeasonalDecorPage() {
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
              <Snowflake className="size-5" />
            </span>
            Concept trang trí theo mùa AI
          </CardTitle>
          <CardDescription>
            Chọn mùa và bối cảnh lễ hội — AI sẽ phác 4 concept trang trí song
            song cho 4 vị trí: cổng vào, mảng tường nhấn, trang trí trên bàn,
            cửa sổ hướng phố. Bạn có thể tải về từng concept để tham khảo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SeasonalDecorForm />
        </CardContent>
      </Card>
    </div>
  );
}
