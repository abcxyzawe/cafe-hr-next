"use client";
import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteShift } from "./actions";

export function DeleteShiftButton({
  id,
  onDeleted,
}: {
  id: number;
  onDeleted?: (id: number) => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await deleteShift(id);
            onDeleted?.(id);
            toast.success("Đã xoá ca");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Không xoá được");
          }
        })
      }
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4 text-destructive" />}
    </Button>
  );
}
