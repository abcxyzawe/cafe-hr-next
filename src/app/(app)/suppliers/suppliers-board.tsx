"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  AlertTriangle,
  Coffee,
  Download,
  Flame,
  Milk,
  Package,
  Pencil,
  Plus,
  ShoppingCart,
  Trash2,
  Truck,
  Wrench,
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
import { Select } from "@/components/ui/select";
import { cn, formatVND } from "@/lib/utils";
import {
  addSupplier,
  CATEGORY_ICON,
  CATEGORY_LABEL,
  CATEGORY_TINT,
  daysSinceOrder,
  getSuppliers,
  markOrdered,
  removeSupplier,
  STORAGE_KEY,
  SUPPLIERS_EVENT,
  updateSupplier,
  type Supplier,
  type SupplierCategory,
} from "@/lib/suppliers-state";

const CATEGORIES: readonly SupplierCategory[] = [
  "beans",
  "milk",
  "syrup",
  "equipment",
  "other",
];

type Filter = "all" | SupplierCategory;

type FormState = {
  name: string;
  category: SupplierCategory;
  origin: string;
  pricePerUnitVnd: string;
  unit: string;
  contact: string;
  lastOrderDate: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  category: "beans",
  origin: "",
  pricePerUnitVnd: "",
  unit: "kg",
  contact: "",
  lastOrderDate: "",
  notes: "",
};

