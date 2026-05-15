"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyFilenameProps {
  value: string;
  className?: string;
}

/**
 * Small inline button that copies its `value` to the clipboard.
 * Visually shows a fleeting check-mark for ~1.5s after a successful copy.
 */
export function CopyFilename({ value, className }: CopyFilenameProps) {
  const [copied, setCopied] = React.useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard might be unavailable (insecure context); fail silently.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Sao chép ${value}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 font-mono text-xs text-foreground/90 transition-colors hover:bg-accent hover:text-accent-foreground",
        className,
      )}
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      <span className="truncate">{value}</span>
    </button>
  );
}
