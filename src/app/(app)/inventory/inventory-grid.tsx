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
  Coffee,
  Cookie,
  CupSoda,
  Minus,
  Milk,
  Package,
  Plus,
  RotateCcw,
  ScrollText,
  Sprout,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { INVENTORY_ITEMS, type InventoryItem } from "@/lib/inventory-presets";
import {
  INVENTORY_EVENT,
  STORAGE_KEY,
  getInventoryState,
  getLatestUpdatedAt,
  getQtyFor,
  resetToDefaults,
  setItemQty,
  type InventoryState,
} from "@/lib/inventory-state";

function IconFor({
  name,
  className,
}: {
  name: InventoryItem["iconName"];
  className?: string;
}) {
  if (name === "coffee") return <Coffee className={className} />;
  if (name === "milk") return <Milk className={className} />;
  if (name === "package") return <Package className={className} />;
  if (name === "scroll") return <ScrollText className={className} />;
  if (name === "cup") return <CupSoda className={className} />;
  if (name === "sprout") return <Sprout className={className} />;
  return <Cookie className={className} />;
}

function formatQty(qty: number): string {
  if (Number.isInteger(qty)) return String(qty);
  return qty.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function formatUpdatedAt(iso: string | null): string {
  if (!iso) return "Chưa có thay đổi nào";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Chưa có thay đổi nào";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  return `${hh}:${mm} ${dd}/${mo}/${d.getFullYear()}`;
}

type StockLevel = "ok" | "low" | "empty";

function levelFor(qty: number, threshold: number): StockLevel {
  if (qty <= 0) return "empty";
  if (qty < threshold) {
    // critical (rose) when at or under half the threshold; otherwise amber
    return qty <= threshold / 2 ? "empty" : "low";
  }
  return "ok";
}

export function InventoryGrid({ isAdmin }: { isAdmin: boolean }) {
  const [state, setState] = useState<InventoryState>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(getInventoryState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const reread = () => setState(getInventoryState());
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STORAGE_KEY) reread();
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<{ key?: string }>).detail;
      if (!detail || !detail.key || detail.key === STORAGE_KEY) reread();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(INVENTORY_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(INVENTORY_EVENT, onCustom);
    };
  }, [hydrated]);

  const latestUpdatedAt = useMemo(() => getLatestUpdatedAt(state), [state]);

  const handleAdjust = useCallback(
    (id: string, delta: number) => {
      const current = getQtyFor(state, id);
      setItemQty(id, current + delta);
    },
    [state],
  );

  const handleSet = useCallback((id: string, value: number) => {
    setItemQty(id, value);
  }, []);

  const handleReset = useCallback(() => {
    if (typeof window === "undefined") return;
    const ok = window.confirm(
      "Đặt lại toàn bộ tồn kho về giá trị mặc định? Lịch sử số lượng hiện tại sẽ bị xoá.",
    );
    if (!ok) return;
    resetToDefaults();
  }, []);

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INVENTORY_ITEMS.map((it) => (
            <Skeleton key={it.id} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
        <div className="text-xs text-muted-foreground">
          Lần cập nhật gần nhất:{" "}
          <span className="font-medium text-foreground">
            {formatUpdatedAt(latestUpdatedAt)}
          </span>
        </div>
        {isAdmin ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
          >
            <RotateCcw className="size-4" />
            Đặt lại tất cả về mặc định
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INVENTORY_ITEMS.map((item) => (
          <InventoryCard
            key={item.id}
            item={item}
            qty={getQtyFor(state, item.id)}
            updatedAt={state[item.id]?.updatedAt ?? null}
            onAdjust={handleAdjust}
            onSet={handleSet}
          />
        ))}
      </div>
    </div>
  );
}

type InventoryCardProps = {
  item: InventoryItem;
  qty: number;
  updatedAt: string | null;
  onAdjust: (id: string, delta: number) => void;
  onSet: (id: string, value: number) => void;
};

function InventoryCard({
  item,
  qty,
  updatedAt,
  onAdjust,
  onSet,
}: InventoryCardProps) {
  const [input, setInput] = useState<string>("");
  const level = levelFor(qty, item.threshold);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const v = Number(input.replace(",", "."));
    if (!Number.isFinite(v)) return;
    onSet(item.id, v);
    setInput("");
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              "bg-primary/10 text-primary",
            )}
          >
            <IconFor name={item.iconName} className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base">{item.name}</CardTitle>
            <p className="text-xs text-muted-foreground">
              Ngưỡng cảnh báo: {formatQty(item.threshold)} {item.unit}
            </p>
          </div>
          <StockChip level={level} />
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "text-4xl font-semibold tabular-nums tracking-tight",
              level === "empty" && "text-rose-600 dark:text-rose-400",
              level === "low" && "text-amber-700 dark:text-amber-300",
            )}
          >
            {formatQty(qty)}
          </span>
          <span className="text-sm text-muted-foreground">{item.unit}</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAdjust(item.id, -5)}
            disabled={qty <= 0}
            aria-label={`Giảm 5 ${item.unit}`}
          >
            <Minus className="size-3.5" />5
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAdjust(item.id, -1)}
            disabled={qty <= 0}
            aria-label={`Giảm 1 ${item.unit}`}
          >
            <Minus className="size-3.5" />1
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAdjust(item.id, 1)}
            aria-label={`Tăng 1 ${item.unit}`}
          >
            <Plus className="size-3.5" />1
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAdjust(item.id, 5)}
            aria-label={`Tăng 5 ${item.unit}`}
          >
            <Plus className="size-3.5" />5
          </Button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-1.5"
          aria-label={`Đặt số lượng cho ${item.name}`}
        >
          <Input
            type="text"
            inputMode="decimal"
            placeholder="Đặt số lượng…"
            value={input}
            onChange={handleInputChange}
            className="h-8 text-sm"
          />
          <Button type="submit" size="sm" disabled={input.trim() === ""}>
            Lưu
          </Button>
        </form>

        <p className="mt-auto pt-1 text-[11px] text-muted-foreground">
          {updatedAt
            ? `Cập nhật lúc ${formatUpdatedAt(updatedAt)}`
            : "Đang ở giá trị mặc định"}
        </p>
      </CardContent>
    </Card>
  );
}

function StockChip({ level }: { level: StockLevel }) {
  if (level === "ok") return null;
  if (level === "empty") {
    return (
      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800 dark:bg-rose-500/15 dark:text-rose-200">
        Hết hàng
      </span>
    );
  }
  return (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
      Sắp hết
    </span>
  );
}
