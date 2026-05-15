"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { refreshStandupAction } from "./refresh-action";

export function StandupRefreshButton() {
  const [pending, startTransition] = useTransition();

  function refresh(): void {
    startTransition(async () => {
      const res = await refreshStandupAction();
      if (res.ok) {
        toast.success("Đã tạo briefing mới");
      } else {
        toast.error(res.error || "Không tạo được briefing");
      }
    });
  }

  return (
    <Button
      type="button"
      variant="default"
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
      {pending ? "Đang tạo..." : "Làm mới briefing"}
    </Button>
  );
}
