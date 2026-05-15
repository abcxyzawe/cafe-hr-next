import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Coffee } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { TableTentBoard } from "./table-tent-board";

export const dynamic = "force-dynamic";

export default async function TableTentPrintPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");
  if (sess.role !== "admin") redirect("/");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-amber-100/60 via-orange-50 to-background no-print">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-700 text-white shadow-md">
              <Coffee className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-2xl tracking-tight md:text-3xl">
                In thẻ menu để bàn (table tent)
              </CardTitle>
              <CardDescription className="mt-1 text-sm">
                Mỗi tờ A4 in 2 thẻ menu (gấp đôi theo đường nét đứt) trưng bày
                tại bàn khách. Các món được đánh dấu nổi bật ở trang{" "}
                <Link
                  href="/menu"
                  className="font-medium text-amber-800 underline-offset-2 hover:underline"
                >
                  /menu
                </Link>{" "}
                sẽ xuất hiện trước.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Link
            href="/menu"
            prefetch={false}
            className="inline-flex h-8 items-center gap-1 rounded-md border bg-background px-3 font-medium hover:bg-accent"
          >
            <ArrowLeft className="size-3.5" />
            Quay lại menu
          </Link>
          <span>Khổ A4 dọc · 2 tent/trang · Ctrl/Cmd+P để in</span>
        </CardContent>
      </Card>

      <TableTentBoard />
    </div>
  );
}
