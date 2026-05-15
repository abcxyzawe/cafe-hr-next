"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  GOALS_EVENT,
  STORAGE_KEY,
  TYPE_ICON,
  TYPE_LABEL,
  addGoal,
  adjustProgress,
  deleteGoal,
  getGoals,
  toggleCompleted,
  updateGoal,
  type Goal,
  type GoalType,
} from "@/lib/goals-state";

type SortKey = "deadline" | "progress" | "created";

const SORT_LABEL: Record<SortKey, string> = {
  deadline: "Theo hạn (gần nhất)",
  progress: "Theo tiến độ (cao nhất)",
  created: "Theo ngày tạo (mới nhất)",
};

const TYPE_DEFAULT_UNIT: Record<GoalType, string> = {
  hours: "giờ",
  shifts: "ca",
  income: "VND",
  skill: "★",
  custom: "",
};

function TypeIcon({
  name,
  className,
}: {
  name: (typeof TYPE_ICON)[GoalType];
  className?: string;
}) {
  if (name === "clock") return <Clock className={className} />;
  if (name === "calendar-clock") return <CalendarClock className={className} />;
  if (name === "wallet") return <Wallet className={className} />;
  if (name === "sparkles") return <Sparkles className={className} />;
  return <Target className={className} />;
}

function todayIso(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatIsoDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysUntil(iso: string, today: Date = new Date()): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return Number.POSITIVE_INFINITY;
  const [y, m, d] = iso.split("-").map(Number);
  const target = Date.UTC(y, m - 1, d);
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.floor((target - now) / MS_PER_DAY);
}

function progressPct(g: Goal): number {
  if (g.targetValue <= 0) return 0;
  const raw = (g.currentValue / g.targetValue) * 100;
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (Number.isInteger(n)) return n.toLocaleString("vi-VN");
  return n.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}

