"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Loader2, KeyRound } from "lucide-react";
import { changePassword, type PasswordState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: PasswordState = { ok: false };

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, initial);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) {
      toast.success("Đã đổi mật khẩu");
      ref.current?.reset();
    } else if (state.error) toast.error(state.error);
  }, [state]);
  return (
    <form ref={ref} action={action} className="grid max-w-md gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
        <Input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="newPassword">Mật khẩu mới</Label>
        <Input id="newPassword" name="newPassword" type="password" required minLength={6} autoComplete="new-password" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Xác nhận mật khẩu mới</Label>
        <Input id="confirm" name="confirm" type="password" required minLength={6} autoComplete="new-password" />
      </div>
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
        Cập nhật mật khẩu
      </Button>
    </form>
  );
}
