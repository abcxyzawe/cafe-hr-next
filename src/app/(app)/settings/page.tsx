import Link from "next/link";
import { KeyRound, ShieldCheck, UserCog, ScrollText, Download, FileSpreadsheet, MessageSquareHeart, Palette, Quote, QrCode, Megaphone } from "lucide-react";
import { AiAnnouncementComposerDialog } from "@/components/ai-announcement-composer-dialog";
import { HealthStatusCard } from "@/components/health-status-card";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { recentActivities } from "@/lib/activity";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PasswordForm } from "./password-form";
import { UserManagement } from "./user-management";
import { ActivityFeed } from "@/components/activity-feed";
import { AdminToolsCard } from "./admin-tools";
import { RetentionButton } from "./retention-button";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const me = await getCurrentUser();
  if (!me) return null;
  const isAdmin = me.role === "admin";

  const [users, activities] = await Promise.all([
    isAdmin
      ? prisma.user.findMany({
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
            lastLoginAt: true,
          },
        })
      : Promise.resolve([]),
    isAdmin ? recentActivities(20) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="size-5" />
            Hồ sơ
          </CardTitle>
          <CardDescription>Thông tin tài khoản đang đăng nhập</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <Info label="Họ tên" value={me.name} />
          <Info label="Email" value={me.email} />
          <Info
            label="Quyền"
            valueNode={
              <Badge
                variant={me.role === "admin" ? "success" : "secondary"}
                className="gap-1"
              >
                <ShieldCheck className="size-3" />
                {me.role === "admin" ? "Quản trị viên" : "Nhân viên"}
              </Badge>
            }
          />
          <Info
            label="Đăng nhập gần nhất"
            value={me.lastLoginAt ? formatDateTime(me.lastLoginAt) : "—"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-5" />
            Đổi mật khẩu
          </CardTitle>
          <CardDescription>
            Khuyến khích đổi mật khẩu mặc định ngay sau lần đăng nhập đầu tiên
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>

      {isAdmin && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-5" />
                Quản lý tài khoản
              </CardTitle>
              <CardDescription>
                Tạo và xoá tài khoản truy cập hệ thống (chỉ admin)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserManagement users={users} currentUserId={me.id} />
            </CardContent>
          </Card>

          <AdminToolsCard />

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="size-5" />
                  Công cụ quản lý
                </CardTitle>
                <CardDescription>
                  Soạn thông báo nội bộ với trợ giúp của AI — chọn tông giọng, AI viết
                  bản nháp, bạn rà lại rồi đăng cho toàn bộ nhân viên
                </CardDescription>
                <Link
                  href="/announcements"
                  className="mt-1 inline-flex w-fit items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  <Megaphone className="size-3.5" />
                  Xem lịch sử thông báo
                </Link>
              </div>
              <AiAnnouncementComposerDialog isAdmin={isAdmin} />
            </CardHeader>
          </Card>

          <HealthStatusCard />

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="size-5" />
                  Sao lưu dữ liệu
                </CardTitle>
                <CardDescription>
                  Tải toàn bộ dữ liệu hệ thống về file Excel (.xlsx) gồm nhiều sheet —
                  nhân viên, ca làm, chấm công (365 ngày gần nhất), đơn nghỉ, lương,
                  công việc và hoạt động (90 ngày gần nhất). Phù hợp để backup định kỳ.
                </CardDescription>
              </div>
              <Button asChild variant="default">
                <Link href="/api/backup" prefetch={false}>
                  <Download className="size-4" />
                  Tải XLSX
                </Link>
              </Button>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquareHeart className="size-5" />
                  Phản hồi người dùng
                </CardTitle>
                <CardDescription>
                  Xem các góp ý, báo lỗi, lời khen từ nhân viên
                </CardDescription>
              </div>
              <Button asChild variant="default">
                <Link href="/settings/feedback">
                  <MessageSquareHeart className="size-4" />
                  Xem phản hồi
                </Link>
              </Button>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="size-5" />
                  Giao diện & cá nhân hoá
                </CardTitle>
                <CardDescription>
                  Chế độ sáng/tối, bảng màu, mật độ giao diện, widget dashboard
                </CardDescription>
              </div>
              <Button asChild variant="default">
                <Link href="/settings/appearance">
                  <Palette className="size-4" />
                  Mở
                </Link>
              </Button>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Quote className="size-5" />
                  Câu nói mỗi ngày
                </CardTitle>
                <CardDescription>
                  Lưu trữ tất cả câu nói động lực đã được sinh tự động
                </CardDescription>
              </div>
              <Button asChild variant="default">
                <Link href="/quotes">
                  <Quote className="size-4" />
                  Mở
                </Link>
              </Button>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="size-5" />
                  Mở Kiosk bằng QR
                </CardTitle>
                <CardDescription>
                  In QR cho nhân viên quét bằng điện thoại để mở Kiosk nhanh
                </CardDescription>
              </div>
              <Button asChild variant="default">
                <Link href="/kiosk-qr">
                  <QrCode className="size-4" />
                  Mở
                </Link>
              </Button>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ScrollText className="size-5" />
                  Audit log
                </CardTitle>
                <CardDescription>
                  20 hoạt động gần nhất + công cụ retention
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <RetentionButton />
                <a
                  href="/api/activity/export"
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
                >
                  Xuất CSV
                </a>
              </div>
            </CardHeader>
            <CardContent>
              <ActivityFeed items={activities} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Info({
  label,
  value,
  valueNode,
}: {
  label: string;
  value?: string;
  valueNode?: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm">{valueNode ?? value}</div>
    </div>
  );
}
