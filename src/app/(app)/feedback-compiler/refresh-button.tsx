"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { refreshFeedbackReportAction } from "./refresh-action";

type Props = {
  hasReport: boolean;
};

export function RefreshFeedbackReportButton({ hasReport }: Props) {
  const [pending, startTransition] = useTransition();

  function onRefresh(): void {
    startTransition(async () => {
      const res = await refreshFeedbackReportAction();
      if (!res.ok) {
        toast.error(res.error || "Không tổng hợp được phản hồi");
        return;
      }
      toast.success("Đã tạo bản tổng hợp phản hồi mới");
    });
  }

  return (
    <Button
      type="button"
      variant={hasReport ? "outline" : "default"}
      size="sm"
      onClick={onRefresh}
      disabled={pending}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : hasReport ? (
        <RefreshCw className="size-4" />
      ) : (
        <Sparkles className="size-4" />
      )}
      {hasReport ? "Làm mới" : "Tổng hợp với AI"}
    </Button>
  );
}
