import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { ROLE_LABELS, SHIFT_LABELS } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: "Phép năm",
  sick: "Ốm",
  personal: "Cá nhân",
  unpaid: "Không lương",
};

const LEAVE_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  cancelled: "Đã huỷ",
};

const TASK_PRIORITY_LABELS: Record<string, string> = {
  low: "Thấp",
  normal: "Bình thường",
  high: "Cao",
  urgent: "Khẩn cấp",
};

const DATE_FMT = "yyyy-mm-dd hh:mm";
const DATE_ONLY_FMT = "yyyy-mm-dd";

type ColumnSpec = {
  header: string;
  key: string;
  width: number;
  numFmt?: string;
};

function styleHeader(ws: ExcelJS.Worksheet) {
  const row = ws.getRow(1);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF6B4423" },
  };
  row.alignment = { vertical: "middle", horizontal: "center" };
  row.height = 24;
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

function applyAutoFilter(ws: ExcelJS.Worksheet, columnCount: number, rowCount: number) {
  if (rowCount < 1 || columnCount < 1) return;
  const lastCol = ws.getColumn(columnCount).letter;
  ws.autoFilter = `A1:${lastCol}${rowCount + 1}`;
}

function setColumns(ws: ExcelJS.Worksheet, cols: ColumnSpec[]) {
  ws.columns = cols.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  cols.forEach((c) => {
    if (c.numFmt) ws.getColumn(c.key).numFmt = c.numFmt;
  });
}

