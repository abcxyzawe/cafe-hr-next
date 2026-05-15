import { redirect } from "next/navigation";
import { Calculator } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TipCalculator } from "./tip-calculator";
import { CurrencyConverter } from "./currency-converter";

export const dynamic = "force-dynamic";

export default async function TipToolsPage() {
  const sess = await getSession();
  if (!sess) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl md:text-3xl">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Calculator className="size-5" />
            </span>
            Tiện ích tip & đổi tiền
          </CardTitle>
          <CardDescription>
            Bộ công cụ nhanh dành cho thu ngân: tính tiền tip, chia bill theo
            đầu người, và quy đổi nhanh giữa VND và các ngoại tệ phổ biến cho
            khách quốc tế.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <TipCalculator />
        <CurrencyConverter />
      </div>
    </div>
  );
}
