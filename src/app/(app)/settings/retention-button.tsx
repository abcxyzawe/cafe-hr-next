"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cleanupActivityLog } from "./actions";

export function RetentionButton() {
  const [pending, startTransition] = useTransition();
  const [days, setDays] = useState(90);
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={7}
        max={3650}
        value={days}
        onChange={(e) => setDays(Math.max(7, Number(e.target.value) || 90))}
        className="h-9 w-20 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm"
        title="Số ngày giữ lại"
      />
      <span className="text-sm text-muted-foreground">ngày</span>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (
            !confirm(
              `Xoá tất cả activity log cũ hơn ${days} ngày? Hành động này không thể hoàn tác.`,
            )
          )
            return;
          startTransition(async () => {
            try {
              const res = await cleanupActivityLog(days);
              toast.success(`Đã xoá ${res.deleted} entries cũ`);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Lỗi");
            }
          });
        }}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Eraser className="size-4" />
        )}
        Cleanup
      </Button>
    </div>
  );
}
