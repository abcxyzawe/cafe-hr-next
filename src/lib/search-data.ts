import "server-only";
import { prisma } from "./prisma";
import { ROLE_LABELS } from "./utils";

export type SearchItem = {
  type: "employee" | "shift" | "activity";
  id: string; // unique key
  href: string;
  title: string;
  subtitle?: string;
  avatarUrl?: string | null;
  meta?: string;
};

const MAX_PER_TYPE = 8;

export async function buildSearchIndex(): Promise<SearchItem[]> {
  const [employees, shifts, activities] = await Promise.all([
    prisma.employee.findMany({
      orderBy: { id: "asc" },
      select: { id: true, name: true, role: true, email: true, phone: true, avatarUrl: true },
    }),
    prisma.shift.findMany({
      take: 50,
      orderBy: { shiftDate: "desc" },
      include: { employee: { select: { name: true, role: true, avatarUrl: true } } },
    }),
    prisma.activityLog.findMany({
      take: 30,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } } },
    }),
  ]);

  const items: SearchItem[] = [];

  for (const e of employees) {
    items.push({
      type: "employee",
      id: `e-${e.id}`,
      href: `/employees/${e.id}`,
      title: e.name,
      subtitle: [ROLE_LABELS[e.role] ?? e.role, e.email, e.phone].filter(Boolean).join(" · "),
      avatarUrl: e.avatarUrl,
    });
  }

  for (const s of shifts.slice(0, MAX_PER_TYPE * 4)) {
    const date = s.shiftDate.toISOString().slice(0, 10);
    items.push({
      type: "shift",
      id: `s-${s.id}`,
      href: `/shifts?date=${date}`,
      title: `${s.employee.name} — ${date}`,
      subtitle: `${s.shiftType ?? "?"} · ${s.startTime ?? ""}–${s.endTime ?? ""}`,
      avatarUrl: s.employee.avatarUrl,
      meta: ROLE_LABELS[s.employee.role] ?? s.employee.role,
    });
  }

  for (const a of activities) {
    items.push({
      type: "activity",
      id: `a-${a.id}`,
      href: "/",
      title: a.summary,
      subtitle: `${a.user?.name ?? "Hệ thống"} · ${new Date(a.createdAt).toLocaleString("vi-VN")}`,
    });
  }

  return items;
}
