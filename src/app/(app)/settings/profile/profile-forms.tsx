"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Save, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateDisplayName, changePassword } from "./actions";

export function DisplayNameForm({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [pending, startTransition] = useTransition();

  const trimmed = name.trim();
  const dirty = trimmed !== initialName.trim();
  const invalid = trimmed.length < 2 || trimmed.length > 80;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!dirty || invalid) return;
    startTransition(async () => {
      const res = await updateDisplayName(trimmed);
      if (res.ok) {
        toast.success("Đã cập nhật tên hiển thị");
      } else {
        toast.error(res.error ?? "Không cập nhật được tên hiển thị");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-md gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="displayName">Tên hiển thị</Label>
        <Input
          id="displayName"
          name="displayName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          maxLength={80}
          required
          autoComplete="name"
          disabled={pending}
        />
        <p className="text-xs text-muted-foreground">
          Tên này hiển thị ở góc menu và trong nhật ký hoạt động.
        </p>
      </div>
      <Button
        type="submit"
        disabled={pending || !dirty || invalid}
        className="w-fit"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        Lưu thay đổi
      </Button>
    </form>
  );
}

export function PasswordChangeForm() {
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pending, startTransition] = useTransition();

  function reset() {
    setCurrentPwd("");
    setNewPwd("");
    setConfirmPwd("");
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!currentPwd) {
      toast.error("Nhập mật khẩu hiện tại");
      return;
    }
    if (newPwd.length < 8) {
      toast.error("Mật khẩu mới phải có ít nhất 8 ký tự");
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }
    startTransition(async () => {
      const res = await changePassword(currentPwd, newPwd);
      if (res.ok) {
        toast.success("Đã đổi mật khẩu");
        reset();
      } else {
        toast.error(res.error ?? "Không đổi được mật khẩu");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-md gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="currentPwd">Mật khẩu hiện tại</Label>
        <Input
          id="currentPwd"
          type="password"
          value={currentPwd}
          onChange={(e) => setCurrentPwd(e.target.value)}
          required
          autoComplete="current-password"
          disabled={pending}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="newPwd">Mật khẩu mới</Label>
        <Input
          id="newPwd"
          type="password"
          value={newPwd}
          onChange={(e) => setNewPwd(e.target.value)}
          minLength={8}
          required
          autoComplete="new-password"
          disabled={pending}
        />
        <p className="text-xs text-muted-foreground">
          Ít nhất 8 ký tự. Khuyến khích kết hợp chữ hoa, chữ thường, số.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirmPwd">Xác nhận mật khẩu mới</Label>
        <Input
          id="confirmPwd"
          type="password"
          value={confirmPwd}
          onChange={(e) => setConfirmPwd(e.target.value)}
          minLength={8}
          required
          autoComplete="new-password"
          disabled={pending}
          aria-invalid={confirmPwd.length > 0 && confirmPwd !== newPwd}
        />
        {confirmPwd.length > 0 && confirmPwd !== newPwd && (
          <p className="text-xs text-destructive">Mật khẩu xác nhận không khớp</p>
        )}
      </div>
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
        Đổi mật khẩu
      </Button>
    </form>
  );
}
