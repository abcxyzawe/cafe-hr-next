"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Check, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { approveLeave, rejectLeave, deleteLeave } from "./actions";

export function DecisionButtons({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        disabled={pending}
        title="Duyệt"
        onClick={() => {
          startTransition(async () => {
            try {
              await approveLeave(id);
              toast.success("Đã duyệt đơn");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Lỗi");
            }
          });
        }}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Check className="size-4 text-emerald-600" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        disabled={pending}
        title="Từ chối"
        onClick={() => {
          startTransition(async () => {
            try {
              await rejectLeave(id);
              toast.success("Đã từ chối đơn");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Lỗi");
            }
          });
        }}
      >
        <X className="size-4 text-destructive" />
      </Button>
    </div>
  );
}

export function DeleteLeaveButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={pending}
      title="Xoá"
      onClick={() => {
        if (!confirm("Xoá đơn nghỉ này?")) return;
        startTransition(async () => {
          try {
            await deleteLeave(id);
            toast.success("Đã xoá");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Lỗi");
          }
        });
      }}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Trash2 className="size-4 text-destructive" />
      )}
    </Button>
  );
}
