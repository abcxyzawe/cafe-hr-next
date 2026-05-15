"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

export function CopyUrlButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Đã sao chép URL Kiosk");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Không thể sao chép — hãy bấm và chọn URL thủ công");
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-transparent px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
    >
      {copied ? (
        <>
          <Check className="size-4" />
          Đã chép
        </>
      ) : (
        <>
          <Copy className="size-4" />
          Sao chép URL
        </>
      )}
    </button>
  );
}
