import { redirect } from "next/navigation";
import { Music } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlaylistDjForm } from "./playlist-dj-form";

export const dynamic = "force-dynamic";

export default async function PlaylistDjPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");

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
                AI Playlist DJ
              </CardTitle>
              <CardDescription className="mt-1 text-sm">
                Chọn khung giờ trong ngày và vibe mong muốn — AI sẽ gợi ý 6 bài
                nhạc thật phù hợp không gian quán cà phê. Mỗi gợi ý có nút sao
                chép tên bài và mở thẳng kết quả tìm kiếm trên YouTube.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PlaylistDjForm />
        </CardContent>
      </Card>
    </div>
  );
}