export function GoalsBoard() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [sort, setSort] = useState<SortKey>("deadline");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setGoals(getGoals());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const reread = () => setGoals(getGoals());
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STORAGE_KEY) reread();
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<{ key?: string }>).detail;
      if (!detail || !detail.key || detail.key === STORAGE_KEY) reread();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(GOALS_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(GOALS_EVENT, onCustom);
    };
  }, [hydrated]);

  const stats = useMemo(() => {
    const total = goals.length;
    let completed = 0;
    let onTrack = 0;
    for (const g of goals) {
      if (g.completed) {
        completed += 1;
        continue;
      }
      const pct = progressPct(g);
      const days = daysUntil(g.deadline);
      // "on-track": still time left and progress >= expected pace (simple heuristic)
      // Use: on-track if pct >= 50 OR if days remaining is healthy relative to progress.
      if (days >= 0 && pct >= 50) onTrack += 1;
      else if (days >= 7 && pct >= 25) onTrack += 1;
    }
    return { total, completed, onTrack };
  }, [goals]);

  const sortedGoals = useMemo(() => {
    const list = [...goals];
    list.sort((a, b) => {
      // completed goals always at bottom
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (sort === "deadline") {
        return a.deadline.localeCompare(b.deadline);
      }
      if (sort === "progress") {
        return progressPct(b) - progressPct(a);
      }
      // created desc (newest first)
      return b.createdAt.localeCompare(a.createdAt);
    });
    return list;
  }, [goals, sort]);

  const handleAdd = useCallback(
    (input: {
      title: string;
      type: GoalType;
      targetValue: number;
      currentValue: number;
      unit: string;
      deadline: string;
      notes: string;
    }) => {
      addGoal(input);
      setShowForm(false);
    },
    [],
  );

  const handleSaveEdit = useCallback(
    (id: string, patch: Partial<Goal>) => {
      updateGoal(id, patch);
      setEditingId(null);
    },
    [],
  );

  const handleDelete = useCallback((id: string) => {
    if (typeof window === "undefined") return;
    const ok = window.confirm("Xoá mục tiêu này? Hành động không thể hoàn tác.");
    if (!ok) return;
    deleteGoal(id);
  }, []);

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          label="Tổng mục tiêu"
          value={stats.total}
          tone="primary"
          icon={<Target className="size-4" />}
        />
        <StatTile
          label="Đã hoàn thành"
          value={stats.completed}
          tone="emerald"
          icon={<CheckCircle2 className="size-4" />}
        />
        <StatTile
          label="Đang đúng tiến độ"
          value={stats.onTrack}
          tone="amber"
          icon={<Sparkles className="size-4" />}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Label htmlFor="goals-sort" className="text-xs text-muted-foreground">
            Sắp xếp:
          </Label>
          <Select
            id="goals-sort"
            value={sort}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
              const v = e.target.value;
              if (v === "deadline" || v === "progress" || v === "created") {
                setSort(v);
              }
            }}
            className="h-8 w-auto text-xs"
          >
            <option value="deadline">{SORT_LABEL.deadline}</option>
            <option value="progress">{SORT_LABEL.progress}</option>
            <option value="created">{SORT_LABEL.created}</option>
          </Select>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setEditingId(null);
            setShowForm((s) => !s);
          }}
        >
          {showForm ? <X className="size-4" /> : <Plus className="size-4" />}
          {showForm ? "Đóng" : "Thêm mục tiêu"}
        </Button>
      </div>

      {showForm ? (
        <GoalForm
          mode="create"
          onCancel={() => setShowForm(false)}
          onSubmit={handleAdd}
        />
      ) : null}

      {sortedGoals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Target className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Bạn chưa có mục tiêu cá nhân nào. Hãy bấm{" "}
              <strong>Thêm mục tiêu</strong> để bắt đầu.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedGoals.map((g) =>
            editingId === g.id ? (
              <GoalForm
                key={g.id}
                mode="edit"
                initial={g}
                onCancel={() => setEditingId(null)}
                onSubmit={(input) => handleSaveEdit(g.id, input)}
              />
            ) : (
              <GoalCard
                key={g.id}
                goal={g}
                onEdit={() => {
                  setShowForm(false);
                  setEditingId(g.id);
                }}
                onDelete={() => handleDelete(g.id)}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: "primary" | "emerald" | "amber";
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            tone === "primary" && "bg-primary/10 text-primary",
            tone === "emerald" &&
              "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
            tone === "amber" &&
              "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="text-2xl font-semibold tabular-nums">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

type GoalFormInput = {
  title: string;
  type: GoalType;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: string;
  notes: string;
};

function GoalForm({
  mode,
  initial,
  onSubmit,
  onCancel,
}: {
  mode: "create" | "edit";
  initial?: Goal;
  onSubmit: (input: GoalFormInput) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [type, setType] = useState<GoalType>(initial?.type ?? "hours");
  const [targetValue, setTargetValue] = useState<string>(
    initial ? String(initial.targetValue) : "",
  );
  const [currentValue, setCurrentValue] = useState<string>(
    initial ? String(initial.currentValue) : "0",
  );
  const [unit, setUnit] = useState<string>(
    initial?.unit ?? TYPE_DEFAULT_UNIT.hours,
  );
  const [deadline, setDeadline] = useState<string>(
    initial?.deadline ?? todayIso(),
  );
  const [notes, setNotes] = useState<string>(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const handleTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    if (
      v === "hours" ||
      v === "shifts" ||
      v === "income" ||
      v === "skill" ||
      v === "custom"
    ) {
      setType(v);
      // auto-fill unit if empty or matches a default
      const defaultsList = Object.values(TYPE_DEFAULT_UNIT);
      if (unit === "" || defaultsList.includes(unit)) {
        setUnit(TYPE_DEFAULT_UNIT[v]);
      }
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (trimmedTitle === "") {
      setError("Tiêu đề không được để trống.");
      return;
    }
    const target = Number(targetValue);
    if (!Number.isFinite(target) || target <= 0) {
      setError("Giá trị mục tiêu phải lớn hơn 0.");
      return;
    }
    const current = Number(currentValue);
    if (!Number.isFinite(current) || current < 0) {
      setError("Giá trị hiện tại phải >= 0.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
      setError("Hạn chót không hợp lệ.");
      return;
    }
    setError(null);
    onSubmit({
      title: trimmedTitle,
      type,
      targetValue: target,
      currentValue: current,
      unit: unit.trim() === "" ? TYPE_DEFAULT_UNIT[type] : unit.trim(),
      deadline,
      notes: notes.trim(),
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {mode === "create" ? "Thêm mục tiêu mới" : "Sửa mục tiêu"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="goal-title" className="mb-1 block text-xs">
              Tiêu đề
            </Label>
            <Input
              id="goal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Đạt 80 giờ làm trong tháng"
              maxLength={120}
            />
          </div>

          <div>
            <Label htmlFor="goal-type" className="mb-1 block text-xs">
              Loại
            </Label>
            <Select id="goal-type" value={type} onChange={handleTypeChange}>
              <option value="hours">{TYPE_LABEL.hours}</option>
              <option value="shifts">{TYPE_LABEL.shifts}</option>
              <option value="income">{TYPE_LABEL.income}</option>
              <option value="skill">{TYPE_LABEL.skill}</option>
              <option value="custom">{TYPE_LABEL.custom}</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="goal-unit" className="mb-1 block text-xs">
              Đơn vị
            </Label>
            <Input
              id="goal-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="giờ / ca / VND / ★"
              maxLength={20}
            />
          </div>

          <div>
            <Label htmlFor="goal-target" className="mb-1 block text-xs">
              Giá trị mục tiêu
            </Label>
            <Input
              id="goal-target"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder="VD: 80"
            />
          </div>

          <div>
            <Label htmlFor="goal-current" className="mb-1 block text-xs">
              Giá trị hiện tại
            </Label>
            <Input
              id="goal-current"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="goal-deadline" className="mb-1 block text-xs">
              Hạn chót
            </Label>
            <Input
              id="goal-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="goal-notes" className="mb-1 block text-xs">
              Ghi chú
            </Label>
            <Input
              id="goal-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tuỳ chọn — nhắc nhở, lý do, kế hoạch…"
              maxLength={240}
            />
          </div>

          {error ? (
            <div className="sm:col-span-2 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-700/50 dark:bg-rose-950/40 dark:text-rose-200">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Huỷ
            </Button>
            <Button type="submit" size="sm">
              {mode === "create" ? "Tạo mục tiêu" : "Lưu thay đổi"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function GoalCard({
  goal,
  onEdit,
  onDelete,
}: {
  goal: Goal;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [stepInput, setStepInput] = useState<string>("");
  const pct = progressPct(goal);
  const days = daysUntil(goal.deadline);
  const isHoursOrShifts = goal.type === "hours" || goal.type === "shifts";

  const handleStep = (sign: 1 | -1) => {
    const n = Number(stepInput);
    const delta = Number.isFinite(n) && n !== 0 ? n : 1;
    adjustProgress(goal.id, sign * Math.abs(delta));
  };

  const handleReset = () => {
    if (typeof window === "undefined") return;
    const ok = window.confirm("Đặt lại tiến độ về 0?");
    if (!ok) return;
    updateGoal(goal.id, { currentValue: 0, completed: false });
  };

  const barTone =
    pct < 25
      ? "bg-rose-500"
      : pct <= 75
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <Card className={cn(goal.completed && "opacity-70")}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <TypeIcon name={TYPE_ICON[goal.type]} className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle
              className={cn(
                "text-base",
                goal.completed && "line-through decoration-2",
              )}
            >
              {goal.title}
            </CardTitle>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {TYPE_LABEL[goal.type]}
              </span>
              <DeadlineChip days={days} completed={goal.completed} />
              <span className="text-[11px] text-muted-foreground">
                Hạn {formatIsoDate(goal.deadline)}
              </span>
            </div>
          </div>
          {goal.completed ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">
              <CheckCircle2 className="size-3" />
              Hoàn thành
            </span>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div>
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="font-medium tabular-nums">
              {formatNumber(goal.currentValue)} / {formatNumber(goal.targetValue)}{" "}
              {goal.unit}
            </span>
            <span className="text-muted-foreground tabular-nums">{pct}%</span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={cn("h-full rounded-full transition-all", barTone)}
              style={{ width: `${pct}%` }}
            />
          </div>
          {!goal.completed ? (
            <input
              type="range"
              min={0}
              max={100}
              value={pct}
              onChange={(e) => {
                const newPct = Number(e.target.value);
                if (!Number.isFinite(newPct)) return;
                const newValue = (newPct / 100) * goal.targetValue;
                updateGoal(goal.id, {
                  currentValue: Math.max(0, newValue),
                  completed: newPct >= 100,
                });
              }}
              className="mt-2 w-full accent-primary"
              aria-label="Điều chỉnh tiến độ"
            />
          ) : null}
        </div>

        {goal.notes.trim() !== "" ? (
          <div className="rounded-lg border border-dashed bg-background p-2 text-xs">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Ghi chú
            </span>
            <p className="mt-0.5 whitespace-pre-wrap text-foreground">
              {goal.notes}
            </p>
          </div>
        ) : null}

        {!goal.completed ? (
          <div className="flex flex-wrap items-center gap-2">
            {isHoursOrShifts ? (
              <>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={stepInput}
                  onChange={(e) => setStepInput(e.target.value)}
                  placeholder="1"
                  className="h-8 w-20 text-sm"
                  aria-label="Bước tăng/giảm"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleStep(1)}
                >
                  <Plus className="size-4" />
                  Tăng
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleStep(-1)}
                >
                  <Minus className="size-4" />
                  Giảm
                </Button>
              </>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleReset}
            >
              <RotateCcw className="size-4" />
              Đặt lại
            </Button>
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button type="button" size="sm" variant="outline" onClick={onEdit}>
            <Pencil className="size-4" />
            Sửa
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => toggleCompleted(goal.id)}
          >
            <CheckCircle2 className="size-4" />
            {goal.completed ? "Bỏ hoàn thành" : "Hoàn thành"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
            Xoá
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DeadlineChip({
  days,
  completed,
}: {
  days: number;
  completed: boolean;
}) {
  if (completed) {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">
        Đã hoàn thành
      </span>
    );
  }
  if (!Number.isFinite(days)) {
    return (
      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
        Không hạn
      </span>
    );
  }
  if (days < 0) {
    return (
      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800 dark:bg-rose-500/15 dark:text-rose-200">
        Quá hạn {Math.abs(days)} ngày
      </span>
    );
  }
  if (days === 0) {
    return (
      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800 dark:bg-rose-500/15 dark:text-rose-200">
        Hạn hôm nay
      </span>
    );
  }
  if (days <= 3) {
    return (
      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800 dark:bg-rose-500/15 dark:text-rose-200">
        Còn {days} ngày
      </span>
    );
  }
  if (days <= 14) {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
        Còn {days} ngày
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">
      Còn {days} ngày
    </span>
  );
}
