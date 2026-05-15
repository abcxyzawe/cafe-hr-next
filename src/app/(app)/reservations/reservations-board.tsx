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
  Check,
  Clock,
  Download,
  Pencil,
  Phone,
  Plus,
  StickyNote,
  Trash2,
  Users,
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  RESERVATIONS_EVENT,
  STORAGE_KEY,
  addReservation,
  deleteReservation,
  getReservations,
  toggleArrived,
  updateReservation,
  type Reservation,
  type ReservationInput,
} from "@/lib/reservations-state";

type FilterKey = "upcoming" | "today" | "all";

const FILTERS: ReadonlyArray<{ key: FilterKey; label: string }> = [
  { key: "upcoming", label: "Sắp tới" },
  { key: "today", label: "Hôm nay" },
  { key: "all", label: "Tất cả" },
];

type DraftFields = {
  name: string;
  phone: string;
  datetime: string;
  partySize: string;
  notes: string;
};

const EMPTY_DRAFT: DraftFields = {
  name: "",
  phone: "",
  datetime: "",
  partySize: "2",
  notes: "",
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toLocalInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

function suggestedDefaultDatetime(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return toLocalInputValue(d);
}

function isoToLocalInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return toLocalInputValue(d);
}

function localInputValueToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  const dd = pad2(d.getDate());
  const mo = pad2(d.getMonth() + 1);
  return `${hh}:${mm} • ${dd}/${mo}/${d.getFullYear()}`;
}

function relativeFromNow(iso: string, now: Date): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffMs = d.getTime() - now.getTime();
  const past = diffMs < 0;
  const abs = Math.abs(diffMs);
  const mins = Math.round(abs / 60000);
  if (mins < 1) return past ? "vừa xong" : "ngay bây giờ";
  if (mins < 60) return past ? `${mins} phút trước` : `trong ${mins} phút`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return past ? `${hours} giờ trước` : `trong ${hours} giờ`;
  const days = Math.round(hours / 24);
  return past ? `${days} ngày trước` : `trong ${days} ngày`;
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildCsv(rows: Reservation[]): string {
  const header = [
    "id",
    "name",
    "phone",
    "datetime",
    "partySize",
    "notes",
    "arrived",
    "createdAt",
  ];
  const lines: string[] = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        csvEscape(r.id),
        csvEscape(r.name),
        csvEscape(r.phone),
        csvEscape(r.datetime),
        String(r.partySize),
        csvEscape(r.notes),
        r.arrived ? "1" : "0",
        csvEscape(r.createdAt),
      ].join(","),
    );
  }
  return lines.join("\r\n");
}

