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
  CalendarHeart,
  ChevronDown,
  ChevronUp,
  Clock,
  Coffee,
  Copy,
  MapPin,
  Music,
  Pencil,
  Plus,
  Sparkles,
  Tag,
  Trash2,
  Users,
  type LucideIcon,
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
import { Countdown } from "@/components/countdown";
import { cn } from "@/lib/utils";
import {
  CATEGORY_ICON,
  CATEGORY_LABEL,
  CATEGORY_TINT,
  EVENTS_EVENT,
  STORAGE_KEY,
  addEvent,
  formatAnnouncement,
  getEvents,
  removeEvent,
  updateEvent,
  type CafeEvent,
  type EventCategory,
} from "@/lib/events-state";

const CATEGORY_KEYS: ReadonlyArray<EventCategory> = [
  "tasting",
  "workshop",
  "promotion",
  "live-music",
  "holiday",
];

type FilterKey = "all" | EventCategory;

const ICON_MAP: Record<
  "coffee" | "sparkles" | "tag" | "music" | "calendar-heart",
  LucideIcon
> = {
  coffee: Coffee,
  sparkles: Sparkles,
  tag: Tag,
  music: Music,
  "calendar-heart": CalendarHeart,
};

const TINT_BORDER: Record<string, string> = {
  amber: "border-l-amber-500",
  sky: "border-l-sky-500",
  rose: "border-l-rose-500",
  violet: "border-l-violet-500",
  emerald: "border-l-emerald-500",
};

const TINT_BADGE: Record<string, string> = {
  amber:
    "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/30",
  sky: "bg-sky-500/15 text-sky-700 dark:text-sky-300 ring-1 ring-sky-500/30",
  rose: "bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/30",
  violet:
    "bg-violet-500/15 text-violet-700 dark:text-violet-300 ring-1 ring-violet-500/30",
  emerald:
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30",
};

const TINT_ICON: Record<string, string> = {
  amber: "text-amber-600 dark:text-amber-400",
  sky: "text-sky-600 dark:text-sky-400",
  rose: "text-rose-600 dark:text-rose-400",
  violet: "text-violet-600 dark:text-violet-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
};

type DraftFields = {
  title: string;
  category: EventCategory;
  datetime: string;
  location: string;
  description: string;
  capacity: string;
};

const EMPTY_DRAFT: DraftFields = {
  title: "",
  category: "tasting",
  datetime: "",
  location: "Tại quán",
  description: "",
  capacity: "",
};

const DESCRIPTION_MAX = 500;

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
  d.setDate(d.getDate() + 1);
  d.setHours(19);
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

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())} • ${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function formatCountdown(iso: string, now: Date): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diff = d.getTime() - now.getTime();
  if (diff <= 0) return "đang diễn ra";
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `còn ${mins} phút`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `còn ${hours} giờ`;
  const days = Math.round(hours / 24);
  return `còn ${days} ngày`;
}

function parseDraftToInput(
  draft: DraftFields,
): Omit<CafeEvent, "id" | "createdAt"> | null {
  const title = draft.title.trim();
  if (!title) return null;
  const iso = localInputValueToIso(draft.datetime);
  if (!iso) return null;
  const location = draft.location.trim() || "Tại quán";
  const description = draft.description.trim().slice(0, DESCRIPTION_MAX);
  let capacity: number | null = null;
  if (draft.capacity.trim()) {
    const n = Number(draft.capacity);
    if (!Number.isFinite(n) || n < 1) return null;
    capacity = Math.round(n);
  }
  return {
    title,
    category: draft.category,
    datetime: iso,
    location,
    description,
    capacity,
  };
}

