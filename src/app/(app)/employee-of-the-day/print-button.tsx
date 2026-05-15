"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintEotdButton() {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={() => window.print()}
    >
      <Printer className="size-4" />
      In thiệp
    </Button>
  );
}
