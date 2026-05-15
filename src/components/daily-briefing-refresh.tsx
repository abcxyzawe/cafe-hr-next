"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { refreshBriefingAction } from "@/app/(app)/briefing-action";

export function DailyBriefingRefresh() {
  const [pending, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      const res = await refreshBriefingAction();
      if (res.ok) {
        toast.success("Đã cập nhật tóm tắt hôm nay");
      } else {
        toast.error(res.error || "Không tạo được tóm tắt");
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={refresh}
      className="gap-1.5"
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <RefreshCw className="size-3.5" />
      )}
      Làm mới
    </Button>
  );
}
