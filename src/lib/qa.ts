import "server-only";
import { prisma } from "./prisma";

const CHAT_ENDPOINT = "https://api.x.ai/v1/chat/completions";

/**
 * Build a structured context blob describing the cafe state.
 * This is fed to the AI on every question — keeps the model grounded.
 */
async function buildContext(): Promise<string> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(today);
  const dayOfWeek = today.getDay();
  startOfWeek.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    employees,
    todayShifts,
    weekShifts,
    monthAttendance,
    pendingLeaves,
    openAttendance,
    overdueTasks,
    upcomingLeaves,
  ] = await Promise.all([
    prisma.employee.findMany({
      select: { id: true, name: true, role: true, hourlyRate: true },
      orderBy: { id: "asc" },
    }),
    prisma.shift.findMany({
      where: {
        shiftDate: {
          gte: today,
          lt: new Date(today.getTime() + 86400000),
        },
      },
      include: { employee: { select: { name: true, role: true } } },
    }),
    prisma.shift.count({
      where: { shiftDate: { gte: startOfWeek, lt: endOfWeek } },
    }),
    prisma.attendance.findMany({
      where: { checkIn: { gte: startOfMonth }, checkOut: { not: null } },
      select: { employeeId: true, hoursWorked: true },
    }),
    prisma.leaveRequest.findMany({
      where: { status: "pending" },
      include: { employee: { select: { name: true } } },
    }),
    prisma.attendance.findMany({
      where: { checkOut: null },
      include: { employee: { select: { name: true, role: true } } },
    }),
    prisma.task.count({
      where: { completedAt: null, dueDate: { lt: today, not: null } },
    }),
    prisma.leaveRequest.findMany({
      where: {
        status: "approved",
        startDate: { gte: today, lt: new Date(today.getTime() + 7 * 86400000) },
      },
      include: { employee: { select: { name: true } } },
    }),
  ]);

  // Aggregate hours + pay per employee for current month
  const monthHoursByEmp = new Map<number, number>();
  for (const a of monthAttendance) {
    monthHoursByEmp.set(
      a.employeeId,
      (monthHoursByEmp.get(a.employeeId) ?? 0) + Number(a.hoursWorked ?? 0),
    );
  }
  let totalMonthHours = 0;
  let totalMonthPay = 0;
  const empSummary = employees.map((e) => {
    const hours = monthHoursByEmp.get(e.id) ?? 0;
    const pay = hours * Number(e.hourlyRate);
    totalMonthHours += hours;
    totalMonthPay += pay;
    return `#${e.id} ${e.name} (${e.role}): ${hours.toFixed(1)}h tháng này, lương ${Number(e.hourlyRate).toLocaleString("vi-VN")}đ/giờ, thực lĩnh ${pay.toLocaleString("vi-VN")}đ`;
  });

  // Sort employees by hours (top 5 only for prompt brevity)
  const ranked = [...employees].sort(
    (a, b) =>
      (monthHoursByEmp.get(b.id) ?? 0) - (monthHoursByEmp.get(a.id) ?? 0),
  );
  const topWorkers = ranked
    .slice(0, 5)
    .map((e) => `${e.name}: ${(monthHoursByEmp.get(e.id) ?? 0).toFixed(1)}h`)
    .join(", ");

  const dateStr = now.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return `# Trạng thái Cafe HR ngày ${dateStr}

## Tổng quan
- Tổng nhân viên: ${employees.length}
- Đang trong ca (chưa check-out): ${openAttendance.length} (${openAttendance.map((a) => a.employee.name).join(", ") || "không có"})
- Đơn nghỉ chờ duyệt: ${pendingLeaves.length}
- Task quá hạn chưa xong: ${overdueTasks}
- Số ca tuần này: ${weekShifts}

## Hôm nay
- Số ca xếp: ${todayShifts.length}
${todayShifts.map((s) => `  - ${s.employee.name} (${s.employee.role}): ${s.shiftType} ${s.startTime ?? ""}-${s.endTime ?? ""}`).join("\n") || "  - Không có ca nào xếp"}

## Tháng này (lương tích luỹ)
- Tổng giờ làm: ${totalMonthHours.toFixed(1)}h
- Tổng lương dự tính: ${totalMonthPay.toLocaleString("vi-VN")}đ
- Top 5 nhân viên: ${topWorkers}

## Chi tiết nhân viên (tháng này)
${empSummary.join("\n")}

## Đơn nghỉ chờ duyệt
${pendingLeaves.map((l) => `- ${l.employee.name}: ${l.type} ${new Date(l.startDate).toISOString().slice(0, 10)} → ${new Date(l.endDate).toISOString().slice(0, 10)}`).join("\n") || "Không có"}

## Lịch nghỉ 7 ngày tới (đã duyệt)
${upcomingLeaves.map((l) => `- ${l.employee.name}: ${l.type} ${new Date(l.startDate).toISOString().slice(0, 10)} → ${new Date(l.endDate).toISOString().slice(0, 10)}`).join("\n") || "Không có"}
`;
}

