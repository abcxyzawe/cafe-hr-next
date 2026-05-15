"use client";

import * as React from "react";
import {
  DateRangePicker,
  type DateRangeValue,
} from "@/components/ui/date-range-picker";
import { Label } from "@/components/ui/label";

export interface AuditDateRangeProps {
  initialFrom: string | null;
  initialTo: string | null;
}

export function AuditDateRange({
  initialFrom,
  initialTo,
}: AuditDateRangeProps): React.JSX.Element {
  const [range, setRange] = React.useState<{
    from: string | null;
    to: string | null;
  }>({ from: initialFrom, to: initialTo });

  const handleChange = (next: DateRangeValue): void => {
    setRange({ from: next.from, to: next.to });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">Khoảng ngày</Label>
      <DateRangePicker
        from={range.from}
        to={range.to}
        onChange={handleChange}
        compact
      />
      <input type="hidden" name="from" value={range.from ?? ""} />
      <input type="hidden" name="to" value={range.to ?? ""} />
    </div>
  );
}

export default AuditDateRange;
