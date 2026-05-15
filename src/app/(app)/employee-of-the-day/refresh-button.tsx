"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { refreshEotdAction } from "./refresh-action";

type Props = {
  hasResult: boolean;
};

export function RefreshEotdButton({ hasResult }: Props) {
  const [pending, startTransition] = useTransition();

  function onRefresh() {
    startTransition(async () => {
      const res = await refreshEotdAction();
      if (!res.ok) {
        toast.error(res.error || "Không chọn được nhân viên của ngày");
        return;
      }
      toast.success("Đã chọn nhân viên của ngày!");
    });
  }

  return (
    <Button
      type="button"
      variant={hasResult ? "outline" : "default"}
      size="sm"
      onClick={onRefresh}
      disabled={pending}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : hasResult ? (
        <RefreshCw className="size-4" />
      ) : (
        <Sparkles className="size-4" />
      )}
      {hasResult ? "Làm mới" : "Chọn nhân viên của ngày"}
    </Button>
  );
}
