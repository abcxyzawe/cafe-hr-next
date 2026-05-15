import { redirect } from "next/navigation";
import { Palette, Sliders, Sparkles, LayoutDashboard, Sun } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { getCurrentPalette } from "@/lib/palette-server";
import { getCurrentDensity } from "@/lib/density";
import { ThemePicker } from "@/components/theme-picker";
import { ThemeTiles } from "@/components/theme-tiles";
import { AccessibilityCard } from "@/components/accessibility-card";
import { DensityPicker } from "@/components/density-picker";
import { AppearanceClient } from "./appearance-client";

export const dynamic = "force-dynamic";

export default async function AppearancePage() {
  const sess = await getSession();
  if (!sess) redirect("/login");

  const palette = await getCurrentPalette();
  const density = await getCurrentDensity();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Giao diện & cá nhân hoá</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tuỳ chỉnh chế độ hiển thị, bảng màu, mật độ giao diện, và widget dashboard.
          Áp dụng riêng cho trình duyệt này.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="size-5 text-amber-500" />
            Chế độ sáng / tối
          </CardTitle>
          <CardDescription>
            Chuyển giữa Sáng, Tối, Theo hệ thống, hoặc Tự động theo giờ trong ngày
            (sáng 6h–18h). Bấm icon trên thanh trên cùng để đổi nhanh.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AppearanceClient />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="size-5 text-primary" />
            Bảng màu
          </CardTitle>
          <CardDescription>
            6 chủ đề: Cà phê (mặc định), Xanh biển, Hồng đào, Lavender, Xanh lá,
            Đỏ rượu. Lưu trong cookie 1 năm.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold tracking-tight">Chọn bảng màu</h2>
            <ThemeTiles currentPaletteId={palette.id} />
          </section>
          <section className="space-y-2 border-t pt-4">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Chọn nhanh
            </h2>
            <ThemePicker current={palette.id} />
          </section>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sliders className="size-5 text-primary" />
            Mật độ giao diện
          </CardTitle>
          <CardDescription>
            Thoải mái cho dùng phổ thông, Gọn cho power-users với nhiều dữ liệu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DensityPicker current={density} />
        </CardContent>
      </Card>

      <AccessibilityCard />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="size-5 text-primary" />
            Widget dashboard
          </CardTitle>
          <CardDescription>
            Bật / tắt từng widget hiển thị trên trang Tổng quan. Mở "Tuỳ chỉnh" trên
            dashboard để chỉnh nhanh.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Sparkles className="size-3.5 text-primary" />
              17 widget có thể bật / tắt theo nhóm Đầu trang / Vận hành / Phân tích /
              Feed.
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className="size-3.5 text-primary" />
              Lưu trong trình duyệt — không ảnh hưởng người khác.
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className="size-3.5 text-primary" />
              Vào trang chủ và bấm nút "Tuỳ chỉnh" góc phải để mở dialog.
            </li>
          </ul>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Tất cả thiết lập được lưu trong cookie / localStorage của trình duyệt này.
        Đăng nhập trên thiết bị khác sẽ áp dụng riêng cho thiết bị đó.
      </p>
    </div>
  );
}
