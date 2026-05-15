"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Pencil,
  Play,
  Plus,
  Quote,
  Star,
  Trash2,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import {
  addTestimonial,
  getTestimonials,
  removeTestimonial,
  STORAGE_KEY,
  TESTIMONIALS_EVENT,
  toggleFeatured,
  updateTestimonial,
  type Rating,
  type Testimonial,
} from "@/lib/testimonials-state";

type FilterValue = "all" | "5" | "4plus" | "3plus";

const FILTERS: ReadonlyArray<{ value: FilterValue; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "5", label: "5★" },
  { value: "4plus", label: "4★+" },
  { value: "3plus", label: "3★+" },
];

const ROTATE_INTERVAL_MS = 6000;

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatVNDate(iso: string): string {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function passesFilter(t: Testimonial, f: FilterValue): boolean {
  if (f === "all") return true;
  if (f === "5") return t.rating === 5;
  if (f === "4plus") return t.rating >= 4;
  if (f === "3plus") return t.rating >= 3;
  return true;
}

function StarRow({
  rating,
  size = 14,
  className,
}: {
  rating: Rating;
  size?: number;
  className?: string;
}) {
  const stars: number[] = [1, 2, 3, 4, 5];
  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-label={`${rating} trên 5 sao`}
    >
      {stars.map((n) => (
        <Star
          key={n}
          aria-hidden
          style={{ width: size, height: size }}
          className={cn(
            n <= rating
              ? "fill-amber-400 text-amber-400"
              : "fill-transparent text-muted-foreground/40",
          )}
        />
      ))}
    </div>
  );
}

function StarPicker({
  value,
  onChange,
}: {
  value: Rating;
  onChange: (r: Rating) => void;
}) {
  const stars: Rating[] = [1, 2, 3, 4, 5];
  return (
    <div className="inline-flex items-center gap-1" role="radiogroup" aria-label="Đánh giá sao">
      {stars.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          onClick={() => onChange(n)}
          className={cn(
            "rounded p-1 transition-colors hover:bg-accent/40",
            value >= n ? "text-amber-400" : "text-muted-foreground/50",
          )}
        >
          <Star
            className={cn("size-5", value >= n ? "fill-amber-400" : "fill-transparent")}
          />
        </button>
      ))}
    </div>
  );
}

type FormState = {
  name: string;
  rating: Rating;
  quote: string;
  photoUrl: string;
  date: string;
  featured: boolean;
};

function emptyForm(): FormState {
  return {
    name: "",
    rating: 5,
    quote: "",
    photoUrl: "",
    date: todayISO(),
    featured: false,
  };
}

function fromTestimonial(t: Testimonial): FormState {
  return {
    name: t.name,
    rating: t.rating,
    quote: t.quote,
    photoUrl: t.photoUrl,
    date: t.date || todayISO(),
    featured: t.featured,
  };
}

function TestimonialForm({
  initial,
  onCancel,
  onSubmit,
}: {
  initial: FormState;
  onCancel: () => void;
  onSubmit: (s: FormState) => void;
}) {
  const [form, setForm] = useState<FormState>(initial);

  const canSubmit = form.name.trim().length > 0 && form.quote.trim().length > 0;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSubmit(form);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="t-name">Tên khách hàng</Label>
          <Input
            id="t-name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ví dụ: Chị Lan"
            maxLength={80}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Đánh giá</Label>
          <div>
            <StarPicker
              value={form.rating}
              onChange={(r) => setForm((f) => ({ ...f, rating: r }))}
            />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="t-quote">Lời nhận xét</Label>
        <textarea
          id="t-quote"
          value={form.quote}
          onChange={(e) => setForm((f) => ({ ...f, quote: e.target.value }))}
          placeholder="Cà phê thơm, nhân viên dễ thương..."
          maxLength={500}
          rows={3}
          required
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="t-photo">URL ảnh (tuỳ chọn)</Label>
          <Input
            id="t-photo"
            type="url"
            value={form.photoUrl}
            onChange={(e) => setForm((f) => ({ ...f, photoUrl: e.target.value }))}
            placeholder="https://..."
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t-date">Ngày (tuỳ chọn)</Label>
          <Input
            id="t-date"
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
        </div>
      </div>

      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.featured}
          onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
          className="size-4 rounded border-input"
        />
        <span>Đặt làm testimonial nổi bật</span>
      </label>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Huỷ
        </Button>
        <Button type="submit" disabled={!canSubmit}>
          Lưu testimonial
        </Button>
      </div>
    </form>
  );
}

