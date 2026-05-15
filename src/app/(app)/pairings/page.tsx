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
import { PairingsForm } from "./pairings-form";

export const dynamic = "force-dynamic";

export default async function PairingsPage() {
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
              <UtensilsCrossed className="size-5" />
            </span>
            Gợi ý món kèm theo đồ uống
          </CardTitle>
          <CardDescription>
            Nhập tên đồ uống và chọn tâm trạng khách, AI sẽ gợi ý 3 món
            ăn / bánh / snack đi kèm phù hợp, kèm lý do và mức giá ước tính.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PairingsForm />
        </CardContent>
      </Card>
    </div>
  );
}
