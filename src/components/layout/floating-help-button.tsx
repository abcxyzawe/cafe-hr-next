"use client";

import { HelpCircle } from "lucide-react";

export function FloatingHelpButton() {
  function open() {
    if (typeof document === "undefined") return;
    document.dispatchEvent(new Event("open-shortcuts"));
  }

  return (
    <button
      type="button"
      onClick={open}
      title="Phím tắt (?)"
      aria-label="Mở bảng phím tắt"
      className="fixed bottom-4 left-4 z-40 hidden size-10 items-center justify-center rounded-full border bg-card/90 text-muted-foreground shadow-lg backdrop-blur transition-all hover:scale-105 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:flex print:hidden"
    >
      <HelpCircle className="size-4" />
    </button>
  );
}
