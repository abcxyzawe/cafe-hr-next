"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Home, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[app/error] Caught runtime error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/illustrations/error-500.png"
            alt="Đã có lỗi xảy ra"
            width={200}
            height={200}
            className="h-[200px] w-[200px] rounded-2xl object-contain"
          />
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Lỗi hệ thống
          </div>
          <CardTitle className="text-2xl">Đã có lỗi xảy ra</CardTitle>
          <CardDescription className="max-w-sm">
            Đừng lo, bạn có thể thử lại hoặc về trang chủ.
          </CardDescription>
          {error.digest ? (
            <p className="font-mono text-xs text-muted-foreground/80">
              Mã lỗi: {error.digest}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <Button onClick={() => reset()}>
              <RefreshCcw className="size-4" />
              Thử lại
            </Button>
            <Button asChild variant="outline">
              <Link href="/">
                <Home className="size-4" />
                Về trang chủ
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
