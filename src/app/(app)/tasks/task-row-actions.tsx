"use client";

import { useOptimistic, useTransition, useState } from "react";
import { toast } from "sonner";
import { Check, Undo2, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleTask, deleteTask } from "./actions";

export function ToggleTaskButton({
  id,
  isDone,
}: {
  id: number;
  isDone: boolean;
}) {
  const [actualDone, setActualDone] = useState(isDone);
  // Optimistic state — flips immediately on click, snaps back on error
  const [optimisticDone, setOptimisticDone] = useOptimistic(
    actualDone,
    (_state, next: boolean) => next,
  );
  const [pending, startTransition] = useTransition();

  function handleClick() {
    const target = !optimisticDone;
    startTransition(async () => {
      setOptimisticDone(target);
      try {
        await toggleTask(id);
        setActualDone(target);
        toast.success(target ? "Đã hoàn thành" : "Đã mở lại");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Lỗi");
        // useOptimistic auto-reverts on action error inside transition
      }
    });
  }

  return (
    <Button
      variant={optimisticDone ? "ghost" : "outline"}
      size="sm"
      disabled={pending}
      onClick={handleClick}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : optimisticDone ? (
        <Undo2 className="size-4" />
      ) : (
        <Check className="size-4 text-emerald-600" />
      )}
      {optimisticDone ? "Mở lại" : "Xong"}
    </Button>
  );
}

export function DeleteTaskButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={pending}
      onClick={() => {
        if (!confirm("Xoá task này?")) return;
        startTransition(async () => {
          try {
            await deleteTask(id);
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
