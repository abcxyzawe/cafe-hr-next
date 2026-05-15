"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, CalendarPlus, CalendarHeart } from "lucide-react";
import { createShift, type ShiftFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { getHolidayByIso } from "@/lib/holidays";

const initial: ShiftFormState = { ok: false };

export function ShiftForm({
  employees,
  defaultDate,
}: {
  employees: { id: number; name: string; role: string }[];
  defaultDate: string;
}) {
  const [state, action, pending] = useActionState(createShift, initial);
  const ref = useRef<HTMLFormElement>(null);
  const [pickedDate, setPickedDate] = useState(defaultDate);

  const dateHoliday = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(pickedDate)) return null;
    return getHolidayByIso(pickedDate);
  }, [pickedDate]);

  useEffect(() => {
    if (state.ok) {
      if (state.warning) {
        toast.warning(`Đã thêm ca, nhưng: ${state.warning}`, {
          duration: 6000,
        });
      } else {
        toast.success("Đã thêm ca làm");
      }
      ref.current?.reset();
    } else if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form
      ref={ref}
      action={action}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
    >
      <div className="space-y-1">
        <Label htmlFor="employeeId">Nhân viên</Label>
        <Select id="employeeId" name="employeeId" required>
          <option value="">— Chọn —</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="shiftDate">Ngày</Label>
        <Input
          id="shiftDate"
          type="date"
          name="shiftDate"
          required
          value={pickedDate}
          onChange={(e) => setPickedDate(e.target.value)}
        />
        {dateHoliday && (
          <p className="flex items-start gap-1.5 rounded-md border border-rose-300/40 bg-rose-50/40 px-2 py-1 text-[11px] leading-tight text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
            <CalendarHeart className="mt-0.5 size-3 shrink-0" />
            <span>
              Ngày này là <strong className="font-semibold">{dateHoliday.name}</strong>{" "}
              — vẫn xếp ca?
            </span>
          </p>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="shiftType">Loại ca</Label>
        <Select id="shiftType" name="shiftType" defaultValue="morning">
          <option value="morning">Sáng (07–12)</option>
          <option value="afternoon">Chiều (12–17)</option>
          <option value="evening">Tối (17–22)</option>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="startTime">Giờ bắt đầu</Label>
        <Input id="startTime" type="time" name="startTime" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="endTime">Giờ kết thúc</Label>
        <Input id="endTime" type="time" name="endTime" />
      </div>
      <div className="sm:col-span-2 lg:col-span-5 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <CalendarPlus className="size-4" />}
          Thêm ca
        </Button>
      </div>
    </form>
  );
}
