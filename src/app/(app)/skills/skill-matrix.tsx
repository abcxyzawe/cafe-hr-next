"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import {
  Award,
  BarChart3,
  Coffee,
  Download,
  MessageSquareHeart,
  RotateCcw,
  Scale,
  Scroll,
  Search,
  Sparkles,
  Star,
  Thermometer,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, ROLE_LABELS } from "@/lib/utils";
import { CATEGORY_LABEL, SKILLS, type Skill } from "@/lib/skill-catalogue";
import {
  SKILL_EVENT,
  STORAGE_KEY,
  getSkillState,
  resetAllSkills,
  setRating,
  type SkillRating,
  type SkillState,
} from "@/lib/skill-state";

export type MatrixEmployee = {
  id: number;
  name: string;
  role: string;
  avatarUrl: string | null;
};

function SkillIcon({
  name,
  className,
}: {
  name: Skill["iconName"];
  className?: string;
}) {
  if (name === "coffee") return <Coffee className={className} />;
  if (name === "users") return <Users className={className} />;
  if (name === "scale") return <Scale className={className} />;
  if (name === "sparkles") return <Sparkles className={className} />;
  if (name === "scroll") return <Scroll className={className} />;
  if (name === "bar-chart-3") return <BarChart3 className={className} />;
  if (name === "thermometer") return <Thermometer className={className} />;
  return <MessageSquareHeart className={className} />;
}

const RATING_VALUES: readonly SkillRating[] = [0, 1, 2, 3] as const;

function ratingsForEmployee(
  state: SkillState,
  empId: number,
): Record<string, SkillRating> {
  return state[String(empId)] ?? {};
}

function ratingFor(
  state: SkillState,
  empId: number,
  skillId: string,
): SkillRating {
  const v = state[String(empId)]?.[skillId];
  return v === 1 || v === 2 || v === 3 ? v : 0;
}

