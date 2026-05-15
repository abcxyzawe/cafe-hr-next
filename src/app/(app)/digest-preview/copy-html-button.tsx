"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  targetId: string;
};

export function CopyHtmlButton({ targetId }: Props): React.ReactElement {
  const [copied, setCopied] = useState(false);

  async function handleCopy(): Promise<void> {
    if (typeof document === "undefined") return;
    const el = document.getElementById(targetId);
    if (!el) {
      toast.error("Không tìm thấy preview để copy");
      return;
    }
    const html = el.outerHTML;
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(html);
      } else {
        // Fallback for environments without async clipboard API.
        const ta = document.createElement("textarea");
        ta.value = html;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      toast.success("Đã copy HTML email vào clipboard");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Không copy được HTML");
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="default"
      onClick={() => {
        void handleCopy();
      }}
      className="gap-1.5"
    >
      {copied ? (
        <Check className="size-3.5" />
      ) : (
        <Copy className="size-3.5" />
      )}
      {copied ? "Đã copy" : "Copy HTML"}
    </Button>
  );
}
