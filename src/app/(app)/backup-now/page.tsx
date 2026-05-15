import { redirect } from "next/navigation";
import { DatabaseBackup } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BackupBoard } from "./backup-board";

export const dynamic = "force-dynamic";

export default async function BackupNowPage() {
  const sess = await getSession();
  if (sess?.role !== "admin") redirect("/");

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <DatabaseBackup className="size-5" />
            </div>
            <div>
              <CardTitle className="text-2xl">
                Sao lưu localStorage toàn cục
              </CardTitle>
              <CardDescription>
                Xuất / nhập / xoá toàn bộ key bắt đầu bằng{" "}
                <code className="font-mono">cafe-hr-</code> hoặc{" "}
                <code className="font-mono">cafe-hr:</code>. Trang chỉ dành cho
                admin — thao tác chỉ ảnh hưởng tới trình duyệt hiện tại.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <BackupBoard />
    </div>
  );
}