function downloadCsv(content: string, filename: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([`\uFEFF${content}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function parseDraftToInput(draft: DraftFields): ReservationInput | null {
  const name = draft.name.trim();
  if (!name) return null;
  const iso = localInputValueToIso(draft.datetime);
  if (!iso) return null;
  const partySize = Number(draft.partySize);
  if (!Number.isFinite(partySize) || partySize < 1) return null;
  return {
    name,
    phone: draft.phone.trim(),
    datetime: iso,
    partySize: Math.round(partySize),
    notes: draft.notes.trim(),
  };
}

export function ReservationsBoard() {
  const [list, setList] = useState<Reservation[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("upcoming");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addDraft, setAddDraft] = useState<DraftFields>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftFields>(EMPTY_DRAFT);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    setList(getReservations());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const reread = () => setList(getReservations());
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STORAGE_KEY) reread();
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<{ key?: string }>).detail;
      if (!detail || !detail.key || detail.key === STORAGE_KEY) reread();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(RESERVATIONS_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(RESERVATIONS_EVENT, onCustom);
    };
  }, [hydrated]);

  // refresh "now" once a minute so relative labels stay accurate
  useEffect(() => {
    if (!hydrated) return;
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, [hydrated]);

  const sorted = useMemo(() => {
    return [...list].sort((a, b) => {
      if (a.datetime < b.datetime) return -1;
      if (a.datetime > b.datetime) return 1;
      return 0;
    });
  }, [list]);

  const stats = useMemo(() => {
    const dayStart = startOfDay(now);
    const dayEnd = endOfDay(now);
    let upcoming = 0;
    let today = 0;
    for (const r of sorted) {
      const d = new Date(r.datetime);
      if (Number.isNaN(d.getTime())) continue;
      if (d.getTime() >= now.getTime() && !r.arrived) upcoming += 1;
      if (d.getTime() >= dayStart.getTime() && d.getTime() <= dayEnd.getTime())
        today += 1;
    }
    return { upcoming, today };
  }, [sorted, now]);

  const filtered = useMemo(() => {
    if (filter === "all") return sorted;
    if (filter === "today") {
      const dayStart = startOfDay(now).getTime();
      const dayEnd = endOfDay(now).getTime();
      return sorted.filter((r) => {
        const t = new Date(r.datetime).getTime();
        return Number.isFinite(t) && t >= dayStart && t <= dayEnd;
      });
    }
    // upcoming = next 24h, not yet arrived
    const horizon = now.getTime() + 24 * 60 * 60 * 1000;
    return sorted.filter((r) => {
      if (r.arrived) return false;
      const t = new Date(r.datetime).getTime();
      return Number.isFinite(t) && t >= now.getTime() && t <= horizon;
    });
  }, [sorted, filter, now]);

  const handleOpenAdd = useCallback(() => {
    setAddDraft({ ...EMPTY_DRAFT, datetime: suggestedDefaultDatetime() });
    setShowAddForm(true);
  }, []);

  const handleCancelAdd = useCallback(() => {
    setShowAddForm(false);
    setAddDraft(EMPTY_DRAFT);
  }, []);

  const handleSubmitAdd = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const input = parseDraftToInput(addDraft);
      if (!input) return;
      addReservation(input);
      setShowAddForm(false);
      setAddDraft(EMPTY_DRAFT);
    },
    [addDraft],
  );

  const handleStartEdit = useCallback((r: Reservation) => {
    setEditingId(r.id);
    setEditDraft({
      name: r.name,
      phone: r.phone,
      datetime: isoToLocalInputValue(r.datetime),
      partySize: String(r.partySize),
      notes: r.notes,
    });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditDraft(EMPTY_DRAFT);
  }, []);

  const handleSubmitEdit = useCallback(
    (e: FormEvent<HTMLFormElement>, id: string) => {
      e.preventDefault();
      const input = parseDraftToInput(editDraft);
      if (!input) return;
      updateReservation(id, input);
      setEditingId(null);
      setEditDraft(EMPTY_DRAFT);
    },
    [editDraft],
  );

  const handleDelete = useCallback((r: Reservation) => {
    if (typeof window === "undefined") return;
    const ok = window.confirm(
      `Xoá đặt bàn của "${r.name}" (${formatDateTime(r.datetime)})?`,
    );
    if (!ok) return;
    deleteReservation(r.id);
  }, []);

  const handleToggleArrived = useCallback((id: string) => {
    toggleArrived(id);
  }, []);

  const handleExport = useCallback(() => {
    const csv = buildCsv(sorted);
    const today = new Date();
    const stamp = `${today.getFullYear()}${pad2(today.getMonth() + 1)}${pad2(today.getDate())}`;
    downloadCsv(csv, `reservations-${stamp}.csv`);
  }, [sorted]);

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={sorted.length === 0}
          >
            <Download className="size-4" />
            Xuất CSV
          </Button>
          {!showAddForm ? (
            <Button type="button" size="sm" onClick={handleOpenAdd}>
              <Plus className="size-4" />
              Thêm đặt bàn
            </Button>
          ) : null}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          label="Sắp tới (chưa tới)"
          value={stats.upcoming}
          tone="primary"
        />
        <StatCard label="Trong hôm nay" value={stats.today} tone="accent" />
      </div>

      {/* Add form */}
      {showAddForm ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Thêm đặt bàn mới</CardTitle>
          </CardHeader>
          <CardContent>
            <ReservationForm
              draft={addDraft}
              onChange={setAddDraft}
              onSubmit={handleSubmitAdd}
              onCancel={handleCancelAdd}
              submitLabel="Lưu đặt bàn"
            />
          </CardContent>
        </Card>
      ) : null}

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {sorted.length === 0
              ? "Chưa có đặt bàn nào. Bấm \"Thêm đặt bàn\" để bắt đầu."
              : "Không có đặt bàn phù hợp với bộ lọc đang chọn."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const isEditing = editingId === r.id;
            return (
              <ReservationRow
                key={r.id}
                reservation={r}
                now={now}
                isEditing={isEditing}
                editDraft={editDraft}
                onEditDraftChange={setEditDraft}
                onStartEdit={handleStartEdit}
                onCancelEdit={handleCancelEdit}
                onSubmitEdit={handleSubmitEdit}
                onDelete={handleDelete}
                onToggleArrived={handleToggleArrived}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "primary" | "accent";
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-xl border bg-card px-4 py-3 shadow-sm",
        tone === "primary" && "bg-gradient-to-br from-primary/10 to-card",
        tone === "accent" && "bg-gradient-to-br from-accent/40 to-card",
      )}
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
    </div>
  );
}

type ReservationRowProps = {
  reservation: Reservation;
  now: Date;
  isEditing: boolean;
  editDraft: DraftFields;
  onEditDraftChange: (draft: DraftFields) => void;
  onStartEdit: (r: Reservation) => void;
  onCancelEdit: () => void;
  onSubmitEdit: (e: FormEvent<HTMLFormElement>, id: string) => void;
  onDelete: (r: Reservation) => void;
  onToggleArrived: (id: string) => void;
};

function ReservationRow({
  reservation: r,
  now,
  isEditing,
  editDraft,
  onEditDraftChange,
  onStartEdit,
  onCancelEdit,
  onSubmitEdit,
  onDelete,
  onToggleArrived,
}: ReservationRowProps) {
  const dt = new Date(r.datetime);
  const isPast = !Number.isNaN(dt.getTime()) && dt.getTime() < now.getTime();
  const dimmed = (isPast && !r.arrived) || r.arrived;

  if (isEditing) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sửa đặt bàn</CardTitle>
        </CardHeader>
        <CardContent>
          <ReservationForm
            draft={editDraft}
            onChange={onEditDraftChange}
            onSubmit={(e) => onSubmitEdit(e, r.id)}
            onCancel={onCancelEdit}
            submitLabel="Cập nhật"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(dimmed && "opacity-60")}>
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              <Clock className="size-3.5" />
              {formatDateTime(r.datetime)}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {relativeFromNow(r.datetime, now)}
            </span>
            {r.arrived ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">
                <Check className="size-3" />
                Đã tới
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-base font-semibold">{r.name}</span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="size-3.5" />
              {r.partySize} người
            </span>
            {r.phone ? (
              <a
                href={`tel:${r.phone}`}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Phone className="size-3.5" />
                {r.phone}
              </a>
            ) : null}
          </div>

          {r.notes ? (
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <StickyNote className="mt-0.5 size-3.5 shrink-0" />
              <span className="whitespace-pre-wrap break-words">{r.notes}</span>
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:flex-col sm:items-stretch">
          <Button
            type="button"
            variant={r.arrived ? "secondary" : "default"}
            size="sm"
            onClick={() => onToggleArrived(r.id)}
          >
            {r.arrived ? <X className="size-4" /> : <Check className="size-4" />}
            {r.arrived ? "Bỏ đã tới" : "Đã tới"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onStartEdit(r)}
          >
            <Pencil className="size-4" />
            Sửa
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onDelete(r)}
          >
            <Trash2 className="size-4" />
            Xoá
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

type ReservationFormProps = {
  draft: DraftFields;
  onChange: (draft: DraftFields) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  submitLabel: string;
};

function ReservationForm({
  draft,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
}: ReservationFormProps) {
  const update = <K extends keyof DraftFields>(
    key: K,
    value: DraftFields[K],
  ): void => {
    onChange({ ...draft, [key]: value });
  };

  const handleText =
    (key: keyof DraftFields) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      update(key, e.target.value);
    };

  const isValid = parseDraftToInput(draft) !== null;

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="rsv-name">Tên khách</Label>
          <Input
            id="rsv-name"
            type="text"
            value={draft.name}
            onChange={handleText("name")}
            placeholder="VD: Anh Minh"
            required
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rsv-phone">Số điện thoại</Label>
          <Input
            id="rsv-phone"
            type="tel"
            value={draft.phone}
            onChange={handleText("phone")}
            placeholder="VD: 0912 345 678"
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rsv-datetime">Thời gian tới</Label>
          <Input
            id="rsv-datetime"
            type="datetime-local"
            value={draft.datetime}
            onChange={handleText("datetime")}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rsv-party">Số người</Label>
          <Input
            id="rsv-party"
            type="number"
            min={1}
            step={1}
            value={draft.partySize}
            onChange={handleText("partySize")}
            required
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rsv-notes">Ghi chú</Label>
        <textarea
          id="rsv-notes"
          value={draft.notes}
          onChange={handleText("notes")}
          rows={2}
          placeholder="VD: ngồi cạnh cửa sổ, có sinh nhật…"
          className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Huỷ
        </Button>
        <Button type="submit" size="sm" disabled={!isValid}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
