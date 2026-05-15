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
  ImageIcon,
  Pencil,
  Plus,
  Quote,
  Sparkles,
  Trash2,
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
  MOOD_LABEL,
  MOOD_TINT,
  STORAGE_KEY,
  VISION_EVENT,
  addItem,
  getItems,
  removeItem,
  updateItem,
  type VisionItem,
  type VisionItemType,
  type VisionMood,
} from "@/lib/vision-board-state";

const MOODS: VisionMood[] = ["warm", "cool", "earth", "sunset", "mono"];
type MoodFilter = "all" | VisionMood;

type FormInput = {
  type: VisionItemType;
  content: string;
  caption: string;
  mood: VisionMood;
};

const URL_RE = /^https?:\/\/.+/i;

export function VisionBoard() {
  const [items, setItems] = useState<VisionItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [filter, setFilter] = useState<MoodFilter>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setItems(getItems());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const reread = () => setItems(getItems());
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STORAGE_KEY) reread();
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<{ key?: string }>).detail;
      if (!detail || !detail.key || detail.key === STORAGE_KEY) reread();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(VISION_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(VISION_EVENT, onCustom);
    };
  }, [hydrated]);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [items]);

  const filtered = useMemo(() => {
    if (filter === "all") return sorted;
    return sorted.filter((i) => i.mood === filter);
  }, [sorted, filter]);

  const moodCounts = useMemo(() => {
    const counts: Record<VisionMood, number> = {
      warm: 0,
      cool: 0,
      earth: 0,
      sunset: 0,
      mono: 0,
    };
    for (const i of items) counts[i.mood] += 1;
    return counts;
  }, [items]);

  const handleAdd = useCallback((input: FormInput) => {
    addItem(input);
    setShowForm(false);
  }, []);

  const handleSaveEdit = useCallback((id: string, input: FormInput) => {
    updateItem(id, input);
    setEditingId(null);
  }, []);

  const handleDelete = useCallback((id: string) => {
    if (typeof window === "undefined") return;
    const ok = window.confirm("Xoá vision này khỏi bảng?");
    if (!ok) return;
    removeItem(id);
  }, []);

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="size-4 text-primary" />
          <span className="font-medium">Tổng cộng:</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-primary">
            {items.length}
          </span>
          <span className="text-xs text-muted-foreground">vision</span>
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
          {showForm ? "Đóng" : "Thêm vision"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-4 py-3 shadow-sm">
        <span className="text-xs text-muted-foreground">Lọc theo mood:</span>
        <FilterPill
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label={`Tất cả (${items.length})`}
        />
        {MOODS.map((m) => (
          <FilterPill
            key={m}
            active={filter === m}
            onClick={() => setFilter(m)}
            label={`${MOOD_LABEL[m]} (${moodCounts[m]})`}
            mood={m}
          />
        ))}
      </div>

      {showForm ? (
        <VisionForm
          mode="create"
          onCancel={() => setShowForm(false)}
          onSubmit={handleAdd}
        />
      ) : null}

      {editingId ? (
        (() => {
          const target = items.find((i) => i.id === editingId);
          if (!target) return null;
          return (
            <VisionForm
              mode="edit"
              initial={target}
              onCancel={() => setEditingId(null)}
              onSubmit={(input) => handleSaveEdit(editingId, input)}
            />
          );
        })()
      ) : null}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Sparkles className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {items.length === 0
                ? "Bảng cảm hứng đang trống. Bấm Thêm vision để ghim ảnh hoặc câu nói đầu tiên."
                : "Không có vision nào khớp với mood đã chọn."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [column-fill:balance]">
          {filtered.map((item) => (
            <VisionCard
              key={item.id}
              item={item}
              onEdit={() => {
                setShowForm(false);
                setEditingId(item.id);
              }}
              onDelete={() => handleDelete(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  mood,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  mood?: VisionMood;
}) {
  const moodDot = mood
    ? mood === "warm"
      ? "bg-rose-400"
      : mood === "cool"
        ? "bg-sky-400"
        : mood === "earth"
          ? "bg-amber-500"
          : mood === "sunset"
            ? "bg-orange-400"
            : "bg-slate-400"
    : null;
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
      {moodDot ? (
        <span className={cn("size-2 rounded-full", moodDot)} aria-hidden />
      ) : null}
      {label}
    </button>
  );
}

function VisionForm({
  mode,
  initial,
  onSubmit,
  onCancel,
}: {
  mode: "create" | "edit";
  initial?: VisionItem;
  onSubmit: (input: FormInput) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<VisionItemType>(initial?.type ?? "image");
  const [content, setContent] = useState<string>(initial?.content ?? "");
  const [caption, setCaption] = useState<string>(initial?.caption ?? "");
  const [mood, setMood] = useState<VisionMood>(initial?.mood ?? "warm");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (type === "image") {
      if (!URL_RE.test(trimmed)) {
        setError("URL ảnh phải bắt đầu bằng http:// hoặc https://");
        return;
      }
    } else {
      if (trimmed.length < 5 || trimmed.length > 300) {
        setError("Văn bản cần dài từ 5 đến 300 ký tự.");
        return;
      }
    }
    setError(null);
    onSubmit({
      type,
      content: trimmed,
      caption: caption.trim(),
      mood,
    });
  };

  const handleMoodChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    if (
      v === "warm" ||
      v === "cool" ||
      v === "earth" ||
      v === "sunset" ||
      v === "mono"
    ) {
      setMood(v);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {mode === "create" ? "Thêm vision mới" : "Sửa vision"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="mb-1 block text-xs">Loại</Label>
            <div className="flex flex-wrap gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="vision-type"
                  value="image"
                  checked={type === "image"}
                  onChange={() => setType("image")}
                  className="accent-primary"
                />
                <ImageIcon className="size-4" />
                Ảnh (URL)
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="vision-type"
                  value="text"
                  checked={type === "text"}
                  onChange={() => setType("text")}
                  className="accent-primary"
                />
                <Quote className="size-4" />
                Văn bản / mục tiêu
              </label>
            </div>
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="vision-content" className="mb-1 block text-xs">
              {type === "image" ? "URL ảnh" : "Nội dung văn bản"}
            </Label>
            {type === "image" ? (
              <Input
                id="vision-content"
                type="url"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="https://…/anh-cam-hung.jpg"
                maxLength={500}
              />
            ) : (
              <textarea
                id="vision-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="VD: Mỗi ly cà phê đều phải mang lại nụ cười cho khách."
                maxLength={300}
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              />
            )}
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="vision-caption" className="mb-1 block text-xs">
              Chú thích (tuỳ chọn)
            </Label>
            <Input
              id="vision-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="VD: Phong cách quầy bar – tham khảo cho menu hè"
              maxLength={140}
            />
          </div>

          <div>
            <Label htmlFor="vision-mood" className="mb-1 block text-xs">
              Mood màu
            </Label>
            <Select id="vision-mood" value={mood} onChange={handleMoodChange}>
              {MOODS.map((m) => (
                <option key={m} value={m}>
                  {MOOD_LABEL[m]}
                </option>
              ))}
            </Select>
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
              {mode === "create" ? "Ghim lên bảng" : "Lưu thay đổi"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function VisionCard({
  item,
  onEdit,
  onDelete,
}: {
  item: VisionItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tint = MOOD_TINT[item.mood];

  return (
    <div className="group relative mb-4 break-inside-avoid">
      {item.type === "image" ? (
        <div
          className={cn(
            "overflow-hidden rounded-2xl border-2 bg-gradient-to-br shadow-sm",
            tint,
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.content}
            alt={item.caption || "Vision"}
            loading="lazy"
            className="block h-auto w-full"
          />
          {item.caption ? (
            <div className="px-3 py-2">
              <p className="text-xs text-muted-foreground">{item.caption}</p>
            </div>
          ) : null}
          <div className="flex items-center justify-between px-3 pb-2">
            <MoodChip mood={item.mood} />
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "overflow-hidden rounded-2xl border-2 bg-gradient-to-br p-5 shadow-sm",
            tint,
          )}
        >
          <Quote className="mb-2 size-5 text-foreground/60" />
          <p className="text-lg font-semibold leading-snug text-foreground">
            {item.content}
          </p>
          {item.caption ? (
            <p className="mt-3 text-xs text-muted-foreground">{item.caption}</p>
          ) : null}
          <div className="mt-3">
            <MoodChip mood={item.mood} />
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 flex items-start justify-end gap-2 rounded-2xl bg-foreground/0 p-2 opacity-0 transition-opacity group-hover:bg-foreground/30 group-hover:opacity-100 focus-within:bg-foreground/30 focus-within:opacity-100">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="pointer-events-auto"
          onClick={onEdit}
        >
          <Pencil className="size-4" />
          Sửa
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          className="pointer-events-auto"
          onClick={onDelete}
        >
          <Trash2 className="size-4" />
          Xoá
        </Button>
      </div>
    </div>
  );
}

function MoodChip({ mood }: { mood: VisionMood }) {
  const dot =
    mood === "warm"
      ? "bg-rose-400"
      : mood === "cool"
        ? "bg-sky-400"
        : mood === "earth"
          ? "bg-amber-500"
          : mood === "sunset"
            ? "bg-orange-400"
            : "bg-slate-400";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-background/70 px-2 py-0.5 text-[11px] font-medium text-foreground/80 backdrop-blur">
      <span className={cn("size-2 rounded-full", dot)} aria-hidden />
      {MOOD_LABEL[mood]}
    </span>
  );
}