export type QAChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function askQuestion(
  question: string,
  previousMessages?: ReadonlyArray<QAChatMessage>,
): Promise<{
  answer: string;
  source: "grok" | "fallback";
}> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return {
      answer:
        "Trợ lý chưa được cấu hình. Vui lòng kiểm tra cài đặt server (XAI_API_KEY).",
      source: "fallback",
    };
  }

  const trimmed = question.trim();
  if (trimmed.length === 0) {
    return { answer: "Vui lòng nhập câu hỏi.", source: "fallback" };
  }
  if (trimmed.length > 500) {
    return {
      answer: "Câu hỏi quá dài (max 500 ký tự).",
      source: "fallback",
    };
  }

  const context = await buildContext();
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  // Cap to last 6 turns to avoid prompt bloat
  const history = (previousMessages ?? []).slice(-6).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    {
      role: "system",
      content:
        "Bạn là trợ lý quản lý quán cà phê thông minh. Đọc context và trả lời câu hỏi của quản lý NGẮN GỌN, chính xác, dựa CHỈ vào dữ liệu trong context. " +
        "QUY TẮC: " +
        "1) Trả lời tối đa 3-4 câu. " +
        "2) Nếu không có dữ liệu trong context → nói thẳng 'Không có dữ liệu' chứ không bịa. " +
        "3) Dùng số liệu cụ thể từ context, format tiếng Việt (vd: 35,000đ, 8.5 giờ). " +
        "4) KHÔNG dùng markdown headings. Có thể dùng bullet (•) nếu liệt kê. " +
        "5) Giọng văn thân thiện, chuyên nghiệp. " +
        "6) Nếu câu hỏi tham chiếu đến hội thoại trước (vd: 'còn ai khác', 'thì sao', 'người đó'), dùng lịch sử để hiểu ngữ cảnh.",
    },
    {
      role: "user",
      content: `CONTEXT:\n${context}`,
    },
    {
      role: "assistant",
      content: "Đã nắm được dữ liệu hiện tại. Bạn cần hỏi gì?",
    },
    ...history,
    {
      role: "user",
      content: trimmed,
    },
  ];

  try {
    const res = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3,
        max_tokens: 400,
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      return {
        answer: `Xin lỗi, dịch vụ trả lời gặp lỗi (${res.status}). Vui lòng thử lại.`,
        source: "fallback",
      };
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const answer = data.choices?.[0]?.message?.content?.trim();
    if (!answer) {
      return { answer: "Không nhận được câu trả lời.", source: "fallback" };
    }
    return { answer, source: "grok" };
  } catch (e) {
    return {
      answer: `Lỗi mạng: ${e instanceof Error ? e.message.slice(0, 100) : "không xác định"}`,
      source: "fallback",
    };
  }
}
