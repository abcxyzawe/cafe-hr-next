"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateAvatarsForAllMissing } from "./actions";

export function BatchAvatarButton({ missingCount }: { missingCount: number }) {
  const [pending, startTransition] = useTransition();
  if (missingCount === 0) return null;
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            `Tạo avatar cho ${missingCount} nhân viên chưa có ảnh? (mất ~${Math.ceil(missingCount * 2)}s)`,
          )
        )
          return;
        startTransition(async () => {
          const t = toast.loading(`Đang tạo ${missingCount} avatar...`);
          try {
            const res = await generateAvatarsForAllMissing();
            toast.dismiss(t);
            if (res.failed > 0) {
              toast.warning(
                `Hoàn tất: ${res.succeeded}/${res.total} thành công, ${res.failed} lỗi`,
              );
            } else {
              toast.success(`Đã tạo ${res.succeeded} avatar`);
            }
          } catch (e) {
            toast.dismiss(t);
            toast.error(e instanceof Error ? e.message : "Lỗi");
          }
        });
      }}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Wand2 className="size-4" />
      )}
      Sinh avatar ({missingCount})
    </Button>
  );
}
