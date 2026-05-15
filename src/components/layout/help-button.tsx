"use client";

import { Keyboard } from "lucide-react";

export function HelpButton() {
  return (
    <button
      type="button"
      onClick={() => document.dispatchEvent(new Event("open-shortcuts"))}
      title="Phím tắt (?)"
      aria-label="Phím tắt"
      className="hidden h-9 w-9 items-center justify-center rounded-md border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:inline-flex"
    >
      <Keyboard className="size-4" />
    </button>
  );
}
