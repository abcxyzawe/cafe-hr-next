"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Loader2, ListChecks } from "lucide-react";
import { createTask, type TaskFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const initial: TaskFormState = { ok: false };

export function TaskForm({
  employees,
}: {
  employees: { id: number; name: string }[];
}) {
  const [state, action, pending] = useActionState(createTask, initial);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success("Đã giao việc");
      ref.current?.reset();
    } else if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <div className="space-y-1 lg:col-span-2">
        <Label htmlFor="title">Tiêu đề *</Label>
        <Input
          id="title"
          name="title"
          required
          maxLength={200}
          placeholder="Vệ sinh máy pha espresso"
        />
        {state.fieldErrors?.title && (
          <p className="text-xs text-destructive">{state.fieldErrors.title[0]}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="assigneeId">Giao cho *</Label>
        <Select id="assigneeId" name="assigneeId" required>
          <option value="">— Chọn —</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="priority">Mức độ</Label>
        <Select id="priority" name="priority" defaultValue="normal">
          <option value="low">Thấp</option>
          <option value="normal">Bình thường</option>
          <option value="high">Cao</option>
          <option value="urgent">Khẩn</option>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="dueDate">Hạn</Label>
        <Input id="dueDate" type="date" name="dueDate" />
      </div>
      <div className="flex items-end">
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ListChecks className="size-4" />
          )}
          Giao việc
        </Button>
      </div>
      <div className="space-y-1 sm:col-span-2 lg:col-span-6">
        <Label htmlFor="description">Mô tả thêm</Label>
        <Input
          id="description"
          name="description"
          maxLength={2000}
          placeholder="Chi tiết, hướng dẫn..."
        />
      </div>
      <div className="space-y-1 sm:col-span-2 lg:col-span-6">
        <Label htmlFor="tags">Tags</Label>
        <Input
          id="tags"
          name="tags"
          maxLength={400}
          placeholder="vệ sinh, mở cửa, ưu tiên"
        />
        <p className="text-xs text-muted-foreground">
          Cách nhau bằng dấu phẩy. VD: vệ sinh, mở cửa, ưu tiên
        </p>
      </div>
    </form>
  );
}