function formatDateLabel(iso: string): string {
  if (!iso) return "Chưa có";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(suppliers: Supplier[]): void {
  const header = [
    "name",
    "category",
    "origin",
    "pricePerUnitVnd",
    "unit",
    "contact",
    "lastOrderDate",
    "notes",
    "createdAt",
  ];
  const rows = suppliers.map((s) =>
    [
      s.name,
      CATEGORY_LABEL[s.category],
      s.origin,
      String(s.pricePerUnitVnd),
      s.unit,
      s.contact,
      s.lastOrderDate,
      s.notes,
      s.createdAt,
    ]
      .map(csvEscape)
      .join(","),
  );
  const csv = [header.join(","), ...rows].join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nha-cung-cap-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function CategoryIcon({
  category,
  className,
}: {
  category: SupplierCategory;
  className?: string;
}) {
  const kind = CATEGORY_ICON[category];
  if (kind === "coffee") return <Coffee className={className} />;
  if (kind === "milk") return <Milk className={className} />;
  if (kind === "flame") return <Flame className={className} />;
  if (kind === "wrench") return <Wrench className={className} />;
  return <Package className={className} />;
}

function ageChipClasses(days: number | null): string {
  if (days === null) return "bg-muted text-muted-foreground";
  if (days <= 7) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300";
  if (days <= 30) return "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300";
  return "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300";
}

function ageChipLabel(days: number | null): string {
  if (days === null) return "Chưa đặt";
  if (days === 0) return "Hôm nay";
  if (days === 1) return "1 ngày";
  return `${days} ngày`;
}

export function SuppliersBoard() {
  const [hydrated, setHydrated] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    setSuppliers(getSuppliers());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const reread = () => setSuppliers(getSuppliers());
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STORAGE_KEY) reread();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(SUPPLIERS_EVENT, reread);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(SUPPLIERS_EVENT, reread);
    };
  }, [hydrated]);

  const counts = useMemo(() => {
    const map: Record<Filter, number> = {
      all: suppliers.length,
      beans: 0,
      milk: 0,
      syrup: 0,
      equipment: 0,
      other: 0,
    };
    for (const s of suppliers) map[s.category] += 1;
    return map;
  }, [suppliers]);

  const staleCount = useMemo(() => {
    let n = 0;
    for (const s of suppliers) {
      const d = daysSinceOrder(s);
      if (d !== null && d > 30) n += 1;
    }
    return n;
  }, [suppliers]);

  const filtered = useMemo(() => {
    const list = filter === "all" ? suppliers : suppliers.filter((s) => s.category === filter);
    return list.slice().sort((a, b) => {
      const ca = CATEGORIES.indexOf(a.category);
      const cb = CATEGORIES.indexOf(b.category);
      if (ca !== cb) return ca - cb;
      return a.name.localeCompare(b.name, "vi");
    });
  }, [suppliers, filter]);

  const grouped = useMemo(() => {
    const buckets = new Map<SupplierCategory, Supplier[]>();
    for (const s of filtered) {
      const arr = buckets.get(s.category);
      if (arr) arr.push(s);
      else buckets.set(s.category, [s]);
    }
    const groups: { category: SupplierCategory; items: Supplier[] }[] = [];
    for (const c of CATEGORIES) {
      const items = buckets.get(c);
      if (items && items.length > 0) groups.push({ category: c, items });
    }
    return groups;
  }, [filtered]);

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormOpen(false);
  }, []);

  const openAdd = useCallback(() => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((s: Supplier) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      category: s.category,
      origin: s.origin,
      pricePerUnitVnd: s.pricePerUnitVnd ? String(s.pricePerUnitVnd) : "",
      unit: s.unit,
      contact: s.contact,
      lastOrderDate: s.lastOrderDate,
      notes: s.notes,
    });
    setFormOpen(true);
  }, []);

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const name = form.name.trim();
      if (!name) return;
      const priceNum = Number(form.pricePerUnitVnd.replace(/[^0-9.-]/g, ""));
      const payload = {
        name,
        category: form.category,
        origin: form.origin,
        pricePerUnitVnd: Number.isFinite(priceNum) ? priceNum : 0,
        unit: form.unit.trim() || "kg",
        contact: form.contact,
        lastOrderDate: form.lastOrderDate,
        notes: form.notes,
      };
      if (editingId) {
        updateSupplier(editingId, payload);
      } else {
        addSupplier(payload);
      }
      resetForm();
    },
    [form, editingId, resetForm],
  );

  const handleDelete = useCallback((s: Supplier) => {
    if (typeof window !== "undefined") {
      const ok = window.confirm(`Xoá nhà cung cấp "${s.name}"?`);
      if (!ok) return;
    }
    removeSupplier(s.id);
  }, []);

  const handleOrder = useCallback((id: string) => {
    markOrdered(id);
  }, []);

  const filterPills: { value: Filter; label: string }[] = [
    { value: "all", label: "Tất cả" },
    ...CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] })),
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Truck className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Tổng nhà cung cấp
              </p>
              <p className="text-2xl font-semibold tabular-nums">
                {hydrated ? counts.all : 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <Coffee className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Nguồn hạt cà phê
              </p>
              <p className="text-2xl font-semibold tabular-nums">
                {hydrated ? counts.beans : 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-lg",
                staleCount > 0
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
              )}
            >
              <AlertTriangle className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Quá 30 ngày chưa đặt
              </p>
              <p className="text-2xl font-semibold tabular-nums">
                {hydrated ? staleCount : 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {filterPills.map((p) => {
            const active = filter === p.value;
            const count = counts[p.value];
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setFilter(p.value)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-accent",
                )}
              >
                {p.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[10px] tabular-nums",
                    active
                      ? "bg-primary-foreground/20"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {hydrated ? count : 0}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => downloadCsv(suppliers)}
            disabled={!hydrated || suppliers.length === 0}
          >
            <Download className="size-4" />
            Xuất CSV
          </Button>
          <Button type="button" size="sm" onClick={openAdd}>
            <Plus className="size-4" />
            Thêm nhà cung cấp
          </Button>
        </div>
      </div>

      {formOpen && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">
                  {editingId ? "Sửa nhà cung cấp" : "Thêm nhà cung cấp"}
                </CardTitle>
                <CardDescription className="text-xs">
                  Nhập thông tin để dễ tra cứu khi đặt hàng.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={resetForm}
                aria-label="Đóng"
              >
                <X className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="sup-name" className="mb-1.5 block">
                    Tên nhà cung cấp
                  </Label>
                  <Input
                    id="sup-name"
                    value={form.name}
                    onChange={(ev) =>
                      setForm((f) => ({ ...f, name: ev.target.value }))
                    }
                    placeholder="Vd: Cà phê Buôn Ma Thuột"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="sup-category" className="mb-1.5 block">
                    Danh mục
                  </Label>
                  <Select
                    id="sup-category"
                    value={form.category}
                    onChange={(ev) =>
                      setForm((f) => ({
                        ...f,
                        category: ev.target.value as SupplierCategory,
                      }))
                    }
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABEL[c]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sup-origin" className="mb-1.5 block">
                    Xuất xứ
                  </Label>
                  <Input
                    id="sup-origin"
                    value={form.origin}
                    onChange={(ev) =>
                      setForm((f) => ({ ...f, origin: ev.target.value }))
                    }
                    placeholder="Vd: Đắk Lắk, Việt Nam"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <Label htmlFor="sup-price" className="mb-1.5 block">
                      Giá (VND)
                    </Label>
                    <Input
                      id="sup-price"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={form.pricePerUnitVnd}
                      onChange={(ev) =>
                        setForm((f) => ({
                          ...f,
                          pricePerUnitVnd: ev.target.value,
                        }))
                      }
                      placeholder="350000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sup-unit" className="mb-1.5 block">
                      Đơn vị
                    </Label>
                    <Input
                      id="sup-unit"
                      value={form.unit}
                      onChange={(ev) =>
                        setForm((f) => ({ ...f, unit: ev.target.value }))
                      }
                      placeholder="kg"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="sup-contact" className="mb-1.5 block">
                    Liên hệ
                  </Label>
                  <Input
                    id="sup-contact"
                    value={form.contact}
                    onChange={(ev) =>
                      setForm((f) => ({ ...f, contact: ev.target.value }))
                    }
                    placeholder="Tên người, SĐT, email…"
                  />
                </div>
                <div>
                  <Label htmlFor="sup-last" className="mb-1.5 block">
                    Lần đặt gần nhất
                  </Label>
                  <Input
                    id="sup-last"
                    type="date"
                    value={form.lastOrderDate}
                    onChange={(ev) =>
                      setForm((f) => ({
                        ...f,
                        lastOrderDate: ev.target.value,
                      }))
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="sup-notes" className="mb-1.5 block">
                    Ghi chú
                  </Label>
                  <Input
                    id="sup-notes"
                    value={form.notes}
                    onChange={(ev) =>
                      setForm((f) => ({ ...f, notes: ev.target.value }))
                    }
                    placeholder="Vd: Giao trong 3 ngày, có chiết khấu 5%"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={resetForm}>
                  Huỷ
                </Button>
                <Button type="submit" disabled={!form.name.trim()}>
                  {editingId ? "Lưu" : "Thêm"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {!hydrated ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Đang tải…
            </CardContent>
          </Card>
        ) : grouped.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {suppliers.length === 0
                ? "Chưa có nhà cung cấp nào — bấm “Thêm nhà cung cấp” để bắt đầu."
                : "Không có nhà cung cấp nào trong danh mục này."}
            </CardContent>
          </Card>
        ) : (
          grouped.map((g) => (
            <section key={g.category} className="space-y-2">
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <CategoryIcon category={g.category} className="size-3.5" />
                {CATEGORY_LABEL[g.category]}{" "}
                <span className="text-muted-foreground/70">
                  ({g.items.length})
                </span>
              </h2>
              <div className="space-y-2">
                {g.items.map((s) => {
                  const days = daysSinceOrder(s);
                  return (
                    <Card
                      key={s.id}
                      className={cn(
                        "overflow-hidden border-l-4",
                        CATEGORY_TINT[s.category],
                      )}
                    >
                      <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm">
                          <CategoryIcon
                            category={s.category}
                            className="size-5 text-foreground/70"
                          />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <p className="text-sm font-semibold leading-snug">
                              {s.name}
                            </p>
                            {s.origin && (
                              <p className="text-xs text-muted-foreground">
                                · {s.origin}
                              </p>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {s.pricePerUnitVnd > 0 ? (
                              <>
                                <span className="font-medium text-foreground">
                                  {formatVND(s.pricePerUnitVnd)}
                                </span>
                                /{s.unit}
                              </>
                            ) : (
                              <span className="italic">Chưa có giá</span>
                            )}
                          </p>
                          {s.contact && (
                            <p className="text-xs text-muted-foreground">
                              Liên hệ: {s.contact}
                            </p>
                          )}
                          {s.notes && (
                            <p className="text-xs text-muted-foreground">
                              Ghi chú: {s.notes}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-[11px] text-muted-foreground">
                              Đặt gần nhất: {formatDateLabel(s.lastOrderDate)}
                            </span>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                                ageChipClasses(days),
                              )}
                            >
                              {ageChipLabel(days)}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOrder(s.id)}
                          >
                            <ShoppingCart className="size-4" />
                            Đặt hàng
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(s)}
                            aria-label="Sửa"
                          >
                            <Pencil className="size-4" />
                            <span className="sr-only sm:not-sr-only">Sửa</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(s)}
                            aria-label="Xoá"
                          >
                            <Trash2 className="size-4" />
                            <span className="sr-only sm:not-sr-only">Xoá</span>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
