"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  const handlePrint = () => {
    if (typeof window === "undefined") return;
    window.print();
  };

  return (
    <Button
      type="button"
      size="sm"
      onClick={handlePrint}
      className="print:hidden"
    >
      <Printer className="size-4" />
      In trang này
    </Button>
  );
}
