"use client";

import * as React from "react";
import { toast } from "sonner";
import { LayoutTemplate, Loader2, Save, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { applyShiftTemplate } from "./template-actions";

type ShiftType = "morning" | "afternoon" | "evening";

type ShiftLite = {
  id: number;
  employeeId: number;
  shiftDate: Date;
  shiftType: ShiftType | null;
  startTime: string | null;
  endTime: string | null;
};

type Employee = { id: number; name: string; role: string };

type TemplateEntry = {
  employeeId: number;
  dayOfWeek: number; // 0=Mon..6=Sun
  shiftType: ShiftType;
};

type TemplateData = {
  entries: TemplateEntry[];
  createdAt: string; // ISO
};

type TemplateMap = Record<string, TemplateData>;

const STORAGE_KEY = "cafe-hr-shift-templates";

const TYPE_LABEL: Record<ShiftType, string> = {
  morning: "Sáng",
  afternoon: "Chiều",
  evening: "Tối",
};

const DAY_LABEL = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function isShiftType(v: unknown): v is ShiftType {
  return v === "morning" || v === "afternoon" || v === "evening";
}

function isTemplateEntry(v: unknown): v is TemplateEntry {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.employeeId === "number" &&
    Number.isInteger(o.employeeId) &&
    o.employeeId > 0 &&
    typeof o.dayOfWeek === "number" &&
    Number.isInteger(o.dayOfWeek) &&
    o.dayOfWeek >= 0 &&
    o.dayOfWeek <= 6 &&
    isShiftType(o.shiftType)
  );
}

function readTemplates(): TemplateMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: TemplateMap = {};
    for (const [name, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== "object") continue;
      const v = value as Record<string, unknown>;
      const entriesRaw = v.entries;
      const createdAt = typeof v.createdAt === "string" ? v.createdAt : null;
      if (!Array.isArray(entriesRaw) || !createdAt) continue;
      const entries = entriesRaw.filter(isTemplateEntry);
      if (entries.length === 0) continue;
      out[name] = { entries, createdAt };
    }
    return out;
  } catch {
    return {};
  }
}

function writeTemplates(map: TemplateMap): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

/** Monday=0 ... Sunday=6 */
function dayOfWeekMonFirst(d: Date): number {
  const js = d.getDay(); // 0=Sun..6=Sat
  return js === 0 ? 6 : js - 1;
}

