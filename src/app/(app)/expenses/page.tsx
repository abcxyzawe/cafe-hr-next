import { redirect } from "next/navigation";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { ExpensesDashboard } from "./expenses-dashboard";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Chi phí hằng ngày</CardTitle>
          <CardDescription>
            Theo dõi nguyên liệu, tiện ích, lương ngoài app, marketing và các
            khoản khác — lưu trên thiết bị này.
          </CardDescription>
        </CardHeader>
      </Card>
      <ExpensesDashboard />
    </div>
  );
}
