"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  Coffee,
  Cookie,
  Leaf,
  Package,
  Pencil,
  Plus,
  Printer,
  RefreshCcw,
  Snowflake,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  CATEGORY_ICON,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  MENU_EVENT,
  STORAGE_KEY,
  addItem,
  getMenu,
  removeItem,
  resetToDefaults,
  updateItem,
  type MenuCategory,
  type MenuItem,
} from "@/lib/menu-state";

type DraftState = {
  name: string;
  category: MenuCategory;
  priceVnd: string;
  description: string;
  highlight: boolean;
};

const EMPTY_DRAFT: DraftState = {
  name: "",
  category: "coffee",
  priceVnd: "",
  description: "",
  highlight: false,
};

function formatVnd(n: number): string {
  if (!Number.isFinite(n)) return "0đ";
  const rounded = Math.max(0, Math.round(n));
  return `${rounded.toLocaleString("vi-VN")}đ`;
}

function CategoryIcon({
  name,
  className,
}: {
  name: (typeof CATEGORY_ICON)[MenuCategory];
  className?: string;
}) {
  if (name === "coffee") return <Coffee className={className} />;
  if (name === "snowflake") return <Snowflake className={className} />;
  if (name === "leaf") return <Leaf className={className} />;
  if (name === "cookie") return <Cookie className={className} />;
  return <Package className={className} />;
}

