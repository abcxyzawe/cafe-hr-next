import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound, Link2, ShieldCheck, UserCog, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { DisplayNameForm, PasswordChangeForm } from "./profile-forms";
import { ProfileBioCard } from "./bio-card";

export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: sess.uid },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });
  if (!user) redirect("/login");

  const linkedEmployee = await prisma.employee.findFirst({
    where: { email: user.email },
    select: { id: true, name: true, avatarUrl: true },
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Hồ sơ cá nhân</h1>
        <p className="text-sm text-muted-foreground">
          Quản lý thông tin tài khoản và mật khẩu đăng nhập.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="size-5" />
            Thông tin tài khoản
          </CardTitle>
          <CardDescription>
            Email dùng để đăng nhập (không thay đổi được). Chỉ admin có thể đổi
            email tài khoản.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user.email} readOnly disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Quyền</Label>
              <div>
                <Badge
                  variant={user.role === "admin" ? "success" : "secondary"}
                  className="gap-1"
                >
                  <ShieldCheck className="size-3" />
                  {user.role === "admin" ? "Quản trị viên" : "Nhân viên"}
                </Badge>
              </div>
            </div>
          </div>

          <DisplayNameForm initialName={user.name} />
        </CardContent>
      </Card>

      <ProfileBioCard />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-5" />
            Mật khẩu
          </CardTitle>
          <CardDescription>
            Đổi mật khẩu định kỳ để bảo vệ tài khoản. Mật khẩu mới phải khác mật
            khẩu hiện tại và có ít nhất 8 ký tự.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordChangeForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="size-5" />
            Liên kết với hồ sơ nhân viên
          </CardTitle>
          <CardDescription>
            Hồ sơ nhân viên (Employee) khớp theo email. Avatar và thông tin nhân
            sự được quản lý trên hồ sơ nhân viên, không phải ở đây.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {linkedEmployee ? (
            <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/30 p-4">
              <Avatar
                src={linkedEmployee.avatarUrl}
                fallback={linkedEmployee.name}
                alt={linkedEmployee.name}
                size={56}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {linkedEmployee.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  Email khớp với tài khoản: {user.email}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Để đổi avatar, vui lòng cập nhật trên hồ sơ nhân viên đã liên kết.
                </p>
              </div>
              <Link
                href={`/employees/${linkedEmployee.id}`}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
              >
                <ExternalLink className="size-4" />
                Mở hồ sơ
              </Link>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm">
              <p className="font-medium">Chưa được liên kết</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Email{" "}
                <span className="font-mono">{user.email}</span>{" "}
                của tài khoản chưa khớp với hồ sơ nhân viên nào. Liên hệ quản trị
                viên nếu cần liên kết để đồng bộ avatar và thông tin.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
