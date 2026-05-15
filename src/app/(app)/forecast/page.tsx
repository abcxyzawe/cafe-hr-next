import { redirect } from "next/navigation";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { ForecastDashboard } from "./forecast-dashboard";

export const dynamic = "force-dynamic";

export default async function ForecastPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Dự báo doanh thu 30 ngày</CardTitle>
          <CardDescription>
            Hồi quy tuyến tính trên dữ liệu doanh thu đã nhập — chỉ tham khảo.
          </CardDescription>
        </CardHeader>
      </Card>
      <ForecastDashboard />
    </div>
  );
}
