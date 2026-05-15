import "server-only";
import { prisma } from "./prisma";

const CHAT_ENDPOINT = "https://api.x.ai/v1/chat/completions";

type Signal = {
  label: string;
  value: string | number;
  context: string;
};

/**
 * Aggregate operational signals about the cafe over the last 30 days
 * vs the previous 30 days for context-aware insights generation.
 */
async function gatherSignals(): Promise<{
  signals: Signal[];
  rawData: Record<string, unknown>;
}> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const last30 = new Date(today);
  last30.setDate(last30.getDate() - 30);
  const prev30 = new Date(last30);
  prev30.setDate(prev30.getDate() - 30);

  const [
    totalEmployees,
    activeAttendance,
    last30Att,
    prev30Att,
    pendingLeaves,
    overdueTasks,
    upcomingBirthdays7d,
    last30Shifts,
  ] = await Promise.all([
    prisma.employee.count(),
    prisma.attendance.count({ where: { checkOut: null } }),
    prisma.attendance.findMany({
      where: { checkIn: { gte: last30 }, checkOut: { not: null } },
      select: { employeeId: true, hoursWorked: true },
    }),
    prisma.attendance.findMany({
      where: { checkIn: { gte: prev30, lt: last30 }, checkOut: { not: null } },
      select: { hoursWorked: true },
    }),
    prisma.leaveRequest.count({ where: { status: "pending" } }),
    prisma.task.count({
      where: {
        completedAt: null,
        dueDate: { lt: today, not: null },
      },
    }),
    prisma.employee.findMany({
      where: { dateOfBirth: { not: null } },
      select: { id: true, name: true, dateOfBirth: true },
    }),
    prisma.shift.count({ where: { shiftDate: { gte: last30 } } }),
  ]);

  const sumHours = (rows: { hoursWorked: { toString: () => string } | null }[]) =>
    rows.reduce((s, r) => s + Number(r.hoursWorked ?? 0), 0);
  const last30Hours = sumHours(last30Att);
  const prev30Hours = sumHours(prev30Att);
  const hoursChangePct =
    prev30Hours > 0
      ? Math.round(((last30Hours - prev30Hours) / prev30Hours) * 100)
      : null;

  // Per-employee hours change to find outliers
  const byEmp = new Map<number, number>();
  for (const a of last30Att) {
    byEmp.set(a.employeeId, (byEmp.get(a.employeeId) ?? 0) + Number(a.hoursWorked ?? 0));
  }
  const employees = await prisma.employee.findMany({
    where: { id: { in: Array.from(byEmp.keys()) } },
    select: { id: true, name: true },
  });
  const topWorker = Array.from(byEmp.entries())
    .sort((a, b) => b[1] - a[1])[0];
  const topWorkerName = topWorker
    ? employees.find((e) => e.id === topWorker[0])?.name
    : null;

  // Birthdays in next 7 days
  const todayMonth = today.getMonth();
  const todayDate = today.getDate();
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 7);
  const bdaysIn7d = upcomingBirthdays7d
    .filter((e) => {
      if (!e.dateOfBirth) return false;
      const dob = new Date(e.dateOfBirth);
      const next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
      if (next < today) next.setFullYear(next.getFullYear() + 1);
      return next <= horizon;
    })
    .map((e) => e.name);

  const signals: Signal[] = [
    {
      label: "Tổng nhân viên",
      value: totalEmployees,
      context: "Hiện đang quản lý",
    },
    {
      label: "Đang trong ca",
      value: activeAttendance,
      context: "Có session attendance đang mở",
    },
    {
      label: "Giờ làm 30 ngày qua",
      value: `${last30Hours.toFixed(0)}h`,
      context:
        hoursChangePct === null
          ? "Không có dữ liệu kỳ trước để so sánh"
          : `${hoursChangePct >= 0 ? "+" : ""}${hoursChangePct}% so với 30 ngày trước (${prev30Hours.toFixed(0)}h)`,
    },
    {
      label: "Đơn nghỉ chờ duyệt",
      value: pendingLeaves,
      context: "Cần admin duyệt",
    },
    {
      label: "Task quá hạn",
      value: overdueTasks,
      context: "Task chưa hoàn thành đã qua due date",
    },
    {
      label: "Sinh nhật 7 ngày tới",
      value: bdaysIn7d.length,
      context: bdaysIn7d.length > 0 ? `Gồm: ${bdaysIn7d.join(", ")}` : "Không có",
    },
    {
      label: "Số ca lên lịch 30 ngày",
      value: last30Shifts,
      context: "Đếm tất cả shift trong 30 ngày qua",
    },
    {
      label: "Nhân viên làm nhiều nhất",
      value: topWorkerName ?? "—",
      context: topWorker
        ? `${topWorker[1].toFixed(0)}h trong 30 ngày`
        : "Không có dữ liệu",
    },
  ];

  return {
    signals,
    rawData: {
      totalEmployees,
      activeAttendance,
      last30Hours,
      prev30Hours,
      hoursChangePct,
      pendingLeaves,
      overdueTasks,
      birthdaysIn7d: bdaysIn7d,
      last30Shifts,
      topWorker: topWorkerName,
    },
  };
}

