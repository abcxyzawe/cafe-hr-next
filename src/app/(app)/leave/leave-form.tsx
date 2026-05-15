"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Loader2, CalendarPlus } from "lucide-react";
import { createLeaveRequest, type LeaveFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const initial: LeaveFormState = { ok: false };

export function LeaveForm({
  employees,
}: {
  employees: { id: number; name: string }[];
}) {
  const [state, action, pending] = useActionState(createLeaveRequest, initial);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success("Đã tạo đơn nghỉ");
      ref.current?.reset();
    } else if (state.error) toast.error(state.error);
  }, [state]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div className="space-y-1 lg:col-span-2">
        <Label htmlFor="employeeId">Nhân viên *</Label>
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
        <Label htmlFor="type">Loại nghỉ *</Label>
        <Select id="type" name="type" required defaultValue="annual">
          <option value="annual">Nghỉ phép</option>
          <option value="sick">Nghỉ ốm</option>
          <option value="personal">Cá nhân</option>
          <option value="unpaid">Không lương</option>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="startDate">Từ ngày *</Label>
        <Input id="startDate" type="date" name="startDate" required defaultValue={today} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="endDate">Đến ngày *</Label>
        <Input id="endDate" type="date" name="endDate" required defaultValue={today} />
        {state.fieldErrors?.endDate && (
          <p className="text-xs text-destructive">{state.fieldErrors.endDate[0]}</p>
        )}
      </div>
      <div className="space-y-1 sm:col-span-2 lg:col-span-5">
        <Label htmlFor="reason">Lý do</Label>
        <Input
          id="reason"
          name="reason"
          maxLength={500}
          placeholder="Ví dụ: về quê, ốm, việc gia đình..."
        />
      </div>
      <div className="sm:col-span-2 lg:col-span-5 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CalendarPlus className="size-4" />
          )}
          Tạo đơn
        </Button>
      </div>
    </form>
  );
}
