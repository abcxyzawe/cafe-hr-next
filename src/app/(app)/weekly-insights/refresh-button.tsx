"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { refreshWeeklyInsightsAction } from "./refresh-action";

type Props = {
  hasInsights: boolean;
};

export function RefreshInsightsButton({ hasInsights }: Props) {
  const [pending, startTransition] = useTransition();

  function onRefresh() {
    startTransition(async () => {
      const res = await refreshWeeklyInsightsAction();
      if (!res.ok) {
        toast.error(res.error || "Không tạo được tóm tắt tuần");
        return;
      }
      toast.success("Đã tạo tóm tắt tuần mới");
    });
  }

  return (
    <Button
      type="button"
      variant={hasInsights ? "outline" : "default"}
      size="sm"
      onClick={onRefresh}
      disabled={pending}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : hasInsights ? (
        <RefreshCw className="size-4" />
      ) : (
        <Sparkles className="size-4" />
      )}
      {hasInsights ? "Làm mới" : "Tạo tóm tắt tuần"}
    </Button>
  );
}
