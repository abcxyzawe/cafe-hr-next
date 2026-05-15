import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users } from "lucide-react";
import { DemographicsBoard } from "./demographics-board";

export const dynamic = "force-dynamic";

export default async function DemographicsPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card className="bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Users className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-2xl tracking-tight md:text-3xl">
                Khách hàng hôm nay
              </CardTitle>
              <CardDescription className="mt-1 text-sm">
                Bấm nút để đếm khách theo độ tuổi và mục đích trong ca trực.
                Dữ liệu lưu cục bộ trên thiết bị này.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <DemographicsBoard />
    </div>
  );
}