function shiftsToEntries(shifts: ShiftLite[]): TemplateEntry[] {
  const seen = new Set<string>();
  const out: TemplateEntry[] = [];
  for (const s of shifts) {
    if (!isShiftType(s.shiftType)) continue;
    const dow = dayOfWeekMonFirst(new Date(s.shiftDate));
    const key = `${s.employeeId}__${dow}__${s.shiftType}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      employeeId: s.employeeId,
      dayOfWeek: dow,
      shiftType: s.shiftType,
    });
  }
  return out;
}

function formatCreatedAt(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return iso;
  }
}

export function TemplateManagerDialog({
  shifts,
  employees,
  weekStartIso,
  isAdmin,
}: {
  shifts: ShiftLite[];
  employees: Employee[];
  weekStartIso: string;
  isAdmin: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<"save" | "apply">("save");
  const [name, setName] = React.useState("");
  const [templates, setTemplates] = React.useState<TemplateMap>({});
  const [pendingApply, startApply] = React.useTransition();
  const [applyingName, setApplyingName] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) setTemplates(readTemplates());
  }, [open]);

  const empName = React.useMemo(() => {
    const m = new Map<number, string>();
    for (const e of employees) m.set(e.id, e.name);
    return m;
  }, [employees]);

  const previewEntries = React.useMemo(
    () => shiftsToEntries(shifts),
    [shifts],
  );

  // Group preview by day-of-week + shift type
  const previewGrouped = React.useMemo(() => {
    const groups = new Map<string, TemplateEntry[]>();
    for (const e of previewEntries) {
      const k = `${e.dayOfWeek}__${e.shiftType}`;
      const arr = groups.get(k) ?? [];
      arr.push(e);
      groups.set(k, arr);
    }
    // Sort: by day, then morning/afternoon/evening order
    const order: ShiftType[] = ["morning", "afternoon", "evening"];
    return Array.from(groups.entries())
      .map(([k, list]) => {
        const [dowStr, type] = k.split("__");
        return {
          key: k,
          dayOfWeek: Number(dowStr),
          shiftType: type as ShiftType,
          entries: list,
        };
      })
      .sort(
        (a, b) =>
          a.dayOfWeek - b.dayOfWeek ||
          order.indexOf(a.shiftType) - order.indexOf(b.shiftType),
      );
  }, [previewEntries]);

  if (!isAdmin) return null;

  const trimmedName = name.trim();
  const canSave =
    previewEntries.length > 0 &&
    trimmedName.length >= 1 &&
    trimmedName.length <= 50;

  const handleSave = () => {
    if (!canSave) return;
    const next: TemplateMap = {
      ...templates,
      [trimmedName]: {
        entries: previewEntries,
        createdAt: new Date().toISOString(),
      },
    };
    writeTemplates(next);
    setTemplates(next);
    setName("");
    toast.success(`Đã lưu template "${trimmedName}" (${previewEntries.length} ca)`);
  };

  const handleDelete = (templateName: string) => {
    if (!confirm(`Xoá template "${templateName}"?`)) return;
    const next = { ...templates };
    delete next[templateName];
    writeTemplates(next);
    setTemplates(next);
    toast.success(`Đã xoá template "${templateName}"`);
  };

  const handleApply = (templateName: string) => {
    const t = templates[templateName];
    if (!t) return;
    setApplyingName(templateName);
    startApply(async () => {
      const res = await applyShiftTemplate(
        { entries: t.entries },
        weekStartIso,
      );
      setApplyingName(null);
      if (res.ok) {
        toast.success(
          `Đã áp dụng ${res.applied} ca, bỏ qua ${res.skipped} ca trùng`,
        );
        setOpen(false);
      } else {
        toast.error(res.error || "Không áp dụng được template");
      }
    });
  };

  const sortedTemplateNames = Object.keys(templates).sort((a, b) =>
    a.localeCompare(b, "vi"),
  );

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        title="Quản lý template ca"
      >
        <LayoutTemplate className="size-4" />
        Templates
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Template lịch ca</DialogTitle>
            <DialogDescription>
              Lưu lịch tuần hiện tại làm mẫu, hoặc áp dụng mẫu đã lưu vào tuần
              này.
            </DialogDescription>
          </DialogHeader>

          <div className="mb-4 flex gap-1 rounded-md border bg-muted/40 p-1 text-sm">
            <button
              type="button"
              onClick={() => setTab("save")}
              className={`flex-1 rounded px-3 py-1.5 transition-colors ${
                tab === "save"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Lưu
            </button>
            <button
              type="button"
              onClick={() => setTab("apply")}
              className={`flex-1 rounded px-3 py-1.5 transition-colors ${
                tab === "apply"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Áp dụng
            </button>
          </div>

          {tab === "save" ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="tpl-name">Tên template</Label>
                <Input
                  id="tpl-name"
                  placeholder="VD: Lịch tuần thường"
                  maxLength={50}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  1–50 ký tự. Trùng tên sẽ ghi đè template cũ.
                </p>
              </div>

              <div className="rounded-md border bg-muted/30 p-3">
                <div className="mb-2 text-xs font-medium text-muted-foreground">
                  Sẽ lưu {previewEntries.length} ca từ tuần hiện tại
                </div>
                {previewGrouped.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Tuần này chưa có ca nào để lưu.
                  </p>
                ) : (
                  <ul className="max-h-56 space-y-1 overflow-y-auto text-xs">
                    {previewGrouped.map((g) => (
                      <li key={g.key} className="flex flex-wrap gap-1.5">
                        <span className="rounded bg-background px-1.5 py-0.5 font-medium">
                          {DAY_LABEL[g.dayOfWeek]} · {TYPE_LABEL[g.shiftType]}
                        </span>
                        <span className="text-muted-foreground">
                          {g.entries
                            .map(
                              (e) =>
                                empName.get(e.employeeId) ?? `#${e.employeeId}`,
                            )
                            .join(", ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                >
                  Đóng
                </Button>
                <Button type="button" onClick={handleSave} disabled={!canSave}>
                  <Save className="size-4" />
                  Lưu template
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedTemplateNames.length === 0 ? (
                <div className="rounded-md border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                  Chưa có template nào — chuyển sang tab “Lưu” để tạo template
                  đầu tiên.
                </div>
              ) : (
                <ul className="max-h-80 space-y-2 overflow-y-auto">
                  {sortedTemplateNames.map((tn) => {
                    const t = templates[tn];
                    const isThisPending =
                      pendingApply && applyingName === tn;
                    return (
                      <li
                        key={tn}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            {tn}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t.entries.length} ca · tạo{" "}
                            {formatCreatedAt(t.createdAt)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleApply(tn)}
                            disabled={pendingApply}
                          >
                            {isThisPending ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Sparkles className="size-4" />
                            )}
                            Áp dụng vào tuần này
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(tn)}
                            disabled={pendingApply}
                            title="Xoá template"
                            aria-label="Xoá template"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                >
                  Đóng
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