export function MenuBoard({ isAdmin }: { isAdmin: boolean }) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftState>(EMPTY_DRAFT);

  const refresh = useCallback(() => {
    setItems(getMenu());
  }, []);

  useEffect(() => {
    refresh();
    setHydrated(true);
  }, [refresh]);

  useEffect(() => {
    if (!hydrated) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STORAGE_KEY) refresh();
    };
    const onCustom = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener(MENU_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(MENU_EVENT, onCustom);
    };
  }, [hydrated, refresh]);

  const grouped = useMemo(() => {
    const map: Record<MenuCategory, MenuItem[]> = {
      coffee: [],
      cold: [],
      tea: [],
      pastry: [],
      other: [],
    };
    for (const it of items) {
      map[it.category].push(it);
    }
    for (const cat of CATEGORY_ORDER) {
      map[cat].sort((a, b) => {
        if (a.highlight !== b.highlight) return a.highlight ? -1 : 1;
        return a.name.localeCompare(b.name, "vi");
      });
    }
    return map;
  }, [items]);

  const handleAdd = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmedName = draft.name.trim();
      if (!trimmedName) return;
      const price = Number.parseInt(draft.priceVnd.replace(/[^\d]/g, ""), 10);
      if (!Number.isFinite(price) || price < 0) return;
      addItem({
        name: trimmedName,
        category: draft.category,
        priceVnd: price,
        description: draft.description.trim(),
        highlight: draft.highlight,
      });
      setDraft(EMPTY_DRAFT);
      setShowAddForm(false);
    },
    [draft],
  );

  const startEdit = useCallback((item: MenuItem) => {
    setEditingId(item.id);
    setEditDraft({
      name: item.name,
      category: item.category,
      priceVnd: String(item.priceVnd),
      description: item.description,
      highlight: item.highlight,
    });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditDraft(EMPTY_DRAFT);
  }, []);

  const handleSaveEdit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!editingId) return;
      const trimmedName = editDraft.name.trim();
      if (!trimmedName) return;
      const price = Number.parseInt(
        editDraft.priceVnd.replace(/[^\d]/g, ""),
        10,
      );
      if (!Number.isFinite(price) || price < 0) return;
      updateItem(editingId, {
        name: trimmedName,
        category: editDraft.category,
        priceVnd: price,
        description: editDraft.description.trim(),
        highlight: editDraft.highlight,
      });
      cancelEdit();
    },
    [editingId, editDraft, cancelEdit],
  );

  const handleDelete = useCallback((id: string, name: string) => {
    const ok = window.confirm(`Xoá món "${name}" khỏi menu?`);
    if (!ok) return;
    removeItem(id);
  }, []);

  const handleReset = useCallback(() => {
    const ok = window.confirm(
      "Đặt lại menu về danh sách mặc định? Toàn bộ thay đổi sẽ mất.",
    );
    if (!ok) return;
    resetToDefaults();
  }, []);

  const handlePrint = useCallback(() => {
    if (typeof window === "undefined") return;
    window.print();
  }, []);

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const totalCount = items.length;

  return (
    <div className="space-y-4">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          html,
          body {
            background: #ffffff !important;
          }
          body * {
            visibility: hidden !important;
          }
          .menu-print-root,
          .menu-print-root * {
            visibility: visible !important;
          }
          .menu-print-root {
            position: absolute;
            inset: 0;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #1a1a1a !important;
            box-shadow: none !important;
            border: 0 !important;
          }
          .menu-no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="flex flex-wrap items-center justify-end gap-2 menu-no-print print:hidden">
        {isAdmin ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
            >
              <RefreshCcw className="size-4" />
              Đặt lại mặc định
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setShowAddForm((v) => !v)}
            >
              {showAddForm ? (
                <>
                  <X className="size-4" />
                  Đóng
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  Thêm món
                </>
              )}
            </Button>
          </>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handlePrint}
        >
          <Printer className="size-4" />
          In menu
        </Button>
      </div>

      {isAdmin && showAddForm ? (
        <form
          onSubmit={handleAdd}
          className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 menu-no-print print:hidden"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Tên món
              </label>
              <Input
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
                placeholder="VD: Cà phê muối"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Nhóm
              </label>
              <Select
                value={draft.category}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    category: e.target.value as MenuCategory,
                  }))
                }
              >
                {CATEGORY_ORDER.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Giá (VND)
              </label>
              <Input
                value={draft.priceVnd}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    priceVnd: e.target.value.replace(/[^\d]/g, ""),
                  }))
                }
                placeholder="35000"
                inputMode="numeric"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Mô tả ngắn (tuỳ chọn)
              </label>
              <Input
                value={draft.description}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, description: e.target.value }))
                }
                placeholder="VD: Espresso, sữa, foam mịn"
              />
            </div>
            <label className="md:col-span-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.highlight}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, highlight: e.target.checked }))
                }
                className="size-4 rounded border-input"
              />
              <span>Đánh dấu món nổi bật (hiển thị sao vàng)</span>
            </label>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddForm(false);
                setDraft(EMPTY_DRAFT);
              }}
            >
              Huỷ
            </Button>
            <Button type="submit" size="sm">
              Lưu món mới
            </Button>
          </div>
        </form>
      ) : null}

      <article className="menu-print-root mx-auto max-w-3xl rounded-2xl border bg-card p-6 shadow-sm md:p-10">
        <header className="flex flex-col items-center gap-3 border-b border-foreground/15 pb-6 text-center">
          <Image
            src="/brand/logo-96.png"
            alt="Logo quán"
            width={72}
            height={72}
            priority
            className="rounded-2xl"
          />
          <h1
            className="font-serif text-5xl font-semibold tracking-[0.18em] md:text-6xl"
            style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
          >
            MENU
          </h1>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Tổng cộng {totalCount} món · giá đã bao gồm VAT
          </p>
        </header>

        <div className="mt-6 space-y-8">
          {CATEGORY_ORDER.map((cat) => {
            const list = grouped[cat];
            if (list.length === 0) return null;
            return (
              <section key={cat}>
                <h2 className="flex items-center gap-2 border-b border-dashed border-foreground/20 pb-2 text-lg font-semibold uppercase tracking-widest">
                  <CategoryIcon
                    name={CATEGORY_ICON[cat]}
                    className="size-5 text-primary"
                  />
                  <span>{CATEGORY_LABEL[cat]}</span>
                  <span className="ml-auto text-xs font-normal text-muted-foreground">
                    {list.length} món
                  </span>
                </h2>
                <ul className="mt-3 space-y-3">
                  {list.map((it) => {
                    const isEditing = editingId === it.id;
                    if (isEditing && isAdmin) {
                      return (
                        <li
                          key={it.id}
                          className="rounded-lg border border-primary/40 bg-primary/5 p-3 menu-no-print print:hidden"
                        >
                          <form
                            onSubmit={handleSaveEdit}
                            className="space-y-2"
                          >
                            <div className="grid gap-2 md:grid-cols-2">
                              <Input
                                value={editDraft.name}
                                onChange={(e) =>
                                  setEditDraft((d) => ({
                                    ...d,
                                    name: e.target.value,
                                  }))
                                }
                                placeholder="Tên món"
                                required
                              />
                              <Select
                                value={editDraft.category}
                                onChange={(e) =>
                                  setEditDraft((d) => ({
                                    ...d,
                                    category: e.target.value as MenuCategory,
                                  }))
                                }
                              >
                                {CATEGORY_ORDER.map((c) => (
                                  <option key={c} value={c}>
                                    {CATEGORY_LABEL[c]}
                                  </option>
                                ))}
                              </Select>
                              <Input
                                value={editDraft.priceVnd}
                                onChange={(e) =>
                                  setEditDraft((d) => ({
                                    ...d,
                                    priceVnd: e.target.value.replace(
                                      /[^\d]/g,
                                      "",
                                    ),
                                  }))
                                }
                                placeholder="Giá VND"
                                inputMode="numeric"
                                required
                              />
                              <Input
                                value={editDraft.description}
                                onChange={(e) =>
                                  setEditDraft((d) => ({
                                    ...d,
                                    description: e.target.value,
                                  }))
                                }
                                placeholder="Mô tả (tuỳ chọn)"
                              />
                            </div>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={editDraft.highlight}
                                onChange={(e) =>
                                  setEditDraft((d) => ({
                                    ...d,
                                    highlight: e.target.checked,
                                  }))
                                }
                                className="size-4 rounded border-input"
                              />
                              <span>Món nổi bật</span>
                            </label>
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={cancelEdit}
                              >
                                Huỷ
                              </Button>
                              <Button type="submit" size="sm">
                                Lưu
                              </Button>
                            </div>
                          </form>
                        </li>
                      );
                    }

                    return (
                      <li key={it.id} className="group">
                        <div className="flex items-baseline gap-2">
                          {it.highlight ? (
                            <Star className="size-4 shrink-0 fill-amber-400 text-amber-500" />
                          ) : null}
                          <span className="text-base font-medium md:text-lg">
                            {it.name}
                          </span>
                          <span
                            aria-hidden
                            className="mx-1 flex-1 translate-y-[-3px] border-b border-dotted border-foreground/30"
                          />
                          <span className="font-mono text-base tabular-nums md:text-lg">
                            {formatVnd(it.priceVnd)}
                          </span>
                          {isAdmin ? (
                            <span className="ml-2 inline-flex gap-1 menu-no-print print:hidden">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => startEdit(it)}
                                aria-label={`Sửa ${it.name}`}
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(it.id, it.name)}
                                aria-label={`Xoá ${it.name}`}
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </span>
                          ) : null}
                        </div>
                        {it.description ? (
                          <p
                            className={cn(
                              "mt-0.5 text-sm text-muted-foreground",
                              it.highlight ? "pl-6" : "",
                            )}
                          >
                            {it.description}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}

          {totalCount === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Menu đang trống. {isAdmin ? "Bấm \"Thêm món\" để bắt đầu." : ""}
            </p>
          ) : null}
        </div>

        <footer className="mt-10 border-t border-foreground/15 pt-4 text-center text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          Cảm ơn quý khách
        </footer>
      </article>
    </div>
  );
}
