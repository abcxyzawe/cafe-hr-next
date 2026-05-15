import { redirect } from "next/navigation";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { RevenueDashboard } from "./revenue-dashboard";

export const dynamic = "force-dynamic";

export default async function RevenuePage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Doanh thu hằng ngày</CardTitle>
          <CardDescription>
            Nhập tay theo ngày — lưu trên thiết bị này.
          </CardDescription>
        </CardHeader>
      </Card>
      <RevenueDashboard />
    </div>
  );
}