export type Insight = {
  emoji: string;
  text: string;
};

const FALLBACK_INSIGHTS: Insight[] = [
  { emoji: "📊", text: "Hệ thống đang vận hành ổn định. Kiểm tra dashboard hằng ngày để theo dõi đội ngũ." },
  { emoji: "✅", text: "Hãy duyệt các đơn nghỉ phép đang chờ và kiểm tra task quá hạn." },
  { emoji: "🎂", text: "Đừng quên chúc mừng nhân viên có sinh nhật tuần này." },
];

async function generateInsightsFromSignals(signals: Signal[]): Promise<Insight[]> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return FALLBACK_INSIGHTS;
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const dataLines = signals
    .map((s) => `- ${s.label}: ${s.value} (${s.context})`)
    .join("\n");

  const messages = [
    {
      role: "system",
      content:
        "Bạn là cố vấn quản lý quán cà phê. Đọc các chỉ số vận hành và đưa ra 3 nhận xét NGẮN GỌN, có giá trị thực tiễn cho quản lý. Mỗi nhận xét dưới 20 từ, KHÔNG bắt đầu bằng emoji, KHÔNG dùng markdown. Trả về JSON object với field 'insights' là mảng 3 string thuần.",
    },
    {
      role: "user",
      content: `Đây là chỉ số vận hành tuần này của quán:\n${dataLines}\n\nTrả về JSON: {"insights": ["...", "...", "..."]}`,
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
        temperature: 0.7,
        max_tokens: 400,
        response_format: { type: "json_object" },
      }),
      cache: "no-store",
    });
    if (!res.ok) return FALLBACK_INSIGHTS;

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return FALLBACK_INSIGHTS;

    const parsed = JSON.parse(raw) as { insights?: unknown };
    const list = Array.isArray(parsed.insights) ? parsed.insights : [];
    const texts = list
      .filter((s): s is string => typeof s === "string")
      .slice(0, 3)
      .map((t) => t.replace(/^[\p{Emoji_Presentation}\p{Emoji}]+\s*/u, "").trim());

    if (texts.length === 0) return FALLBACK_INSIGHTS;

    const emojis = ["📈", "⚠️", "💡", "🎯", "✨"];
    return texts.map((text, i) => ({ emoji: emojis[i] ?? "•", text }));
  } catch {
    return FALLBACK_INSIGHTS;
  }
}

const CACHE_KEY_PREFIX = "insights:";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Get today's insights, caching in DailyQuote table (reuse infrastructure)
 * with a `insights:YYYY-MM-DD` content key. Returns parsed insights.
 */
export async function getOrCreateTodayInsights(): Promise<{
  insights: Insight[];
  generatedAt: Date;
  cached: boolean;
}> {
  const key = `${CACHE_KEY_PREFIX}${todayKey()}`;
  try {
    // Reuse DailyQuote table: model field = key, content field = JSON
    const existing = await prisma.dailyQuote.findFirst({
      where: { model: key },
      orderBy: { id: "desc" },
    });
    if (existing) {
      try {
        const parsed = JSON.parse(existing.content) as Insight[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return {
            insights: parsed,
            generatedAt: existing.createdAt,
            cached: true,
          };
        }
      } catch {
        // fall through
      }
    }
  } catch {
    return {
      insights: FALLBACK_INSIGHTS,
      generatedAt: new Date(),
      cached: false,
    };
  }

  const { signals } = await gatherSignals();
  const insights = await generateInsightsFromSignals(signals);

  // Cache (use a synthetic date so unique constraint on `date` doesn't collide)
  try {
    const cacheDate = new Date();
    cacheDate.setHours(0, 0, 0, 0);
    // The date column is unique — we can't reuse same date for both quote + insights.
    // Use a slightly different time pattern: subtract 1 day for insights cache.
    cacheDate.setDate(cacheDate.getDate() - 1);
    await prisma.dailyQuote.upsert({
      where: { date: cacheDate },
      update: { content: JSON.stringify(insights), model: key },
      create: {
        date: cacheDate,
        content: JSON.stringify(insights),
        model: key,
      },
    });
  } catch {
    // ignore cache failure
  }

  return { insights, generatedAt: new Date(), cached: false };
}

/**
 * Force refresh today's insights (admin action).
 */
export async function regenerateTodayInsights(): Promise<Insight[]> {
  const { signals } = await gatherSignals();
  const insights = await generateInsightsFromSignals(signals);

  try {
    const cacheDate = new Date();
    cacheDate.setHours(0, 0, 0, 0);
    cacheDate.setDate(cacheDate.getDate() - 1);
    const key = `${CACHE_KEY_PREFIX}${todayKey()}`;
    await prisma.dailyQuote.upsert({
      where: { date: cacheDate },
      update: { content: JSON.stringify(insights), model: key, createdAt: new Date() },
      create: { date: cacheDate, content: JSON.stringify(insights), model: key },
    });
  } catch {
    // ignore
  }

  return insights;
}
