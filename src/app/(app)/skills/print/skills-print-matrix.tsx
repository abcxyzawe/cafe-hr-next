"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, ROLE_LABELS } from "@/lib/utils";
import { CATEGORY_LABEL, SKILLS } from "@/lib/skill-catalogue";
import {
  SKILL_EVENT,
  STORAGE_KEY,
  getSkillState,
  type SkillRating,
  type SkillState,
} from "@/lib/skill-state";
import { PrintButton } from "./print-button";

export type PrintEmployee = {
  id: number;
  name: string;
  role: string;
  avatarUrl: string | null;
};

const RATING_DOTS = [1, 2, 3] as const; // 3 dots, since max rating is 3

function ratingFor(
  state: SkillState,
  empId: number,
  skillId: string,
): SkillRating {
  const v = state[String(empId)]?.[skillId];
  return v === 1 || v === 2 || v === 3 ? v : 0;
}

function avgEmployee(state: SkillState, empId: number): number | null {
  const map = state[String(empId)] ?? {};
  const ratings = SKILLS.map((s) => map[s.id]).filter(
    (r): r is SkillRating => r === 1 || r === 2 || r === 3,
  );
  if (ratings.length === 0) return null;
  const total = ratings.reduce<number>((acc, r) => acc + r, 0);
  return total / ratings.length;
}

function avgSkill(
  state: SkillState,
  skillId: string,
  employees: PrintEmployee[],
): { avg: number | null; count: number } {
  let sum = 0;
  let n = 0;
  for (const e of employees) {
    const r = state[String(e.id)]?.[skillId];
    if (r === 1 || r === 2 || r === 3) {
      sum += r;
      n += 1;
    }
  }
  if (n === 0) return { avg: null, count: 0 };
  return { avg: sum / n, count: n };
}

function formatAvg(v: number | null): string {
  if (v === null) return "—";
  return v.toFixed(2);
}

