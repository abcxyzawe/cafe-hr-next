"use client";

import { useTransition } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { requestCover } from "@/app/(app)/shifts/cover-actions";

export function CoverRequestButton({ shiftId }: { shiftId: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await requestCover(shiftId);
          if (res.ok) {
            toast.success("Đã đăng tin tìm người thay");
          } else {
            toast.error(res.error);
          }
        })
      }
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <UserPlus className="size-4" />
      )}
      <span>Tìm người thay</span>
    </Button>
  );
}
