import "server-only";
import { prisma } from "./prisma";

const CHAT_ENDPOINT = "https://api.x.ai/v1/chat/completions";

export type SuggestedShift = {
  employeeId: number;
  employeeName: string;
  date: string; // YYYY-MM-DD
  shiftType: "morning" | "afternoon" | "evening";
  rationale: string;
};

const SHIFT_TYPES = ["morning", "afternoon", "evening"] as const;
const WEEKDAYS_VI = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

/**
 * Build a 7-day shift schedule suggestion using historical patterns.
 * Falls back to a deterministic round-robin if Grok is unavailable.
 */
export async function suggestWeekSchedule(
  weekStartIso: string,
  extraContext?: string,
): Promise<{
  suggestions: SuggestedShift[];
  source: "grok" | "fallback";
  signals: string;
}> {
  // Parse week start (must be Monday)
  const weekStart = new Date(weekStartIso);
  weekStart.setHours(0, 0, 0, 0);
  if (isNaN(weekStart.getTime())) {
    throw new Error("weekStartIso không hợp lệ");
  }

  // Gather signals: each employee's recent shift type frequency
  const fourWeeksAgo = new Date(weekStart);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [employees, recentShifts, weekShifts, leaves] = await Promise.all([
    prisma.employee.findMany({
      orderBy: { id: "asc" },
      select: { id: true, name: true, role: true },
    }),
    prisma.shift.findMany({
      where: { shiftDate: { gte: fourWeeksAgo, lt: weekStart } },
      select: { employeeId: true, shiftType: true, shiftDate: true },
    }),
    prisma.shift.findMany({
      where: { shiftDate: { gte: weekStart, lt: weekEnd } },
      select: { employeeId: true, shiftType: true, shiftDate: true },
    }),
    prisma.leaveRequest.findMany({
      where: {
        status: { in: ["approved", "pending"] },
        startDate: { lt: weekEnd },
        endDate: { gte: weekStart },
      },
      select: {
        employeeId: true,
        type: true,
        status: true,
        startDate: true,
        endDate: true,
      },
    }),
  ]);

  if (employees.length === 0) {
    return { suggestions: [], source: "fallback", signals: "Chưa có nhân viên" };
  }

  // Build pattern per employee: { morning: N, afternoon: N, evening: N, total: N }
  const patterns = new Map<
    number,
    { morning: number; afternoon: number; evening: number; total: number }
  >();
  for (const e of employees) {
    patterns.set(e.id, { morning: 0, afternoon: 0, evening: 0, total: 0 });
  }
  for (const s of recentShifts) {
    if (!s.shiftType) continue;
    const p = patterns.get(s.employeeId);
    if (!p) continue;
    p[s.shiftType as "morning" | "afternoon" | "evening"]++;
    p.total++;
  }

  // Compose human-readable signals for the prompt
  const signalLines = employees.map((e) => {
    const p = patterns.get(e.id)!;
    if (p.total === 0)
      return `- ${e.name} (${e.role}): chưa có lịch sử`;
    const dominant = (["morning", "afternoon", "evening"] as const).reduce(
      (a, b) => (p[a] >= p[b] ? a : b),
    );
    const dominantVi =
      dominant === "morning"
        ? "sáng"
        : dominant === "afternoon"
          ? "chiều"
          : "tối";
    return `- ${e.name} (${e.role}): ${p.total} ca trong 4 tuần qua, hay làm ${dominantVi} (${p[dominant]} lần)`;
  });
  const signalsText = signalLines.join("\n");

  // Build week dates
  const weekDates: string[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  // Per-employee per-date "busy" set (on leave) — blocks that whole day
  const busyByEmp = new Map<number, Set<string>>();
  for (const e of employees) busyByEmp.set(e.id, new Set());
  for (const l of leaves) {
    const set = busyByEmp.get(l.employeeId);
    if (!set) continue;
    for (const iso of weekDates) {
      const d = new Date(iso);
      if (d >= l.startDate && d <= l.endDate) set.add(iso);
    }
  }

  // Existing shifts in target week — skip duplicates and surface as context
  const existingKey = (eId: number, iso: string, st: string) =>
    `${eId}__${iso}__${st}`;
  const existingShiftKeys = new Set<string>();
  for (const s of weekShifts) {
    if (!s.shiftType) continue;
    existingShiftKeys.add(
      existingKey(s.employeeId, s.shiftDate.toISOString().slice(0, 10), s.shiftType),
    );
  }

  const leaveLines = leaves.length
    ? leaves
        .map((l) => {
          const e = employees.find((x) => x.id === l.employeeId);
          const name = e?.name ?? `#${l.employeeId}`;
          const from = l.startDate.toISOString().slice(0, 10);
          const to = l.endDate.toISOString().slice(0, 10);
          return `- ${name}: nghỉ ${l.type} ${from}→${to} (${l.status})`;
        })
        .join("\n")
    : "- Không có ai xin nghỉ trong tuần này";

  const existingShiftLines = weekShifts.length
    ? weekShifts
        .map((s) => {
          const e = employees.find((x) => x.id === s.employeeId);
          const name = e?.name ?? `#${s.employeeId}`;
          const iso = s.shiftDate.toISOString().slice(0, 10);
          return `- ${iso} ${s.shiftType}: ${name}`;
        })
        .join("\n")
    : "- Tuần này chưa có ca nào";

  const employeeSummaryForPrompt = employees
    .map((e) => `#${e.id} ${e.name} (${e.role})`)
    .join(", ");

  const dateLabels = weekDates
    .map((iso) => {
      const d = new Date(iso);
      return `${iso} (${WEEKDAYS_VI[d.getDay()]})`;
    })
    .join(", ");

  // Try Grok first
  const apiKey = process.env.XAI_API_KEY;
  if (apiKey) {
    try {
      const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";
      const messages = [
        {
          role: "system",
          content:
            "Bạn là chuyên gia xếp lịch ca cho quán cà phê Việt Nam. " +
            "Trả về JSON object có field 'shifts' là mảng object với 4 field: " +
            "employeeId (number), date (YYYY-MM-DD), shiftType ('morning'|'afternoon'|'evening'), " +
            "rationale (string ngắn ≤15 từ VN). " +
            "QUY TẮC: " +
            "1) Mỗi ca cần ÍT NHẤT 1 barista. " +
            "2) Mỗi nhân viên không quá 2 ca/ngày. " +
            "3) Phân bố đều, ưu tiên ca mà nhân viên hay làm. " +
            "4) Mỗi nhân viên có ít nhất 1 ngày nghỉ trong tuần. " +
            "5) TUYỆT ĐỐI KHÔNG xếp ca cho nhân viên trong ngày họ đã xin nghỉ phép. " +
            "6) KHÔNG trùng ca đã tồn tại (cùng employeeId + date + shiftType). " +
            "7) TÔN TRỌNG TUYỆT ĐỐI 'Ghi chú từ quản lý' (part-time, khung giờ rảnh, người bận, yêu cầu riêng) — đây là chỉ thị cao nhất, ưu tiên hơn pattern. " +
            "Trả về JSON, KHÔNG markdown.",
        },
        {
          role: "user",
          content:
            `Xếp lịch 7 ngày từ ${dateLabels}.\n\n` +
            `Nhân viên (id, tên, vai trò): ${employeeSummaryForPrompt}\n\n` +
            `Pattern 4 tuần qua:\n${signalsText}\n\n` +
            `Nghỉ phép trong tuần:\n${leaveLines}\n\n` +
            `Ca đã xếp sẵn trong tuần (bổ sung, không trùng):\n${existingShiftLines}\n\n` +
            (extraContext && extraContext.trim()
              ? `Ghi chú từ quản lý (ràng buộc bắt buộc):\n${extraContext.trim().slice(0, 2000)}\n\n`
              : "") +
            `Mỗi ngày có 3 ca: sáng (07-12), chiều (12-17), tối (17-22). ` +
            `Trả về JSON đúng format.`,
        },
      ];

      const res = await fetch(CHAT_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.4,
          max_tokens: 4000,
          response_format: { type: "json_object" },
        }),
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const raw = data.choices?.[0]?.message?.content?.trim();
        if (raw) {
          const parsed = JSON.parse(raw) as { shifts?: unknown };
          const list = Array.isArray(parsed.shifts) ? parsed.shifts : [];
          const suggestions: SuggestedShift[] = [];
          const empById = new Map(employees.map((e) => [e.id, e.name]));
          for (const item of list) {
            if (!item || typeof item !== "object") continue;
            const obj = item as Record<string, unknown>;
            const employeeId = Number(obj.employeeId);
            const date = String(obj.date ?? "");
            const shiftType = String(obj.shiftType ?? "");
            const rationale = String(obj.rationale ?? "");
            if (
              !empById.has(employeeId) ||
              !weekDates.includes(date) ||
              !SHIFT_TYPES.includes(shiftType as (typeof SHIFT_TYPES)[number])
            ) {
              continue;
            }
            if (busyByEmp.get(employeeId)?.has(date)) continue;
            if (existingShiftKeys.has(existingKey(employeeId, date, shiftType))) continue;
            suggestions.push({
              employeeId,
              employeeName: empById.get(employeeId)!,
              date,
              shiftType: shiftType as (typeof SHIFT_TYPES)[number],
              rationale: rationale.slice(0, 200),
            });
          }
          if (suggestions.length > 0) {
            return { suggestions, source: "grok", signals: signalsText };
          }
        }
      }
    } catch {
      // fall through to fallback
    }
  }

  // Deterministic fallback: round-robin, but skip employees on leave that day
  // and skip slots already filled.
  const fallback: SuggestedShift[] = [];
  let idx = 0;
  for (const date of weekDates) {
    for (const shiftType of SHIFT_TYPES) {
      // find next employee not on leave that day and not already on this slot
      let picked: (typeof employees)[number] | null = null;
      for (let tried = 0; tried < employees.length; tried++) {
        const cand = employees[(idx + tried) % employees.length];
        if (busyByEmp.get(cand.id)?.has(date)) continue;
        if (existingShiftKeys.has(existingKey(cand.id, date, shiftType))) continue;
        picked = cand;
        idx = (idx + tried + 1) % employees.length;
        break;
      }
      if (!picked) continue;
      fallback.push({
        employeeId: picked.id,
        employeeName: picked.name,
        date,
        shiftType,
        rationale: "Xếp tự động luân phiên (đã tránh nghỉ phép)",
      });
    }
  }
  return { suggestions: fallback, source: "fallback", signals: signalsText };
}
