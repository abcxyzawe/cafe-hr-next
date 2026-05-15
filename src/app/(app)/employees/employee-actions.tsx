"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteEmployee, generateAvatarForEmployee } from "./actions";

export function GenerateAvatarButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          try {
            await generateAvatarForEmployee(id);
            toast.success("Đã tạo avatar mới");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Không tạo được avatar");
          }
        });
      }}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
      <span className="hidden sm:inline">Sinh avatar</span>
    </Button>
  );
}

export function DeleteEmployeeButton({ id, name }: { id: number; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Xoá nhân viên "${name}"?`)) return;
        startTransition(async () => {
          try {
            await deleteEmployee(id);
            toast.success("Đã xoá nhân viên");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Không xoá được");
          }
        });
      }}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4 text-destructive" />}
    </Button>
  );
}
