"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="size-5" />
          Đã xảy ra lỗi
        </CardTitle>
        <CardDescription className="text-destructive/80">
          {error.message?.slice(0, 300) || "Lỗi không xác định"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={reset} variant="outline">
          <RotateCcw className="size-4" />
          Thử lại
        </Button>
        {error.digest && (
          <p className="mt-3 text-xs text-muted-foreground">
            Mã lỗi: <code className="font-mono">{error.digest}</code>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
