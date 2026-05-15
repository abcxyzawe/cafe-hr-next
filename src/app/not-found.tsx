import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/illustrations/error-404.png"
            alt="Trang không tồn tại"
            width={200}
            height={200}
            className="h-[200px] w-[200px] rounded-2xl object-contain"
          />
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            404
          </div>
          <CardTitle className="text-2xl">Trang không tồn tại</CardTitle>
          <CardDescription className="max-w-sm">
            Có vẻ trang bạn tìm đã đi uống cà phê. Hãy thử quay lại trang chủ.
          </CardDescription>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <Button asChild>
              <Link href="/">
                <Home className="size-4" />
                Về trang chủ
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/me">
                <ArrowLeft className="size-4" />
                Quay lại
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
