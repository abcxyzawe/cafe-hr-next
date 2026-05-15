"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, UserPlus } from "lucide-react";
import { createEmployee, type EmployeeFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const initial: EmployeeFormState = { ok: false };

export function EmployeeForm() {
  const [state, formAction, pending] = useActionState(createEmployee, initial);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success("Đã thêm nhân viên");
      ref.current?.reset();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form
      ref={ref}
      action={formAction}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7"
    >
      <div className="space-y-1 lg:col-span-2">
        <Label htmlFor="name">Họ tên *</Label>
        <Input id="name" name="name" required placeholder="Nguyễn Văn A" />
        {state.fieldErrors?.name && (
          <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="role">Vai trò *</Label>
        <Select id="role" name="role" required defaultValue="barista">
          <option value="barista">Pha chế</option>
          <option value="server">Phục vụ</option>
          <option value="cashier">Thu ngân</option>
          <option value="manager">Quản lý</option>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="phone">SĐT</Label>
        <Input id="phone" name="phone" placeholder="090..." />
      </div>
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="a@cafe.vn" />
        {state.fieldErrors?.email && (
          <p className="text-xs text-destructive">{state.fieldErrors.email[0]}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="hourlyRate">Lương / giờ (đ)</Label>
        <Input
          id="hourlyRate"
          name="hourlyRate"
          type="number"
          min={0}
          step={1000}
          defaultValue={30000}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="dateOfBirth">Ngày sinh</Label>
        <Input id="dateOfBirth" name="dateOfBirth" type="date" />
      </div>
      <div className="sm:col-span-2 lg:col-span-7 flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <input
            type="checkbox"
            name="autoAvatar"
            className="size-4 rounded border-input accent-primary"
          />
          <Sparkles className="size-4 text-primary" />
          Tạo avatar tự động sau khi thêm
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
          Thêm nhân viên
        </Button>
      </div>
    </form>
  );
}
