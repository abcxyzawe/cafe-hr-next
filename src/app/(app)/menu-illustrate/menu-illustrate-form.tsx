"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { toast } from "sonner";
import {
  Download,
  ListPlus,
  Loader2,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CATEGORY_LABEL,
  STORAGE_KEY,
  type MenuItem,
} from "@/lib/menu-state";
import { generateMenuIllustrationAction } from "./generate-action";
import {
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  INITIAL_MENU_ILLUSTRATE_STATE,
  ITEM_NAME_MAX,
  ITEM_NAME_MIN,
  STYLE_OPTIONS,
  type MenuIllustrateState,
} from "./menu-illustrate-types";

function readMenuFromStorage(): MenuItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const items: MenuItem[] = [];
    for (const v of parsed) {
      if (!v || typeof v !== "object") continue;
      const r = v as Record<string, unknown>;
      if (typeof r.id !== "string" || typeof r.name !== "string") continue;
      const category =
        r.category === "coffee" ||
        r.category === "cold" ||
        r.category === "tea" ||
        r.category === "pastry" ||
        r.category === "other"
          ? r.category
          : "other";
      const description =
        typeof r.description === "string" ? r.description : "";
      const priceVnd =
        typeof r.priceVnd === "number" && Number.isFinite(r.priceVnd)
          ? r.priceVnd
          : 0;
      const highlight = r.highlight === true;
      const createdAt =
        typeof r.createdAt === "string"
          ? r.createdAt
          : new Date(0).toISOString();
      items.push({
        id: r.id,
        name: r.name,
        category,
        description,
        priceVnd,
        highlight,
        createdAt,
      });
    }
    return items;
  } catch {
    return [];
  }
}

