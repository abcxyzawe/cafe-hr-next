"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { duplicateEmployee } from "../actions";

export function DuplicateButton({ id, name }: { id: number; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const res = await duplicateEmployee(id);
          if (res.ok && res.newId) {
            toast.success(`Đã tạo bản sao của ${name}`);
            router.push(`/employees/${res.newId}`);
          } else {
            toast.error(res.error || "Không tạo được bản sao");
          }
        });
      }}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Copy className="size-4" />
      )}
      Tạo bản sao
    </Button>
  );
}