export function EventsBoard() {
  const [list, setList] = useState<CafeEvent[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addDraft, setAddDraft] = useState<DraftFields>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftFields>(EMPTY_DRAFT);
  const [now, setNow] = useState<Date>(() => new Date());
  const [pastOpen, setPastOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setList(getEvents());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const reread = () => setList(getEvents());
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STORAGE_KEY) reread();
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<{ key?: string }>).detail;
      if (!detail || !detail.key || detail.key === STORAGE_KEY) reread();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVENTS_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVENTS_EVENT, onCustom);
    };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, [hydrated]);

  const counts = useMemo(() => {
    const result: Record<FilterKey, number> = {
      all: list.length,
      tasting: 0,
      workshop: 0,
      promotion: 0,
      "live-music": 0,
      holiday: 0,
    };
    for (const e of list) result[e.category] += 1;
    return result;
  }, [list]);

  const filtered = useMemo(() => {
    if (filter === "all") return list;
    return list.filter((e) => e.category === filter);
  }, [list, filter]);

  const { upcoming, past } = useMemo(() => {
    const nowMs = now.getTime();
    const up: CafeEvent[] = [];
    const pa: CafeEvent[] = [];
    for (const e of filtered) {
      const t = new Date(e.datetime).getTime();
      if (Number.isFinite(t) && t >= nowMs) up.push(e);
      else pa.push(e);
    }
    up.sort((a, b) => (a.datetime < b.datetime ? -1 : 1));
    pa.sort((a, b) => (a.datetime > b.datetime ? -1 : 1));
    return { upcoming: up, past: pa };
  }, [filtered, now]);

  const nextEvent = upcoming[0] ?? null;

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
      addEvent(input);
      setShowAddForm(false);
      setAddDraft(EMPTY_DRAFT);
    },
    [addDraft],
  );

  const handleStartEdit = useCallback((ev: CafeEvent) => {
    setEditingId(ev.id);
    setEditDraft({
      title: ev.title,
      category: ev.category,
      datetime: isoToLocalInputValue(ev.datetime),
      location: ev.location,
      description: ev.description,
      capacity: ev.capacity === null ? "" : String(ev.capacity),
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
      updateEvent(id, input);
      setEditingId(null);
      setEditDraft(EMPTY_DRAFT);
    },
    [editDraft],
  );

  const handleDelete = useCallback((ev: CafeEvent) => {
    if (typeof window === "undefined") return;
    const ok = window.confirm(`Xoá sự kiện "${ev.title}"?`);
    if (!ok) return;
    removeEvent(ev.id);
  }, []);

  const handleCopy = useCallback(async (ev: CafeEvent) => {
    if (typeof window === "undefined") return;
    const text = formatAnnouncement(ev);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiedId(ev.id);
      window.setTimeout(() => {
        setCopiedId((current) => (current === ev.id ? null : current));
      }, 1800);
    } catch {
      // ignore
    }
  }, []);

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
      {/* Filter pills + Add button */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterPill
            active={filter === "all"}
            label="Tất cả"
            count={counts.all}
            onClick={() => setFilter("all")}
          />
          {CATEGORY_KEYS.map((c) => (
            <FilterPill
              key={c}
              active={filter === c}
              label={CATEGORY_LABEL[c]}
              count={counts[c]}
              onClick={() => setFilter(c)}
            />
          ))}
        </div>
        {!showAddForm ? (
          <Button type="button" size="sm" onClick={handleOpenAdd}>
            <Plus className="size-4" />
            Thêm sự kiện
          </Button>
        ) : null}
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-xl border bg-gradient-to-br from-primary/10 to-card px-4 py-3 shadow-sm">
          <span className="text-sm text-muted-foreground">
            Sự kiện sắp tới
          </span>
          <span className="text-2xl font-semibold tabular-nums">
            {upcoming.length}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl border bg-gradient-to-br from-accent/40 to-card px-4 py-3 shadow-sm">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Sự kiện kế tiếp</p>
            {nextEvent ? (
              <p className="truncate text-sm font-medium">{nextEvent.title}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Chưa có sự kiện nào
              </p>
            )}
          </div>
          {nextEvent ? (
            <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary tabular-nums">
              <Countdown target={nextEvent.datetime} pastLabel="Đang diễn ra" />
            </span>
          ) : null}
        </div>
      </div>

      {/* Add form */}
      {showAddForm ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Thêm sự kiện mới</CardTitle>
          </CardHeader>
          <CardContent>
            <EventForm
              draft={addDraft}
              onChange={setAddDraft}
              onSubmit={handleSubmitAdd}
              onCancel={handleCancelAdd}
              submitLabel="Lưu sự kiện"
            />
          </CardContent>
        </Card>
      ) : null}

      {/* Upcoming */}
      <section className="space-y-2">
        <h2 className="px-1 text-sm font-semibold text-muted-foreground">
          Sắp tới ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {list.length === 0
                ? 'Chưa có sự kiện nào. Bấm "Thêm sự kiện" để bắt đầu.'
                : "Không có sự kiện sắp tới phù hợp với bộ lọc."}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcoming.map((ev) => (
              <EventRow
                key={ev.id}
                event={ev}
                now={now}
                isPast={false}
                isEditing={editingId === ev.id}
                editDraft={editDraft}
                onEditDraftChange={setEditDraft}
                onStartEdit={handleStartEdit}
                onCancelEdit={handleCancelEdit}
                onSubmitEdit={handleSubmitEdit}
                onDelete={handleDelete}
                onCopy={handleCopy}
                copied={copiedId === ev.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* Past (collapsed) */}
      {past.length > 0 ? (
        <section className="space-y-2">
          <button
            type="button"
            onClick={() => setPastOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-md px-1 py-1 text-left text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            aria-expanded={pastOpen}
          >
            <span>Đã qua ({past.length})</span>
            {pastOpen ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </button>
          {pastOpen ? (
            <div className="space-y-3">
              {past.map((ev) => (
                <EventRow
                  key={ev.id}
                  event={ev}
                  now={now}
                  isPast
                  isEditing={editingId === ev.id}
                  editDraft={editDraft}
                  onEditDraftChange={setEditDraft}
                  onStartEdit={handleStartEdit}
                  onCancelEdit={handleCancelEdit}
                  onSubmitEdit={handleSubmitEdit}
                  onDelete={handleDelete}
                  onCopy={handleCopy}
                  copied={copiedId === ev.id}
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function FilterPill({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 text-[10px] tabular-nums",
          active
            ? "bg-primary-foreground/20 text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}

type EventRowProps = {
  event: CafeEvent;
  now: Date;
  isPast: boolean;
  isEditing: boolean;
  editDraft: DraftFields;
  onEditDraftChange: (draft: DraftFields) => void;
  onStartEdit: (ev: CafeEvent) => void;
  onCancelEdit: () => void;
  onSubmitEdit: (e: FormEvent<HTMLFormElement>, id: string) => void;
  onDelete: (ev: CafeEvent) => void;
  onCopy: (ev: CafeEvent) => void;
  copied: boolean;
};

function EventRow({
  event: ev,
  now,
  isPast,
  isEditing,
  editDraft,
  onEditDraftChange,
  onStartEdit,
  onCancelEdit,
  onSubmitEdit,
  onDelete,
  onCopy,
  copied,
}: EventRowProps) {
  const tint = CATEGORY_TINT[ev.category];
  const Icon = ICON_MAP[CATEGORY_ICON[ev.category]];

  if (isEditing) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sửa sự kiện</CardTitle>
        </CardHeader>
        <CardContent>
          <EventForm
            draft={editDraft}
            onChange={onEditDraftChange}
            onSubmit={(e) => onSubmitEdit(e, ev.id)}
            onCancel={onCancelEdit}
            submitLabel="Cập nhật"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "border-l-4",
        TINT_BORDER[tint] ?? "border-l-primary",
        isPast && "opacity-70",
      )}
    >
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                TINT_BADGE[tint] ?? "bg-primary/10 text-primary",
              )}
            >
              <Icon
                className={cn("size-3.5", TINT_ICON[tint] ?? "text-primary")}
              />
              {CATEGORY_LABEL[ev.category]}
            </span>
            {!isPast ? (
              <Countdown
                target={ev.datetime}
                hideSeconds
                pastLabel="Đang diễn ra"
                className="text-[11px] text-muted-foreground"
              />
            ) : null}
          </div>

          <h3 className="text-base font-semibold leading-tight">{ev.title}</h3>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" />
              {formatDateTime(ev.datetime)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" />
              {ev.location}
            </span>
            {ev.capacity !== null ? (
              <span className="inline-flex items-center gap-1">
                <Users className="size-3.5" />
                {ev.capacity} chỗ
              </span>
            ) : null}
          </div>

          {ev.description ? (
            <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">
              {ev.description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:flex-col sm:items-stretch">
          <Button
            type="button"
            variant={copied ? "secondary" : "default"}
            size="sm"
            onClick={() => onCopy(ev)}
          >
            <Copy className="size-4" />
            {copied ? "Đã sao chép" : "Sao chép thông báo"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onStartEdit(ev)}
          >
            <Pencil className="size-4" />
            Sửa
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onDelete(ev)}
          >
            <Trash2 className="size-4" />
            Xoá
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

type EventFormProps = {
  draft: DraftFields;
  onChange: (draft: DraftFields) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  submitLabel: string;
};

function EventForm({
  draft,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
}: EventFormProps) {
  const update = <K extends keyof DraftFields>(
    key: K,
    value: DraftFields[K],
  ): void => {
    onChange({ ...draft, [key]: value });
  };

  const handleText =
    (key: "title" | "datetime" | "location" | "capacity") =>
    (e: ChangeEvent<HTMLInputElement>) => {
      update(key, e.target.value);
    };

  const handleDescription = (e: ChangeEvent<HTMLTextAreaElement>) => {
    update("description", e.target.value.slice(0, DESCRIPTION_MAX));
  };

  const handleCategory = (e: ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    if (
      v === "tasting" ||
      v === "workshop" ||
      v === "promotion" ||
      v === "live-music" ||
      v === "holiday"
    ) {
      update("category", v);
    }
  };

  const isValid = parseDraftToInput(draft) !== null;
  const remaining = DESCRIPTION_MAX - draft.description.length;

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ev-title">Tên sự kiện</Label>
          <Input
            id="ev-title"
            type="text"
            value={draft.title}
            onChange={handleText("title")}
            placeholder="VD: Workshop pha cà phê thủ công"
            required
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ev-category">Danh mục</Label>
          <select
            id="ev-category"
            value={draft.category}
            onChange={handleCategory}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          >
            {CATEGORY_KEYS.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ev-datetime">Thời gian</Label>
          <Input
            id="ev-datetime"
            type="datetime-local"
            value={draft.datetime}
            onChange={handleText("datetime")}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ev-location">Địa điểm</Label>
          <Input
            id="ev-location"
            type="text"
            value={draft.location}
            onChange={handleText("location")}
            placeholder="Tại quán"
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ev-capacity">Số chỗ (tuỳ chọn)</Label>
          <Input
            id="ev-capacity"
            type="number"
            min={1}
            step={1}
            value={draft.capacity}
            onChange={handleText("capacity")}
            placeholder="VD: 20"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="ev-description">Mô tả (tuỳ chọn)</Label>
          <span
            className={cn(
              "text-[11px] tabular-nums",
              remaining < 50 ? "text-amber-600" : "text-muted-foreground",
            )}
          >
            còn {remaining} ký tự
          </span>
        </div>
        <textarea
          id="ev-description"
          value={draft.description}
          onChange={handleDescription}
          rows={3}
          maxLength={DESCRIPTION_MAX}
          placeholder="Thông tin chi tiết, giá vé, cách đăng ký…"
          className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
