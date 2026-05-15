import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const rows = [
    ["name", "role", "phone", "email", "hourly_rate"],
    ["Nguyễn Văn Mẫu", "barista", "0901234567", "mau@cafe.vn", "35000"],
    ["Trần Thị B", "server", "0902345678", "b@cafe.vn", "28000"],
    ["", "cashier", "", "", "30000"],
  ];
  const body = "\ufeff" + rows.map((r) => r.join(",")).join("\r\n");
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="cafe-hr-employees-template.csv"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
