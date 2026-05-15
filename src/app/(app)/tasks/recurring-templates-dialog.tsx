"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Plus, Repeat, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  loadTaskTemplates,
  matchesToday,
  removeTaskTemplate,
  saveTaskTemplate,
  STORAGE_KEY,
  type Recurrence,
  type TaskPriorityValue,
  type TaskTemplate,
} from "@/lib/recurring-task-templates";
import { bulkCreateTasksFromTemplates } from "./actions";

type Employee = { id: number; name: string };

const PRIORITY_LABELS: Record<TaskPriorityValue, string> = {
  low: "Thấp",
  normal: "Bình thường",
  high: "Cao",
  urgent: "Khẩn",
};

const PRIORITY_BADGE: Record<TaskPriorityValue, string> = {
  low: "bg-secondary text-secondary-foreground",
  normal: "bg-primary/10 text-primary",
  high: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  urgent:
    "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

const WEEKDAY_LABELS = [
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
  "Chủ nhật",
];

function recurrenceLabel(r: Recurrence): string {
  if (r.kind === "daily") return "Mỗi ngày";
  if (r.kind === "weekly") return `Mỗi ${WEEKDAY_LABELS[r.weekday].toLowerCase()}`;
  return `Mỗi tháng ngày ${r.dayOfMonth}`;
}

type RecurrenceKind = "daily" | "weekly" | "monthly";

function makeId(): string {
  // Crypto.randomUUID is widely available in modern browsers; fallback otherwise.
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `tpl-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export function RecurringTemplatesDialog({
  employees,
  isAdmin,
}: {
  employees: Employee[];
  isAdmin: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [templates, setTemplates] = React.useState<TaskTemplate[]>([]);
  const [pending, startTransition] = React.useTransition();

  // Form state
  const [title, setTitle] = React.useState("");
  const [priority, setPriority] = React.useState<TaskPriorityValue>("normal");
  const [assigneeId, setAssigneeId] = React.useState<string>("");
  const [recurrenceKind, setRecurrenceKind] =
    React.useState<RecurrenceKind>("daily");
  const [weekday, setWeekday] = React.useState<number>(0);
  const [dayOfMonth, setDayOfMonth] = React.useState<number>(1);

  React.useEffect(() => {
    if (!open) return;
    setTemplates(loadTaskTemplates());
  }, [open]);

  React.useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      setTemplates(loadTaskTemplates());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const empName = React.useMemo(() => {
    const m = new Map<number, string>();
    for (const e of employees) m.set(e.id, e.name);
    return m;
  }, [employees]);

  if (!isAdmin) return null;

  const trimmedTitle = title.trim();
  const canSave =
    trimmedTitle.length >= 1 &&
    trimmedTitle.length <= 120 &&
    assigneeId !== "" &&
    templates.length < 20 &&
    (recurrenceKind !== "monthly" ||
      (Number.isInteger(dayOfMonth) && dayOfMonth >= 1 && dayOfMonth <= 31));

  function buildRecurrence(): Recurrence {
    if (recurrenceKind === "daily") return { kind: "daily" };
    if (recurrenceKind === "weekly") {
      const w = weekday as 0 | 1 | 2 | 3 | 4 | 5 | 6;
      return { kind: "weekly", weekday: w };
    }
    return { kind: "monthly", dayOfMonth };
  }

  function handleSave() {
    if (!canSave) return;
    const tpl: TaskTemplate = {
      id: makeId(),
      title: trimmedTitle,
      priority,
      assigneeId: assigneeId === "" ? null : Number(assigneeId),
      recurrence: buildRecurrence(),
      createdAt: Date.now(),
    };
    const next = saveTaskTemplate(tpl);
    setTemplates(next);
    setTitle("");
    setPriority("normal");
    setAssigneeId("");
    setRecurrenceKind("daily");
    setWeekday(0);
    setDayOfMonth(1);
    toast.success("Đã lưu mẫu việc định kỳ");
  }

  function handleDelete(id: string) {
    if (!confirm("Xoá mẫu này?")) return;
    const next = removeTaskTemplate(id);
    setTemplates(next);
    toast.success("Đã xoá mẫu");
  }

  function handleMaterialize() {
    const matched = templates.filter((t) =>
      matchesToday(t.recurrence, new Date()),
    );
    if (matched.length === 0) {
      toast.info("Không có mẫu nào khớp hôm nay");
      return;
    }
    const payload = matched
      .filter((t) => typeof t.assigneeId === "number")
      .map((t) => ({
        title: t.title,
        priority: t.priority,
        assigneeId: t.assigneeId,
      }));
    if (payload.length === 0) {
      toast.error("Các mẫu khớp hôm nay chưa gán nhân viên");
      return;
    }
    startTransition(async () => {
      const res = await bulkCreateTasksFromTemplates(payload);
      if (!res.ok) {
        toast.error(res.error || "Không tạo được");
        return;
      }
      const skipped = payload.length - res.created;
      toast.success(
        `Đã tạo ${res.created} việc${
          skipped > 0 ? ` · bỏ qua ${skipped} (đã có)` : ""
        }`,
      );
      setOpen(false);
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        title="Mẫu việc định kỳ"
      >
        <Repeat className="size-4" />
        Việc định kỳ
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          onClose={() => setOpen(false)}
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle>Mẫu việc định kỳ</DialogTitle>
            <DialogDescription>
              Định nghĩa các việc lặp lại theo lịch (ngày / tuần / tháng) và
              nhanh chóng tạo việc cho hôm nay.
            </DialogDescription>
          </DialogHeader>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">
              Mẫu của tôi ({templates.length}/20)
            </h3>
            {templates.length === 0 ? (
              <div className="rounded-md border border-dashed bg-muted/20 p-4 text-center text-sm text-muted-foreground">
                Chưa có mẫu nào — thêm mẫu mới bên dưới.
              </div>
            ) : (
              <ul className="space-y-2">
                {templates.map((t) => (
                  <li
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {t.title}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIORITY_BADGE[t.priority]}`}
                        >
                          {PRIORITY_LABELS[t.priority]}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {recurrenceLabel(t.recurrence)} ·{" "}
                        {t.assigneeId === null
                          ? "Chưa gán"
                          : (empName.get(t.assigneeId) ?? `#${t.assigneeId}`)}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(t.id)}
                      title="Xoá mẫu"
                      aria-label="Xoá mẫu"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-6 space-y-3 rounded-md border bg-muted/20 p-4">
            <h3 className="text-sm font-semibold">Thêm mẫu mới</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="tpl-title">Tiêu đề *</Label>
                <Input
                  id="tpl-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  placeholder="VD: Vệ sinh máy pha"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tpl-priority">Mức độ</Label>
                <Select
                  id="tpl-priority"
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value as TaskPriorityValue)
                  }
                >
                  <option value="low">Thấp</option>
                  <option value="normal">Bình thường</option>
                  <option value="high">Cao</option>
                  <option value="urgent">Khẩn</option>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="tpl-assignee">Giao cho *</Label>
                <Select
                  id="tpl-assignee"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                >
                  <option value="">— Chọn —</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Lặp lại</Label>
                <div className="flex flex-wrap gap-3 text-sm">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="recur-kind"
                      value="daily"
                      checked={recurrenceKind === "daily"}
                      onChange={() => setRecurrenceKind("daily")}
                    />
                    Mỗi ngày
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="recur-kind"
                      value="weekly"
                      checked={recurrenceKind === "weekly"}
                      onChange={() => setRecurrenceKind("weekly")}
                    />
                    Hàng tuần
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="recur-kind"
                      value="monthly"
                      checked={recurrenceKind === "monthly"}
                      onChange={() => setRecurrenceKind("monthly")}
                    />
                    Hàng tháng
                  </label>
                </div>
              </div>
              {recurrenceKind === "weekly" && (
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="tpl-weekday">Vào thứ</Label>
                  <Select
                    id="tpl-weekday"
                    value={String(weekday)}
                    onChange={(e) => setWeekday(Number(e.target.value))}
                  >
                    {WEEKDAY_LABELS.map((label, idx) => (
                      <option key={idx} value={idx}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              {recurrenceKind === "monthly" && (
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="tpl-dom">Ngày trong tháng (1-31)</Label>
                  <Input
                    id="tpl-dom"
                    type="number"
                    min={1}
                    max={31}
                    value={dayOfMonth}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isFinite(n))
                        setDayOfMonth(Math.max(1, Math.min(31, Math.floor(n))));
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Ngày &gt; số ngày trong tháng sẽ tự lùi về ngày cuối tháng.
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                size="sm"
              >
                {templates.length >= 20 ? (
                  <>Đã đạt giới hạn 20 mẫu</>
                ) : (
                  <>
                    <Plus className="size-4" />
                    Lưu mẫu
                  </>
                )}
              </Button>
            </div>
          </section>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t pt-4">
            <p className="text-xs text-muted-foreground">
              {templates.filter((t) => matchesToday(t.recurrence)).length} mẫu
              khớp hôm nay
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
              >
                Đóng
              </Button>
              <Button
                type="button"
                onClick={handleMaterialize}
                disabled={pending || templates.length === 0}
                size="sm"
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Tạo việc cho hôm nay
              </Button>
            </div>
          </div>

        </DialogContent>
      </Dialog>
    </>
  );
}