function TestimonialCard({
  t,
  size = "md",
  onEdit,
  onRemove,
  onToggleFeatured,
}: {
  t: Testimonial;
  size?: "md" | "lg" | "kiosk";
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onToggleFeatured: (id: string) => void;
}) {
  const isLarge = size === "lg" || size === "kiosk";
  const photoSize = size === "kiosk" ? 72 : isLarge ? 56 : 40;

  return (
    <div
      className={cn(
        "group relative break-inside-avoid rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md",
        size === "kiosk" && "p-8 md:p-10",
        isLarge &&
          "border-amber-300/60 bg-gradient-to-br from-amber-50/80 via-background to-rose-50/40 dark:border-amber-500/30 dark:from-amber-500/10 dark:via-background dark:to-rose-500/5",
      )}
    >
      {t.featured && size !== "kiosk" && (
        <span className="absolute -top-2 left-4 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
          <Star className="size-3 fill-white" /> Nổi bật
        </span>
      )}

      <Quote
        aria-hidden
        className={cn(
          "absolute right-4 top-4 text-amber-300/40 dark:text-amber-500/20",
          size === "kiosk" ? "size-16" : isLarge ? "size-10" : "size-7",
        )}
      />

      <div className="relative space-y-3">
        <StarRow rating={t.rating} size={size === "kiosk" ? 22 : isLarge ? 18 : 14} />
        <p
          className={cn(
            "leading-relaxed text-foreground",
            size === "kiosk"
              ? "text-2xl font-medium md:text-3xl"
              : isLarge
                ? "text-lg font-medium"
                : "text-sm",
          )}
        >
          “{t.quote}”
        </p>
        <div className="flex items-center gap-3 pt-1">
          <Avatar src={t.photoUrl || null} fallback={t.name} size={photoSize} />
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "truncate font-semibold",
                size === "kiosk" ? "text-lg" : "text-sm",
              )}
            >
              {t.name}
            </p>
            {t.date && (
              <p
                className={cn(
                  "text-muted-foreground",
                  size === "kiosk" ? "text-sm" : "text-xs",
                )}
              >
                {formatVNDate(t.date)}
              </p>
            )}
          </div>
        </div>
      </div>

      {size !== "kiosk" && (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-end gap-1 opacity-0 transition-opacity",
            "group-hover:pointer-events-auto group-hover:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100",
          )}
        >
          <Button
            type="button"
            size="sm"
            variant={t.featured ? "default" : "secondary"}
            onClick={() => onToggleFeatured(t.id)}
            aria-pressed={t.featured}
            title={t.featured ? "Bỏ nổi bật" : "Đặt nổi bật"}
          >
            <Star className={cn("size-4", t.featured && "fill-current")} />
            {t.featured ? "Bỏ nổi bật" : "Nổi bật"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => onEdit(t.id)}
          >
            <Pencil className="size-4" />
            Sửa
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => onRemove(t.id)}
          >
            <Trash2 className="size-4" />
            Xoá
          </Button>
        </div>
      )}
    </div>
  );
}

