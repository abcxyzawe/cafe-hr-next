import { redirect } from "next/navigation";
import { Music } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { PlaylistBoard } from "./playlist-board";

export const dynamic = "force-dynamic";

function formatHeaderDate(): string {
  const d = new Date();
  const weekday = [
    "Chủ Nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
  ][d.getDay()];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${weekday}, ${dd}/${mm}/${d.getFullYear()}`;
}

export default async function PlaylistPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");

  const headerDate = formatHeaderDate();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Music className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-2xl tracking-tight md:text-3xl">
                Bảng nhạc quán
              </CardTitle>
              <CardDescription className="mt-1 text-sm">
                Hôm nay {headerDate}. Dán link Spotify hoặc YouTube để cả ca
                cùng chọn nhạc cho không gian quán — đánh dấu một bản đang phát
                để mọi người biết loa đang chạy bài nào.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Lưu ý: danh sách phát chỉ <strong>lưu trên thiết bị này</strong>{" "}
            (localStorage của trình duyệt) — mỗi máy/quầy sẽ có playlist riêng,
            không đồng bộ qua máy chủ.
          </p>
        </CardContent>
      </Card>

      <PlaylistBoard />
    </div>
  );
}