function formatToday(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function Initials({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return <span>{initials || "?"}</span>;
}

function PrintAvatar({ emp }: { emp: PrintEmployee }) {
  return (
    <div className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-stone-200 text-[10px] font-semibold text-stone-700 print:bg-stone-100">
      {emp.avatarUrl ? (
        // Plain img to avoid next/image domain config edge cases on print page
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={emp.avatarUrl}
          alt={emp.name}
          className="size-full object-cover"
        />
      ) : (
        <Initials name={emp.name} />
      )}
    </div>
  );
}

function RatingDots({ value }: { value: SkillRating }) {
  return (
    <div
      className="inline-flex items-center justify-center gap-0.5"
      aria-label={`${value} trên 3`}
    >
      {RATING_DOTS.map((i) => {
        const filled = value >= i;
        return (
          <span
            key={i}
            className={cn(
              "inline-block size-2 rounded-full border",
              filled
                ? "border-amber-600 bg-amber-500 print:border-stone-700 print:bg-stone-700"
                : "border-stone-400 bg-transparent print:border-stone-500",
            )}
          />
        );
      })}
    </div>
  );
}

function avgChipClass(avg: number | null): string {
  if (avg === null) return "bg-stone-100 text-stone-500";
  if (avg >= 2.5) return "bg-emerald-100 text-emerald-800";
  if (avg >= 1.5) return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

export function SkillsPrintMatrix({
  employees,
}: {
  employees: PrintEmployee[];
}) {
  const [state, setState] = useState<SkillState>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(getSkillState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const reread = () => setState(getSkillState());
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STORAGE_KEY) reread();
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<{ key?: string }>).detail;
      if (!detail || !detail.key || detail.key === STORAGE_KEY) reread();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(SKILL_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(SKILL_EVENT, onCustom);
    };
  }, [hydrated]);

  const skillAverages = useMemo(() => {
    const out: Record<string, { avg: number | null; count: number }> = {};
    for (const s of SKILLS) {
      out[s.id] = avgSkill(state, s.id, employees);
    }
    return out;
  }, [state, employees]);

  const ratedEmployeeCount = useMemo(() => {
    let n = 0;
    for (const e of employees) {
      const map = state[String(e.id)];
      if (map && Object.keys(map).length > 0) n += 1;
    }
    return n;
  }, [state, employees]);

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-4 print:max-w-none print:space-y-2">
      <style>{`
        @page {
          size: A4 landscape;
          margin: 1cm;
        }
        @media print {
          html, body {
            background: #ffffff !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm print:hidden">
        <Button asChild variant="outline" size="sm">
          <Link href="/skills">
            <ArrowLeft className="size-4" />
            Quay lại
          </Link>
        </Button>
        <div className="text-xs text-muted-foreground">
          Trang này hiển thị toàn bộ ma trận để in trên giấy A4 ngang. Dữ liệu
          được đọc từ thiết bị này (localStorage).
        </div>
        <PrintButton />
      </div>

      <div className="rounded-xl border bg-white p-6 text-stone-900 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
        {/* Branded header */}
        <header className="mb-4 flex items-start gap-3 border-b border-stone-300 pb-3">
          <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-stone-100">
            <Image
              src="/brand/logo-96.png"
              alt="Cafe HR"
              width={48}
              height={48}
              className="size-12 object-contain"
              priority
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
              Cafe HR
            </div>
            <h1 className="text-xl font-bold tracking-tight text-stone-900">
              MA TRẬN KỸ NĂNG NHÂN VIÊN
            </h1>
            <div className="mt-0.5 text-[11px] text-stone-600">
              Đánh giá theo thang 0–3 sao trên 8 nhóm kỹ năng cốt lõi
            </div>
          </div>
          <div className="text-right text-[11px] text-stone-600">
            <div>
              Ngày in: <span className="font-semibold">{formatToday()}</span>
            </div>
            <div>
              Tổng nhân viên:{" "}
              <span className="font-semibold">{employees.length}</span>
            </div>
            <div>
              Đã đánh giá:{" "}
              <span className="font-semibold">
                {hydrated ? ratedEmployeeCount : 0}
              </span>
            </div>
          </div>
        </header>

        {!hydrated ? (
          <div className="py-12 text-center text-sm text-stone-500">
            Đang tải…
          </div>
        ) : employees.length === 0 ? (
          <div className="py-12 text-center text-sm text-stone-500">
            Chưa có nhân viên nào trong hệ thống.
          </div>
        ) : (
          <table className="w-full border-collapse text-[11px] text-stone-900">
            <thead>
              <tr className="border-b border-stone-400">
                <th
                  scope="col"
                  className="sticky left-0 z-10 min-w-[180px] bg-white px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-600"
                >
                  Nhân viên
                </th>
                {SKILLS.map((s) => (
                  <th
                    key={s.id}
                    scope="col"
                    className="border-l border-stone-200 px-1.5 py-2 text-center align-bottom"
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="text-[10px] font-semibold leading-tight text-stone-900">
                        {s.name}
                      </div>
                      <div className="text-[9px] font-normal uppercase tracking-wide text-stone-500">
                        {CATEGORY_LABEL[s.category]}
                      </div>
                    </div>
                  </th>
                ))}
                <th
                  scope="col"
                  className="border-l border-stone-200 px-2 py-2 text-center align-bottom text-[10px] font-semibold uppercase tracking-wide text-stone-600"
                >
                  TB
                </th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const avg = avgEmployee(state, emp.id);
                return (
                  <tr
                    key={emp.id}
                    className="border-b border-stone-200 last:border-b-0"
                  >
                    <th
                      scope="row"
                      className="sticky left-0 z-10 bg-white px-2 py-1.5 text-left font-normal"
                    >
                      <div className="flex items-center gap-2">
                        <PrintAvatar emp={emp} />
                        <div className="min-w-0">
                          <div className="truncate text-[11px] font-semibold text-stone-900">
                            {emp.name}
                          </div>
                          <span className="inline-block rounded-sm bg-stone-100 px-1 py-px text-[9px] font-medium uppercase tracking-wide text-stone-600">
                            {ROLE_LABELS[emp.role] ?? emp.role}
                          </span>
                        </div>
                      </div>
                    </th>
                    {SKILLS.map((s) => {
                      const r = ratingFor(state, emp.id, s.id);
                      return (
                        <td
                          key={s.id}
                          className="border-l border-stone-200 px-1.5 py-1.5 text-center"
                        >
                          <RatingDots value={r} />
                        </td>
                      );
                    })}
                    <td className="border-l border-stone-200 px-2 py-1.5 text-center">
                      <span
                        className={cn(
                          "inline-flex min-w-[32px] items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                          avgChipClass(avg),
                        )}
                      >
                        {formatAvg(avg)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-stone-400 bg-stone-50">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-stone-50 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-700"
                >
                  Trung bình kỹ năng
                </th>
                {SKILLS.map((s) => {
                  const { avg, count } = skillAverages[s.id] ?? {
                    avg: null,
                    count: 0,
                  };
                  return (
                    <td
                      key={s.id}
                      className="border-l border-stone-200 px-1.5 py-2 text-center text-[10px] tabular-nums"
                    >
                      <div className="font-semibold text-stone-900">
                        {formatAvg(avg)}
                      </div>
                      <div className="text-[9px] text-stone-500">
                        {count} đánh giá
                      </div>
                    </td>
                  );
                })}
                <td className="border-l border-stone-200 px-2 py-2 text-center text-[10px] text-stone-500">
                  —
                </td>
              </tr>
            </tfoot>
          </table>
        )}

        <footer className="mt-4 flex items-center justify-between border-t border-stone-300 pt-2 text-[10px] text-stone-500">
          <span>
            Quy ước: ●●● = thành thạo (3), ●●○ = khá (2), ●○○ = cơ bản (1),
            ○○○ = chưa đánh giá / 0
          </span>
          <span>Cafe HR · Bản in nội bộ</span>
        </footer>
      </div>
    </div>
  );
}