export function TestimonialsBoard() {
  const [hydrated, setHydrated] = useState(false);
  const [items, setItems] = useState<Testimonial[]>([]);
  const [filter, setFilter] = useState<FilterValue>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);
  const [rotateIndex, setRotateIndex] = useState(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    setItems(getTestimonials());
    setHydrated(true);
  }, []);

  // Listen for storage / custom events
  useEffect(() => {
    if (!hydrated) return;
    const reread = () => setItems(getTestimonials());
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STORAGE_KEY) reread();
    };
    const onCustom = () => reread();
    window.addEventListener("storage", onStorage);
    window.addEventListener(TESTIMONIALS_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(TESTIMONIALS_EVENT, onCustom);
    };
  }, [hydrated]);

  const filtered = useMemo(
    () => items.filter((t) => passesFilter(t, filter)),
    [items, filter],
  );

  const featured = useMemo(
    () => filtered.filter((t) => t.featured),
    [filtered],
  );
  const wall = useMemo(() => filtered.filter((t) => !t.featured), [filtered]);

  // Rotation list = entire filtered set, featured first
  const rotationList = useMemo(
    () => [...featured, ...wall],
    [featured, wall],
  );

  const totalAll = items.length;
  const avgRating = useMemo(() => {
    if (items.length === 0) return 0;
    let sum = 0;
    for (const t of items) sum += t.rating;
    return Math.round((sum / items.length) * 10) / 10;
  }, [items]);

  // Auto rotate effect
  useEffect(() => {
    if (!rotating) {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    if (rotationList.length === 0) return;
    intervalRef.current = window.setInterval(() => {
      setRotateIndex((i) => (i + 1) % Math.max(rotationList.length, 1));
    }, ROTATE_INTERVAL_MS);
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [rotating, rotationList.length]);

  // Keep rotateIndex in valid range when list changes
  useEffect(() => {
    if (rotationList.length === 0) {
      setRotateIndex(0);
      return;
    }
    setRotateIndex((i) => (i >= rotationList.length ? 0 : i));
  }, [rotationList.length]);

  const handleAdd = useCallback((s: FormState) => {
    addTestimonial({
      name: s.name,
      rating: s.rating,
      quote: s.quote,
      photoUrl: s.photoUrl,
      date: s.date,
      featured: s.featured,
    });
    setShowForm(false);
  }, []);

  const handleUpdate = useCallback(
    (id: string, s: FormState) => {
      updateTestimonial(id, {
        name: s.name.trim(),
        rating: s.rating,
        quote: s.quote.trim(),
        photoUrl: s.photoUrl.trim(),
        date: s.date,
        featured: s.featured,
      });
      setEditingId(null);
    },
    [],
  );

  const handleRemove = useCallback((id: string) => {
    if (typeof window !== "undefined") {
      const ok = window.confirm("Xoá testimonial này?");
      if (!ok) return;
    }
    removeTestimonial(id);
  }, []);

  const handleToggleFeatured = useCallback((id: string) => {
    toggleFeatured(id);
  }, []);

  const editingItem =
    editingId !== null ? items.find((t) => t.id === editingId) ?? null : null;

  if (!hydrated) {
    // SSR-safe placeholder so layout doesn't shift
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-xl bg-muted/40" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="h-40 animate-pulse rounded-xl bg-muted/40" />
          <div className="h-40 animate-pulse rounded-xl bg-muted/40" />
          <div className="h-40 animate-pulse rounded-xl bg-muted/40" />
        </div>
      </div>
    );
  }

  // Kiosk / rotation mode
  if (rotating && rotationList.length > 0) {
    const current = rotationList[rotateIndex] ?? rotationList[0];
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Chế độ trình chiếu</CardTitle>
            <CardDescription className="text-xs">
              Tự chuyển mỗi 6 giây ({rotateIndex + 1}/{rotationList.length})
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() =>
                setRotateIndex(
                  (i) => (i - 1 + rotationList.length) % rotationList.length,
                )
              }
              aria-label="Trước"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() =>
                setRotateIndex((i) => (i + 1) % rotationList.length)
              }
              aria-label="Sau"
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setRotating(false)}
            >
              <Pause className="size-4" />
              Dừng
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mx-auto flex min-h-[320px] max-w-3xl items-center justify-center">
            <div className="w-full">
              <TestimonialCard
                t={current}
                size="kiosk"
                onEdit={() => undefined}
                onRemove={() => undefined}
                onToggleFeatured={() => undefined}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
            {totalAll} cảm nhận
          </span>
          {totalAll > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
              <Star className="size-3 fill-amber-400 text-amber-400" />
              {avgRating.toFixed(1)} trung bình
            </span>
          )}
          {filter !== "all" && filtered.length !== totalAll && (
            <span className="text-xs text-muted-foreground">
              ({filtered.length} hiển thị)
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex items-center gap-1 rounded-lg border bg-card p-1"
            role="tablist"
            aria-label="Lọc theo sao"
          >
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                role="tab"
                aria-selected={filter === f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  filter === f.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (rotationList.length === 0) return;
              setRotateIndex(0);
              setRotating(true);
            }}
            disabled={rotationList.length === 0}
            title={
              rotationList.length === 0
                ? "Cần ít nhất 1 testimonial"
                : "Bật trình chiếu"
            }
          >
            <Play className="size-4" />
            Trình chiếu
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditingId(null);
              setShowForm((s) => !s);
            }}
          >
            {showForm ? <X className="size-4" /> : <Plus className="size-4" />}
            {showForm ? "Đóng" : "Thêm testimonial"}
          </Button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Thêm testimonial mới</CardTitle>
            <CardDescription className="text-xs">
              Lưu cục bộ trên thiết bị này.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TestimonialForm
              initial={emptyForm()}
              onCancel={() => setShowForm(false)}
              onSubmit={handleAdd}
            />
          </CardContent>
        </Card>
      )}

      {/* Edit form */}
      {editingItem && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Sửa testimonial của {editingItem.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TestimonialForm
              initial={fromTestimonial(editingItem)}
              onCancel={() => setEditingId(null)}
              onSubmit={(s) => handleUpdate(editingItem.id, s)}
            />
          </CardContent>
        </Card>
      )}

      {/* Empty */}
      {filtered.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Quote}
              title={
                totalAll === 0
                  ? "Chưa có testimonial nào"
                  : "Không có cảm nhận khớp bộ lọc"
              }
              description={
                totalAll === 0
                  ? "Bắt đầu bằng cách thêm cảm nhận đầu tiên từ khách hàng."
                  : "Thử chọn bộ lọc khác hoặc đặt lại về Tất cả."
              }
              action={
                totalAll === 0 ? (
                  <Button onClick={() => setShowForm(true)} size="sm">
                    <Plus className="size-4" />
                    Thêm testimonial đầu tiên
                  </Button>
                ) : (
                  <Button
                    onClick={() => setFilter("all")}
                    size="sm"
                    variant="outline"
                  >
                    Hiện tất cả
                  </Button>
                )
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Featured */}
      {featured.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Star className="size-4 fill-amber-400 text-amber-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Cảm nhận nổi bật
            </h3>
          </div>
          <div
            className={cn(
              "grid gap-4",
              featured.length === 1 ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2",
            )}
          >
            {featured.slice(0, 2).map((t) => (
              <TestimonialCard
                key={t.id}
                t={t}
                size="lg"
                onEdit={(id) => {
                  setShowForm(false);
                  setEditingId(id);
                }}
                onRemove={handleRemove}
                onToggleFeatured={handleToggleFeatured}
              />
            ))}
          </div>
          {featured.length > 2 && (
            <p className="text-xs text-muted-foreground">
              + {featured.length - 2} cảm nhận nổi bật khác hiển thị bên dưới.
            </p>
          )}
        </section>
      )}

      {/* Wall (masonry) */}
      {wall.length + Math.max(featured.length - 2, 0) > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Tường cảm nhận
          </h3>
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [column-fill:balance]">
            {/* Overflow featured beyond first 2 plus regular wall items */}
            {[...featured.slice(2), ...wall].map((t) => (
              <div key={t.id} className="mb-4">
                <TestimonialCard
                  t={t}
                  onEdit={(id) => {
                    setShowForm(false);
                    setEditingId(id);
                  }}
                  onRemove={handleRemove}
                  onToggleFeatured={handleToggleFeatured}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
