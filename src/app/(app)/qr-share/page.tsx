import { redirect } from "next/navigation";
import { QrCode } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { QrShareForm } from "./qr-share-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Chia sẻ QR — Cafe HR",
};

export default async function QrSharePage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <QrCode className="size-6" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl">Chia sẻ QR</CardTitle>
              <CardDescription>
                Tạo mã QR cho liên kết, văn bản tự do, hoặc thông tin WiFi
                để khách và nhân viên quét nhanh.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <QrShareForm />
        </CardContent>
      </Card>
    </div>
  );
}
