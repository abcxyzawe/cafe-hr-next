import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NotificationPrefs } from "./notification-prefs";

export const dynamic = "force-dynamic";

export default async function NotificationsSettingsPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="size-5" />
            Tinh chỉnh thông báo
          </CardTitle>
          <CardDescription>
            Chọn loại sự kiện bạn muốn nhận hoặc tắt. Cài đặt được lưu trong
            trình duyệt này.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationPrefs />
        </CardContent>
      </Card>
    </div>
  );
}
