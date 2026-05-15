"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { ImageUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadAvatarForEmployee } from "./actions";

export function UploadAvatarButton({ id }: { id: number }) {
  const ref = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("photo", file);
    startTransition(async () => {
      const res = await uploadAvatarForEmployee(id, fd);
      if (res.ok) toast.success("Đã upload ảnh");
      else toast.error(res.error || "Upload thất bại");
      if (ref.current) ref.current.value = "";
    });
  }

  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFile}
      />
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => ref.current?.click()}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ImageUp className="size-4" />
        )}
        <span className="hidden sm:inline">Upload</span>
      </Button>
    </>
  );
}
