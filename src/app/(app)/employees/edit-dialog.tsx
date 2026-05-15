"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Save } from "lucide-react";
import { updateEmployee, type EmployeeFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const initial: EmployeeFormState = { ok: false };

interface Props {
  employee: {
    id: number;
    name: string;
    role: string;
    phone: string | null;
    email: string | null;
    hourlyRate: number | string;
    dateOfBirth: string | null;
  };
}

export function EditEmployeeButton({ employee }: Props) {
  const [open, setOpen] = useState(false);
  const action = updateEmployee.bind(null, employee.id);
  const [state, formAction, pending] = useActionState(action, initial);

  useEffect(() => {
    if (state.ok) {
      toast.success("Đã cập nhật nhân viên");
      setOpen(false);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Sửa"
      >
        <Pencil className="size-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle>Sửa thông tin</DialogTitle>
            <DialogDescription>
              Cập nhật chi tiết cho nhân viên <strong>{employee.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor={`edit-name-${employee.id}`}>Họ tên</Label>
              <Input
                id={`edit-name-${employee.id}`}
                name="name"
                required
                autoFocus
                defaultValue={employee.name}
              />
              {state.fieldErrors?.name && (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.name[0]}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor={`edit-role-${employee.id}`}>Vai trò</Label>
                <Select
                  id={`edit-role-${employee.id}`}
                  name="role"
                  defaultValue={employee.role}
                >
                  <option value="barista">Pha chế</option>
                  <option value="server">Phục vụ</option>
                  <option value="cashier">Thu ngân</option>
                  <option value="manager">Quản lý</option>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor={`edit-rate-${employee.id}`}>Lương / giờ</Label>
                <Input
                  id={`edit-rate-${employee.id}`}
                  name="hourlyRate"
                  type="number"
                  min={0}
                  step={1000}
                  defaultValue={String(employee.hourlyRate)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor={`edit-phone-${employee.id}`}>SĐT</Label>
                <Input
                  id={`edit-phone-${employee.id}`}
                  name="phone"
                  defaultValue={employee.phone ?? ""}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`edit-email-${employee.id}`}>Email</Label>
                <Input
                  id={`edit-email-${employee.id}`}
                  name="email"
                  type="email"
                  defaultValue={employee.email ?? ""}
                />
                {state.fieldErrors?.email && (
                  <p className="text-xs text-destructive">
                    {state.fieldErrors.email[0]}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`edit-dob-${employee.id}`}>Ngày sinh</Label>
              <Input
                id={`edit-dob-${employee.id}`}
                name="dateOfBirth"
                type="date"
                defaultValue={employee.dateOfBirth ?? ""}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Huỷ
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Lưu
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