export async function GET() {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (sess.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const since365 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const since90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const [employees, shifts, attendance, leaves, payroll, tasks, activities] =
    await Promise.all([
      prisma.employee.findMany({ orderBy: { id: "asc" } }),
      prisma.shift.findMany({
        orderBy: [{ shiftDate: "asc" }, { id: "asc" }],
        include: { employee: { select: { name: true } } },
      }),
      prisma.attendance.findMany({
        where: { checkIn: { gte: since365 } },
        orderBy: [{ checkIn: "asc" }, { id: "asc" }],
        include: { employee: { select: { name: true } } },
      }),
      prisma.leaveRequest.findMany({
        orderBy: { id: "asc" },
        include: {
          employee: { select: { name: true } },
        },
      }),
      prisma.payroll.findMany({
        orderBy: [{ period: "asc" }, { id: "asc" }],
        include: { employee: { select: { name: true } } },
      }),
      prisma.task.findMany({
        orderBy: { id: "asc" },
        include: { assignee: { select: { name: true } } },
      }),
      prisma.activityLog.findMany({
        where: { createdAt: { gte: since90 } },
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true } } },
      }),
    ]);

  // Resolve decidedBy names for leaves (separate query — not a relation in schema)
  const decidedByIds = Array.from(
    new Set(
      leaves
        .map((l) => l.decidedById)
        .filter((id): id is number => typeof id === "number"),
    ),
  );
  const decidedByUsers = decidedByIds.length
    ? await prisma.user.findMany({
        where: { id: { in: decidedByIds } },
        select: { id: true, name: true },
      })
    : [];
  const decidedByMap = new Map<number, string>(
    decidedByUsers.map((u) => [u.id, u.name]),
  );

  const wb = new ExcelJS.Workbook();
  wb.creator = "Cafe HR";
  wb.created = now;

  // README sheet
  {
    const ws = wb.addWorksheet("README", {
      properties: { tabColor: { argb: "FFB8860B" } },
    });
    ws.getColumn(1).width = 28;
    ws.getColumn(2).width = 60;
    const rows: Array<[string, string | number]> = [
      ["Ứng dụng", "Cafe HR"],
      ["Xuất lúc", now.toLocaleString("vi-VN")],
      ["Người xuất", sess.name],
      ["Email người xuất", sess.email],
      ["", ""],
      ["Ghi chú", "Chấm công chỉ lấy 365 ngày gần nhất"],
      ["", "Hoạt động (audit log) chỉ lấy 90 ngày gần nhất"],
      ["", "passwordHash của User KHÔNG được xuất vì lý do bảo mật"],
      ["", ""],
      ["Số nhân viên", employees.length],
      ["Số ca làm", shifts.length],
      ["Số bản ghi chấm công (365d)", attendance.length],
      ["Số đơn nghỉ", leaves.length],
      ["Số kỳ lương", payroll.length],
      ["Số công việc", tasks.length],
      ["Số hoạt động (90d)", activities.length],
    ];
    rows.forEach((r) => ws.addRow(r));
    ws.getColumn(1).font = { bold: true };
    ws.getRow(1).font = { bold: true, size: 14 };
  }

  // Nhân viên
  {
    const ws = wb.addWorksheet("Nhân viên", {
      properties: { tabColor: { argb: "FF8B5A2B" } },
    });
    const cols: ColumnSpec[] = [
      { header: "ID", key: "id", width: 6 },
      { header: "Họ tên", key: "name", width: 28 },
      { header: "Vai trò", key: "role", width: 14 },
      { header: "SĐT", key: "phone", width: 16 },
      { header: "Email", key: "email", width: 28 },
      { header: "Lương/giờ", key: "rate", width: 14, numFmt: "#,##0" },
      { header: "Ngày sinh", key: "dob", width: 14, numFmt: DATE_ONLY_FMT },
      { header: "Avatar URL", key: "avatar", width: 30 },
      { header: "Tạo lúc", key: "createdAt", width: 18, numFmt: DATE_FMT },
      { header: "Cập nhật", key: "updatedAt", width: 18, numFmt: DATE_FMT },
    ];
    setColumns(ws, cols);
    employees.forEach((e) => {
      ws.addRow({
        id: e.id,
        name: e.name,
        role: ROLE_LABELS[e.role] ?? e.role,
        phone: e.phone ?? "",
        email: e.email ?? "",
        rate: Number(e.hourlyRate),
        dob: e.dateOfBirth ?? null,
        avatar: e.avatarUrl ?? "",
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      });
    });
    styleHeader(ws);
    applyAutoFilter(ws, cols.length, employees.length);
  }

  // Ca làm
  {
    const ws = wb.addWorksheet("Ca làm", {
      properties: { tabColor: { argb: "FF8B5A2B" } },
    });
    const cols: ColumnSpec[] = [
      { header: "ID", key: "id", width: 6 },
      { header: "Nhân viên", key: "name", width: 28 },
      { header: "Ngày", key: "shiftDate", width: 14, numFmt: DATE_ONLY_FMT },
      { header: "Loại ca", key: "shiftType", width: 12 },
      { header: "Bắt đầu", key: "startTime", width: 10 },
      { header: "Kết thúc", key: "endTime", width: 10 },
      { header: "Tạo lúc", key: "createdAt", width: 18, numFmt: DATE_FMT },
    ];
    setColumns(ws, cols);
    shifts.forEach((s) => {
      ws.addRow({
        id: s.id,
        name: s.employee.name,
        shiftDate: s.shiftDate,
        shiftType: s.shiftType ? SHIFT_LABELS[s.shiftType] ?? s.shiftType : "",
        startTime: s.startTime ?? "",
        endTime: s.endTime ?? "",
        createdAt: s.createdAt,
      });
    });
    styleHeader(ws);
    applyAutoFilter(ws, cols.length, shifts.length);
  }

  // Chấm công
  {
    const ws = wb.addWorksheet("Chấm công", {
      properties: { tabColor: { argb: "FF8B5A2B" } },
    });
    const cols: ColumnSpec[] = [
      { header: "ID", key: "id", width: 6 },
      { header: "Nhân viên", key: "name", width: 28 },
      { header: "Vào ca", key: "checkIn", width: 18, numFmt: DATE_FMT },
      { header: "Hết ca", key: "checkOut", width: 18, numFmt: DATE_FMT },
      { header: "Số giờ", key: "hours", width: 10, numFmt: "0.00" },
    ];
    setColumns(ws, cols);
    attendance.forEach((a) => {
      ws.addRow({
        id: a.id,
        name: a.employee.name,
        checkIn: a.checkIn,
        checkOut: a.checkOut ?? null,
        hours: a.hoursWorked == null ? null : Number(a.hoursWorked),
      });
    });
    styleHeader(ws);
    applyAutoFilter(ws, cols.length, attendance.length);
  }

  // Đơn nghỉ
  {
    const ws = wb.addWorksheet("Đơn nghỉ", {
      properties: { tabColor: { argb: "FF8B5A2B" } },
    });
    const cols: ColumnSpec[] = [
      { header: "ID", key: "id", width: 6 },
      { header: "Nhân viên", key: "name", width: 28 },
      { header: "Loại nghỉ", key: "type", width: 14 },
      { header: "Từ ngày", key: "startDate", width: 14, numFmt: DATE_ONLY_FMT },
      { header: "Đến ngày", key: "endDate", width: 14, numFmt: DATE_ONLY_FMT },
      { header: "Lý do", key: "reason", width: 36 },
      { header: "Trạng thái", key: "status", width: 14 },
      { header: "Người duyệt", key: "decidedBy", width: 22 },
      { header: "Duyệt lúc", key: "decidedAt", width: 18, numFmt: DATE_FMT },
      { header: "Tạo lúc", key: "createdAt", width: 18, numFmt: DATE_FMT },
    ];
    setColumns(ws, cols);
    leaves.forEach((l) => {
      ws.addRow({
        id: l.id,
        name: l.employee.name,
        type: LEAVE_TYPE_LABELS[l.type] ?? l.type,
        startDate: l.startDate,
        endDate: l.endDate,
        reason: l.reason ?? "",
        status: LEAVE_STATUS_LABELS[l.status] ?? l.status,
        decidedBy: l.decidedById ? decidedByMap.get(l.decidedById) ?? "" : "",
        decidedAt: l.decidedAt ?? null,
        createdAt: l.createdAt,
      });
    });
    styleHeader(ws);
    applyAutoFilter(ws, cols.length, leaves.length);
  }

  // Lương
  {
    const ws = wb.addWorksheet("Lương", {
      properties: { tabColor: { argb: "FF8B5A2B" } },
    });
    const cols: ColumnSpec[] = [
      { header: "ID", key: "id", width: 6 },
      { header: "Nhân viên", key: "name", width: 28 },
      { header: "Kỳ lương", key: "period", width: 12 },
      { header: "Tổng giờ", key: "totalHours", width: 12, numFmt: "0.00" },
      { header: "Tổng tiền", key: "totalPay", width: 16, numFmt: "#,##0" },
      { header: "Tạo lúc", key: "generatedAt", width: 18, numFmt: DATE_FMT },
    ];
    setColumns(ws, cols);
    payroll.forEach((p) => {
      ws.addRow({
        id: p.id,
        name: p.employee.name,
        period: p.period,
        totalHours: Number(p.totalHours),
        totalPay: Number(p.totalPay),
        generatedAt: p.generatedAt,
      });
    });
    styleHeader(ws);
    applyAutoFilter(ws, cols.length, payroll.length);
  }

  // Công việc
  {
    const ws = wb.addWorksheet("Công việc", {
      properties: { tabColor: { argb: "FF8B5A2B" } },
    });
    const cols: ColumnSpec[] = [
      { header: "ID", key: "id", width: 6 },
      { header: "Tiêu đề", key: "title", width: 32 },
      { header: "Mô tả", key: "description", width: 36 },
      { header: "Người được giao", key: "assignee", width: 24 },
      { header: "Ưu tiên", key: "priority", width: 14 },
      { header: "Hạn", key: "dueDate", width: 14, numFmt: DATE_ONLY_FMT },
      { header: "Hoàn thành lúc", key: "completedAt", width: 18, numFmt: DATE_FMT },
      { header: "Hoàn thành bởi", key: "completedBy", width: 22 },
      { header: "Tạo bởi", key: "createdBy", width: 22 },
      { header: "Tạo lúc", key: "createdAt", width: 18, numFmt: DATE_FMT },
    ];
    setColumns(ws, cols);
    tasks.forEach((t) => {
      ws.addRow({
        id: t.id,
        title: t.title,
        description: t.description ?? "",
        assignee: t.assignee.name,
        priority: TASK_PRIORITY_LABELS[t.priority] ?? t.priority,
        dueDate: t.dueDate ?? null,
        completedAt: t.completedAt ?? null,
        completedBy: t.completedByName ?? "",
        createdBy: t.createdByName ?? "",
        createdAt: t.createdAt,
      });
    });
    styleHeader(ws);
    applyAutoFilter(ws, cols.length, tasks.length);
  }

  // Hoạt động
  {
    const ws = wb.addWorksheet("Hoạt động", {
      properties: { tabColor: { argb: "FF8B5A2B" } },
    });
    const cols: ColumnSpec[] = [
      { header: "ID", key: "id", width: 8 },
      { header: "Thời gian", key: "createdAt", width: 18, numFmt: DATE_FMT },
      { header: "Người thực hiện", key: "user", width: 22 },
      { header: "Hành động", key: "action", width: 24 },
      { header: "Đối tượng", key: "entityType", width: 16 },
      { header: "Đối tượng ID", key: "entityId", width: 12 },
      { header: "Mô tả", key: "summary", width: 60 },
    ];
    setColumns(ws, cols);
    activities.forEach((a) => {
      ws.addRow({
        id: a.id,
        createdAt: a.createdAt,
        user: a.user?.name ?? "",
        action: a.action,
        entityType: a.entityType ?? "",
        entityId: a.entityId ?? "",
        summary: a.summary,
      });
    });
    styleHeader(ws);
    applyAutoFilter(ws, cols.length, activities.length);
  }

  const buffer = await wb.xlsx.writeBuffer();
  const body = new Uint8Array(buffer as ArrayBuffer);
  const filename = `cafe-hr-backup-${now.toISOString().slice(0, 10)}.xlsx`;

  await logActivity({
    action: "backup.download",
    summary: `${sess.name} đã tải backup toàn bộ dữ liệu`,
    metadata: {
      employees: employees.length,
      shifts: shifts.length,
      attendance: attendance.length,
      leaves: leaves.length,
      payroll: payroll.length,
      tasks: tasks.length,
      activities: activities.length,
    },
  });

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
