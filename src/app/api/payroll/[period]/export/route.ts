import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ period: string }> },
) {
  const { period } = await params;
  if (!/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ error: "Invalid period (use YYYY-MM)" }, { status: 400 });
  }

  const [year, month] = period.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const employees = await prisma.employee.findMany({ orderBy: { id: "asc" } });
  const attendance = await prisma.attendance.findMany({
    where: { checkIn: { gte: start, lt: end }, checkOut: { not: null } },
    select: { employeeId: true, hoursWorked: true },
  });
  const hoursByEmp = new Map<number, number>();
  for (const a of attendance) {
    hoursByEmp.set(
      a.employeeId,
      (hoursByEmp.get(a.employeeId) ?? 0) + Number(a.hoursWorked ?? 0),
    );
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "Cafe HR";
  wb.created = new Date();

  const ws = wb.addWorksheet(`Lương ${period}`, {
    properties: { tabColor: { argb: "FF8B5A2B" } },
  });

  ws.columns = [
    { header: "#", key: "id", width: 6 },
    { header: "Họ tên", key: "name", width: 28 },
    { header: "Vai trò", key: "role", width: 14 },
    { header: "SĐT", key: "phone", width: 16 },
    { header: "Email", key: "email", width: 28 },
    { header: "Lương/giờ (đ)", key: "rate", width: 16 },
    { header: "Số giờ làm", key: "hours", width: 14 },
    { header: "Thực lĩnh (đ)", key: "pay", width: 18 },
  ];

  // Header style
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  ws.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF6B4423" },
  };
  ws.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
  ws.getRow(1).height = 28;

  let totalHours = 0;
  let totalPay = 0;

  employees.forEach((e) => {
    const hours = Number((hoursByEmp.get(e.id) ?? 0).toFixed(2));
    const rate = Number(e.hourlyRate);
    const pay = Number((hours * rate).toFixed(2));
    totalHours += hours;
    totalPay += pay;
    ws.addRow({
      id: e.id,
      name: e.name,
      role: ROLE_LABELS[e.role] ?? e.role,
      phone: e.phone ?? "",
      email: e.email ?? "",
      rate,
      hours,
      pay,
    });
  });

  // Total row
  const totalRow = ws.addRow({
    id: "",
    name: "TỔNG",
    role: "",
    phone: "",
    email: "",
    rate: "",
    hours: Number(totalHours.toFixed(2)),
    pay: Number(totalPay.toFixed(2)),
  });
  totalRow.font = { bold: true };
  totalRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF5E6D3" },
  };

  // Currency / number formats
  ws.getColumn("rate").numFmt = '#,##0" đ"';
  ws.getColumn("pay").numFmt = '#,##0" đ"';
  ws.getColumn("hours").numFmt = "0.00";
  ws.getColumn("rate").alignment = { horizontal: "right" };
  ws.getColumn("pay").alignment = { horizontal: "right" };
  ws.getColumn("hours").alignment = { horizontal: "right" };

  // Borders
  ws.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE0D5C7" } },
        bottom: { style: "thin", color: { argb: "FFE0D5C7" } },
        left: { style: "thin", color: { argb: "FFE0D5C7" } },
        right: { style: "thin", color: { argb: "FFE0D5C7" } },
      };
    });
  });

  // Metadata sheet
  const meta = wb.addWorksheet("Thông tin");
  meta.addRow(["Kỳ lương", period]);
  meta.addRow(["Xuất lúc", new Date().toLocaleString("vi-VN")]);
  meta.addRow(["Số nhân viên", employees.length]);
  meta.addRow(["Tổng giờ làm", Number(totalHours.toFixed(2))]);
  meta.addRow(["Tổng thực lĩnh", Number(totalPay.toFixed(2))]);
  meta.getColumn(1).width = 22;
  meta.getColumn(2).width = 32;
  meta.getColumn(1).font = { bold: true };

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="bang-luong-${period}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
