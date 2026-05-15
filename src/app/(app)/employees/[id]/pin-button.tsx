"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, KeyRound, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { setEmployeePin } from "@/app/kiosk/actions";

export function PinButton({
  employeeId,
  hasPin,
}: {
  employeeId: number;
  hasPin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!/^\d{4,8}$/.test(pin)) {
      toast.error("PIN phải là 4-8 chữ số");
      return;
    }
    startTransition(async () => {
      const res = await setEmployeePin(employeeId, pin);
      if (res.ok) {
        toast.success("Đã cập nhật PIN");
        setOpen(false);
        setPin("");
      } else {
        toast.error(res.error || "Có lỗi");
      }
    });
  }

  function clearPin() {
    if (!confirm("Xoá PIN của nhân viên này?")) return;
    startTransition(async () => {
      const res = await setEmployeePin(employeeId, null);
      if (res.ok) {
        toast.success("Đã xoá PIN");
        setOpen(false);
      } else {
        toast.error(res.error || "Có lỗi");
      }
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        title={hasPin ? "Đổi PIN" : "Cấp PIN"}
      >
        <KeyRound className="size-4" />
        <span className="hidden sm:inline">{hasPin ? "Đổi PIN" : "Cấp PIN"}</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle>PIN chấm công Kiosk</DialogTitle>
            <DialogDescription>
              Nhân viên dùng PIN để check-in / check-out tại{" "}
              <code>/kiosk</code> mà không cần tài khoản đăng nhập.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pin">PIN mới (4-8 chữ số)</Label>
              <Input
                id="pin"
                autoFocus
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                minLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
              />
              <p className="text-xs text-muted-foreground">
                PIN sẽ được hash bcrypt trước khi lưu. Không thể xem lại sau này.
              </p>
            </div>
            <div className="flex justify-between">
              {hasPin ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={clearPin}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                  Xoá PIN
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Huỷ
                </Button>
                <Button onClick={submit} disabled={pending}>
                  {pending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <KeyRound className="size-4" />
                  )}
                  Lưu PIN
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
