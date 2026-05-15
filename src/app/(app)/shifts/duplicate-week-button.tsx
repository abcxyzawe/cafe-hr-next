"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { duplicateWeekShifts } from "./actions";

export function DuplicateWeekButton({ weekStart }: { weekStart: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Copy tất cả ca của tuần này sang tuần sau?")) return;
        startTransition(async () => {
          const res = await duplicateWeekShifts(weekStart);
          if (res.ok) {
            toast.success(`Đã copy ${res.copied} ca sang tuần sau`);
          } else {
            toast.error(res.error || "Không copy được");
          }
        });
      }}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}
      Copy sang tuần sau
    </Button>
  );
}
