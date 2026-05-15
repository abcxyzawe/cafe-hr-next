import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SITEMAP_ENTRIES } from "@/lib/sitemap-catalogue";
import { LunarChip } from "@/components/lunar-chip";
import { SitemapGrid } from "./sitemap-grid";

export const metadata = {
  title: "Sơ đồ trang",
  description: "Danh sách toàn bộ trang trong hệ thống quản lý quán cafe.",
};

export default async function SitemapPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");

  const isAdmin = sess.role === "admin";
  const visible = SITEMAP_ENTRIES.filter((e) => isAdmin || !e.adminOnly);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Sơ đồ trang <LunarChip date={new Date()} className="ml-2 align-middle" /></h1>
        <p className="text-sm text-muted-foreground">
          Tổng hợp các trang chính trong hệ thống. Dùng ô tìm kiếm để lọc nhanh
          theo tên hoặc mô tả.
        </p>
      </header>
      <SitemapGrid entries={visible} isAdmin={isAdmin} />
    </div>
  );
}