function avgEmployee(state: SkillState, empId: number): number | null {
  const map = ratingsForEmployee(state, empId);
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
  employees: MatrixEmployee[],
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

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildCsv(state: SkillState, employees: MatrixEmployee[]): string {
  const headers = [
    "ID",
    "Tên nhân viên",
    "Vai trò",
    ...SKILLS.map((s) => s.name),
    "Trung bình",
  ];
  const lines: string[] = [headers.map(csvEscape).join(",")];
  for (const e of employees) {
    const ratings = SKILLS.map((s) =>
      String(ratingFor(state, e.id, s.id)),
    );
    const avg = avgEmployee(state, e.id);
    const row = [
      String(e.id),
      e.name,
      ROLE_LABELS[e.role] ?? e.role,
      ...ratings,
      avg === null ? "" : avg.toFixed(2),
    ];
    lines.push(row.map(csvEscape).join(","));
  }
  // Footer: per-skill average
  const footerRatings = SKILLS.map((s) => {
    const { avg } = avgSkill(state, s.id, employees);
    return avg === null ? "" : avg.toFixed(2);
  });
  const footer = ["", "Trung bình kỹ năng", "", ...footerRatings, ""];
  lines.push(footer.map(csvEscape).join(","));
  return lines.join("\r\n");
}

function downloadCsv(filename: string, content: string): void {
  if (typeof window === "undefined") return;
  const bom = "\uFEFF";
  const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function todayStamp(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function Avatar({ emp }: { emp: MatrixEmployee }) {
  const initials = emp.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
      {emp.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={emp.avatarUrl}
          alt={emp.name}
          className="size-full object-cover"
        />
      ) : (
        <span>{initials || "?"}</span>
      )}
    </div>
  );
}

type StarPickerProps = {
  value: SkillRating;
  onChange: (next: SkillRating) => void;
  ariaLabel: string;
};

function StarPicker({ value, onChange, ariaLabel }: StarPickerProps) {
  return (
    <div
      className="inline-flex items-center gap-0.5"
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {RATING_VALUES.map((v) => {
        const active = v !== 0 && value >= v;
        const isZero = v === 0;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            aria-label={`${v} sao`}
            title={`${v} sao`}
            onClick={() => onChange(v)}
            className={cn(
              "flex size-6 items-center justify-center rounded-md transition-colors",
              "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isZero && value === 0
                ? "bg-muted text-muted-foreground"
                : isZero
                  ? "text-muted-foreground/60"
                  : active
                    ? "text-amber-500"
                    : "text-muted-foreground/40",
            )}
          >
            {isZero ? (
              <span className="text-[10px] font-semibold">0</span>
            ) : (
              <Star
                className={cn("size-4", active ? "fill-amber-400" : "")}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

export function SkillMatrix({ employees }: { employees: MatrixEmployee[] }) {
  const [state, setState] = useState<SkillState>({});
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState("");

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

  const handleChange = useCallback(
    (empId: number, skillId: string, next: SkillRating) => {
      setRating(empId, skillId, next);
    },
    [],
  );

  const handleReset = useCallback(() => {
    if (typeof window === "undefined") return;
    const ok = window.confirm(
      "Đặt lại toàn bộ đánh giá kỹ năng? Mọi sao đã chấm sẽ bị xoá khỏi thiết bị này.",
    );
    if (!ok) return;
    resetAllSkills();
  }, []);

  const filtered = useMemo<MatrixEmployee[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => {
      if (e.name.toLowerCase().includes(q)) return true;
      const roleLabel = (ROLE_LABELS[e.role] ?? e.role).toLowerCase();
      return roleLabel.includes(q);
    });
  }, [employees, query]);

  const skillAverages = useMemo(() => {
    const out: Record<string, { avg: number | null; count: number }> = {};
    for (const s of SKILLS) {
      out[s.id] = avgSkill(state, s.id, employees);
    }
    return out;
  }, [state, employees]);

  const handleExport = useCallback(() => {
    const csv = buildCsv(state, employees);
    downloadCsv(`ma-tran-ky-nang-${todayStamp()}.csv`, csv);
  }, [state, employees]);

  if (!hydrated) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-[420px] w-full rounded-xl" />
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
        Chưa có nhân viên nào trong hệ thống.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setQuery(e.target.value)
            }
            placeholder="Tìm theo tên hoặc vai trò…"
            className="pl-8"
            aria-label="Tìm nhân viên"
          />
        </div>
        <div className="text-xs text-muted-foreground">
          {filtered.length}/{employees.length} nhân viên
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download className="size-4" />
            Xuất CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
          >
            <RotateCcw className="size-4" />
            Đặt lại
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th
                scope="col"
                className="sticky left-0 z-10 min-w-[220px] bg-muted/40 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Nhân viên
              </th>
              {SKILLS.map((s) => (
                <th
                  key={s.id}
                  scope="col"
                  className="px-3 py-3 text-center align-bottom text-xs font-semibold text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <SkillIcon name={s.iconName} className="size-4" />
                    </div>
                    <div className="text-[11px] font-semibold leading-tight text-foreground">
                      {s.name}
                    </div>
                    <div className="text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                      {CATEGORY_LABEL[s.category]}
                    </div>
                  </div>
                </th>
              ))}
              <th
                scope="col"
                className="px-3 py-3 text-center align-bottom text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                <div className="flex flex-col items-center gap-1">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <Award className="size-4" />
                  </div>
                  <span className="text-[11px] font-semibold text-foreground">
                    Trung bình
                  </span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={SKILLS.length + 2}
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  Không tìm thấy nhân viên phù hợp.
                </td>
              </tr>
            ) : (
              filtered.map((emp) => {
                const avg = avgEmployee(state, emp.id);
                return (
                  <tr
                    key={emp.id}
                    className="border-b last:border-b-0 hover:bg-muted/30"
                  >
                    <th
                      scope="row"
                      className="sticky left-0 z-10 bg-card px-4 py-3 text-left font-normal"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar emp={emp} />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-foreground">
                            {emp.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {ROLE_LABELS[emp.role] ?? emp.role}
                          </div>
                        </div>
                      </div>
                    </th>
                    {SKILLS.map((s) => {
                      const r = ratingFor(state, emp.id, s.id);
                      return (
                        <td key={s.id} className="px-3 py-3 text-center">
                          <div className="flex justify-center">
                            <StarPicker
                              value={r}
                              ariaLabel={`${emp.name} – ${s.name}`}
                              onChange={(next) =>
                                handleChange(emp.id, s.id, next)
                              }
                            />
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-center">
                      <span
                        className={cn(
                          "inline-flex min-w-[48px] items-center justify-center rounded-md px-2 py-1 text-xs font-semibold tabular-nums",
                          avg === null
                            ? "bg-muted text-muted-foreground"
                            : avg >= 2.5
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : avg >= 1.5
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                : "bg-rose-500/15 text-rose-700 dark:text-rose-300",
                        )}
                      >
                        {formatAvg(avg)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted/40">
              <th
                scope="row"
                className="sticky left-0 z-10 bg-muted/40 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
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
                    className="px-3 py-3 text-center text-xs tabular-nums"
                  >
                    <div
                      className={cn(
                        "font-semibold",
                        avg === null
                          ? "text-muted-foreground"
                          : "text-foreground",
                      )}
                    >
                      {formatAvg(avg)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {count} đánh giá
                    </div>
                  </td>
                );
              })}
              <td className="px-3 py-3 text-center text-xs text-muted-foreground">
                —
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
