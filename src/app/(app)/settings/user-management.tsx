"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, UserPlus, Trash2, ShieldCheck, User } from "lucide-react";
import { createUser, deleteUser, type CreateUserState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const initial: CreateUserState = { ok: false };

type UserRow = {
  id: number;
  email: string;
  name: string;
  role: "admin" | "staff";
  createdAt: Date;
  lastLoginAt: Date | null;
};

export function UserManagement({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: number;
}) {
  const [state, action, pending] = useActionState(createUser, initial);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success("Đã tạo tài khoản");
      ref.current?.reset();
    } else if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <div className="space-y-4">
      <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1">
          <Label htmlFor="u-name">Họ tên</Label>
          <Input id="u-name" name="name" required placeholder="Nguyễn Văn A" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="u-email">Email</Label>
          <Input id="u-email" name="email" type="email" required placeholder="user@cafe.vn" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="u-pass">Mật khẩu</Label>
          <Input id="u-pass" name="password" type="password" required minLength={6} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="u-role">Quyền</Label>
          <Select id="u-role" name="role" defaultValue="staff">
            <option value="staff">Nhân viên</option>
            <option value="admin">Quản trị</option>
          </Select>
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
            Tạo
          </Button>
        </div>
      </form>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tài khoản</TableHead>
              <TableHead>Quyền</TableHead>
              <TableHead className="hidden md:table-cell">Tạo lúc</TableHead>
              <TableHead className="hidden md:table-cell">Đăng nhập gần nhất</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </TableCell>
                <TableCell>
                  <Badge variant={u.role === "admin" ? "success" : "secondary"} className="gap-1">
                    {u.role === "admin" ? <ShieldCheck className="size-3" /> : <User className="size-3" />}
                    {u.role === "admin" ? "Quản trị" : "Nhân viên"}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {formatDate(u.createdAt)}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {u.lastLoginAt ? formatDate(u.lastLoginAt) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <DeleteUserButton id={u.id} name={u.name} disabled={u.id === currentUserId} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function DeleteUserButton({
  id,
  name,
  disabled,
}: {
  id: number;
  name: string;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={disabled || pending}
      title={disabled ? "Không thể tự xoá" : "Xoá tài khoản"}
      onClick={() => {
        if (!confirm(`Xoá tài khoản "${name}"?`)) return;
        startTransition(async () => {
          try {
            await deleteUser(id);
            toast.success("Đã xoá");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Lỗi");
          }
        });
      }}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4 text-destructive" />}
    </Button>
  );
}