export function MenuIllustrateForm() {
  const [state, formAction, pending] = useActionState<
    MenuIllustrateState,
    FormData
  >(generateMenuIllustrationAction, INITIAL_MENU_ILLUSTRATE_STATE);

  const [itemName, setItemName] = useState<string>(state.itemName);
  const [description, setDescription] = useState<string>(state.description);
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  const lastErrorRef = useRef<string | null>(null);
  const lastImageRef = useRef<string | null>(null);

  useEffect(() => {
    if (state.error && state.error !== lastErrorRef.current) {
      lastErrorRef.current = state.error;
      toast.error(state.error);
    }
    if (!state.error) {
      lastErrorRef.current = null;
    }
  }, [state.error]);

  useEffect(() => {
    if (state.imageUrl && state.imageUrl !== lastImageRef.current) {
      lastImageRef.current = state.imageUrl;
      setItemName(state.itemName);
      setDescription(state.description);
    }
  }, [state.imageUrl, state.itemName, state.description]);

  function handleOpenPicker() {
    setMenuItems(readMenuFromStorage());
    setPickerOpen(true);
  }

  function handleClosePicker() {
    setPickerOpen(false);
  }

  function handlePick(item: MenuItem) {
    setItemName(item.name.slice(0, ITEM_NAME_MAX));
    if (item.description.trim().length > 0) {
      setDescription(item.description.slice(0, DESCRIPTION_MAX));
    }
    setPickerOpen(false);
    toast.success(`Đã điền "${item.name}" vào form.`);
  }

  function handleNameChange(e: ChangeEvent<HTMLInputElement>) {
    setItemName(e.target.value.slice(0, ITEM_NAME_MAX));
  }

  function handleDescChange(e: ChangeEvent<HTMLInputElement>) {
    setDescription(e.target.value.slice(0, DESCRIPTION_MAX));
  }

  const hasImage = state.imageUrl !== null;

  function handleDownload() {
    if (!state.imageUrl) return;
    try {
      const a = document.createElement("a");
      a.href = state.imageUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      const stamp = new Date().toISOString().slice(0, 10);
      const safeName =
        state.itemName.replace(/[^a-zA-Z0-9-_]+/g, "-").slice(0, 40) ||
        "menu-item";
      a.download = `menu-${safeName}-${stamp}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Đã mở/tải ảnh minh họa.");
    } catch {
      toast.error("Không tải được ảnh. Vui lòng thử lại.");
    }
  }

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-5">
        <div className="flex items-center justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenPicker}
            disabled={pending}
          >
            <ListPlus className="size-4" />
            Chọn từ menu đã lưu
          </Button>
        </div>

        {pickerOpen ? (
          <div className="space-y-2 rounded-md border bg-card/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">
                Chọn món để điền nhanh
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClosePicker}
              >
                <X className="size-4" />
                Đóng
              </Button>
            </div>
            {menuItems.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Chưa có món nào trong localStorage{" "}
                <code className="font-mono">{STORAGE_KEY}</code>. Hãy thêm
                món tại trang <span className="font-medium">/menu</span>.
              </p>
            ) : (
              <ul className="grid max-h-64 gap-1 overflow-y-auto">
                {menuItems.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => handlePick(m)}
                      className="flex w-full items-center justify-between gap-2 rounded-md border bg-background px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent/40"
                    >
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {m.name}
                      </span>
                      <span className="shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground">
                        {CATEGORY_LABEL[m.category]}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        <fieldset className="space-y-2" disabled={pending}>
          <Label htmlFor="mi-item-name" className="text-sm font-medium">
            Tên món
          </Label>
          <Input
            id="mi-item-name"
            name="itemName"
            type="text"
            required
            minLength={ITEM_NAME_MIN}
            maxLength={ITEM_NAME_MAX}
            value={itemName}
            onChange={handleNameChange}
            placeholder="VD: Bạc xỉu dừa"
          />
          <p className="text-xs text-muted-foreground">
            {ITEM_NAME_MIN}–{ITEM_NAME_MAX} ký tự ·{" "}
            <span className="tabular-nums">{itemName.length}</span>/
            {ITEM_NAME_MAX}
          </p>
        </fieldset>

        <fieldset className="space-y-2" disabled={pending}>
          <Label htmlFor="mi-description" className="text-sm font-medium">
            Mô tả ngắn (1 dòng)
          </Label>
          <Input
            id="mi-description"
            name="description"
            type="text"
            required
            minLength={DESCRIPTION_MIN}
            maxLength={DESCRIPTION_MAX}
            value={description}
            onChange={handleDescChange}
            placeholder="VD: Espresso pha sữa dừa, foam mịn, đá viên"
          />
          <p className="text-xs text-muted-foreground">
            {DESCRIPTION_MIN}–{DESCRIPTION_MAX} ký tự ·{" "}
            <span className="tabular-nums">{description.length}</span>/
            {DESCRIPTION_MAX}
          </p>
        </fieldset>

        <fieldset className="space-y-2" disabled={pending}>
          <legend className="text-sm font-medium">Phong cách minh họa</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {STYLE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-md border bg-card/50 px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent/30 has-[:checked]:border-primary has-[:checked]:bg-primary/10"
              >
                <input
                  type="radio"
                  name="style"
                  value={opt.value}
                  defaultChecked={opt.value === state.style}
                  className="size-4"
                  required
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex items-center justify-end gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : hasImage ? (
              <RefreshCw className="size-4" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {pending
              ? "Đang vẽ ~10s..."
              : hasImage
                ? "Tạo lại"
                : "Tạo minh họa"}
          </Button>
        </div>
      </form>

      {pending && !hasImage ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang vẽ minh họa món... khoảng 10 giây.
        </div>
      ) : null}

      {hasImage && state.imageUrl ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="size-3" />
              Minh họa đã tạo
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleDownload}
              >
                <Download className="size-4" />
                Tải
              </Button>
            </div>
          </div>

          <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-md">
            <div className="relative aspect-square w-full bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={state.imageUrl}
                alt={`Minh họa AI: ${state.itemName}`}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="space-y-0.5 border-t p-3">
              <div className="text-sm font-semibold leading-tight">
                {state.itemName}
              </div>
              <div className="text-xs leading-snug text-muted-foreground">
                {state.description}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
