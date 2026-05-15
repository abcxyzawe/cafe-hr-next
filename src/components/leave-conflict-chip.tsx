import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { LeaveConflict } from "@/lib/leave-conflicts";

function formatDay(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

export function LeaveConflictChip({
  conflicts,
  requestId,
}: {
  conflicts: LeaveConflict[];
  requestId: number;
}) {
  if (conflicts.length === 0) return null;

  // Build a tooltip: dates + the role that is overlapping.
  const role = conflicts[0]?.role ?? "";
  const dateList = conflicts.map((c) => formatDay(c.date)).join(", ");
  const title = `Trùng lịch nghỉ (vai trò: ${role}) — đơn #${requestId} — ngày: ${dateList}`;

  return (
    <Badge
      variant="warning"
      className="ml-1 inline-flex items-center gap-1"
      title={title}
    >
      <AlertTriangle className="size-3" aria-hidden="true" />
      {conflicts.length} ngày trùng
    </Badge>
  );
}
