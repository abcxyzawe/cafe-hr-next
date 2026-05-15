import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  // 7-day shift template based on today
  const today = new Date();
  const next = (offset: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  };

  const rows = [
    ["employee_id", "date", "shift_type"],
    ["1", next(0), "morning"],
    ["2", next(0), "morning"],
    ["3", next(0), "afternoon"],
    ["1", next(1), "evening"],
    ["4", next(1), "morning"],
    ["", "", ""],
    ["# Hướng dẫn:", "", ""],
    ["# - employee_id: ID số nguyên có trong DB", "", ""],
    ["# - date: YYYY-MM-DD", "", ""],
    ["# - shift_type: morning|afternoon|evening", "", ""],
  ];
  const body = "\ufeff" + rows.map((r) => r.join(",")).join("\r\n");
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="cafe-hr-shifts-template.csv"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
