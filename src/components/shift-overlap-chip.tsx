import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ShiftOverlap } from "@/lib/shift-overlap";

function formatDay(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

export function ShiftOverlapChip({ overlaps }: { overlaps: ShiftOverlap[] }) {
  if (overlaps.length === 0) return null;

  const title = overlaps
    .map((o) => `${formatDay(o.date)} — ${o.employeeName}`)
    .join("\n");

  return (
    <Badge
      variant="warning"
      className="inline-flex items-center gap-1"
      title={title}
    >
      <AlertTriangle className="size-3" aria-hidden="true" />
      {overlaps.length} xung đột
    </Badge>
  );
}
