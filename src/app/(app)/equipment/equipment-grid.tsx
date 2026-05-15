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
  CheckCircle2,
  Coffee,
  CupSoda,
  Flame,
  Milk,
  RotateCcw,
  Scale,
  Snowflake,
  Sparkles,
  Thermometer,
  Wrench,
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
import { EQUIPMENT_ITEMS, type EquipmentItem } from "@/lib/equipment-presets";
import {
  EQUIPMENT_EVENT,
  STORAGE_KEY,
  daysSince,
  getEquipmentState,
  recordService,
  resetAll,
  statusFor,
  type EquipmentRecord,
  type EquipmentState,
} from "@/lib/equipment-state";

function IconFor({
  name,
  className,
}: {
  name: EquipmentItem["iconName"];
  className?: string;
}) {
  if (name === "coffee") return <Coffee className={className} />;
  if (name === "milk") return <Milk className={className} />;
  if (name === "thermometer") return <Thermometer className={className} />;
  if (name === "snowflake") return <Snowflake className={className} />;
  if (name === "wrench") return <Wrench className={className} />;
  if (name === "scale") return <Scale className={className} />;
  if (name === "cup") return <CupSoda className={className} />;
  return <Flame className={className} />;
}

const CATEGORY_LABEL: Record<EquipmentItem["category"], string> = {
  machine: "Máy móc",
  appliance: "Thiết bị",
  furniture: "Nội thất",
  tool: "Dụng cụ",
};

function formatIsoDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function addDaysIso(iso: string, days: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

type Status = "ok" | "due-soon" | "overdue" | "never-serviced";

export function EquipmentGrid({ isAdmin }: { isAdmin: boolean }) {
  const [state, setState] = useState<EquipmentState>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(getEquipmentState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const reread = () => setState(getEquipmentState());
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STORAGE_KEY) reread();
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<{ key?: string }>).detail;
      if (!detail || !detail.key || detail.key === STORAGE_KEY) reread();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(EQUIPMENT_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EQUIPMENT_EVENT, onCustom);
    };
  }, [hydrated]);

  const overdueCount = useMemo(() => {
    let n = 0;
    for (const item of EQUIPMENT_ITEMS) {
      if (statusFor(state[item.id], item.intervalDays) === "overdue") n += 1;
    }
    return n;
  }, [state]);

  const handleRecord = useCallback((id: string, notes?: string) => {
    recordService(id, notes);
  }, []);

  const handleReset = useCallback(() => {
    if (typeof window === "undefined") return;
    const ok = window.confirm(
      "Đặt lại toàn bộ lịch sử bảo dưỡng? Mọi mốc đã ghi nhận sẽ bị xoá khỏi thiết bị này.",
    );
    if (!ok) return;
    resetAll();
  }, []);

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EQUIPMENT_ITEMS.map((it) => (
            <Skeleton key={it.id} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
        <div className="text-xs text-muted-foreground">
          {overdueCount > 0 ? (
            <span className="font-medium text-rose-700 dark:text-rose-300">
              Có {overdueCount} thiết bị đang quá hạn bảo dưỡng.
            </span>
          ) : (
            <span>Tất cả thiết bị đang trong chu kỳ bảo dưỡng cho phép.</span>
          )}
        </div>
        {isAdmin ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
          >
            <RotateCcw className="size-4" />
            Đặt lại tất cả
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {EQUIPMENT_ITEMS.map((item) => (
          <EquipmentCard
            key={item.id}
            item={item}
            record={state[item.id]}
            onRecord={handleRecord}
          />
        ))}
      </div>
    </div>
  );
}

type EquipmentCardProps = {
  item: EquipmentItem;
  record: EquipmentRecord | undefined;
  onRecord: (id: string, notes?: string) => void;
};

function EquipmentCard({ item, record, onRecord }: EquipmentCardProps) {
  const [notesInput, setNotesInput] = useState<string>("");

  useEffect(() => {
    setNotesInput("");
  }, [record?.updatedAt]);

  const status: Status = statusFor(record, item.intervalDays);
  const since = record ? daysSince(record.lastServiced) : null;
  const nextDue = record ? addDaysIso(record.lastServiced, item.intervalDays) : null;
  const daysUntilDue =
    record && since !== null ? item.intervalDays - since : null;

  const handleNotesChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNotesInput(e.target.value);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = notesInput.trim();
    onRecord(item.id, trimmed === "" ? undefined : trimmed);
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
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {CATEGORY_LABEL[item.category]}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Chu kỳ {item.intervalDays} ngày
              </span>
            </div>
          </div>
          <StatusChip status={status} />
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">
        <p className="text-xs text-muted-foreground">{item.description}</p>

        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border bg-muted/40 p-2">
            <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Bảo dưỡng gần nhất
            </dt>
            <dd className="mt-0.5 font-medium tabular-nums">
              {record ? formatIsoDate(record.lastServiced) : "Chưa ghi nhận"}
            </dd>
            {since !== null ? (
              <dd className="text-[10px] text-muted-foreground">
                {since === 0 ? "Hôm nay" : `${since} ngày trước`}
              </dd>
            ) : null}
          </div>
          <div className="rounded-lg border bg-muted/40 p-2">
            <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Lần kế tiếp
            </dt>
            <dd className="mt-0.5 font-medium tabular-nums">
              {nextDue ? formatIsoDate(nextDue) : "—"}
            </dd>
            {daysUntilDue !== null ? (
              <dd
                className={cn(
                  "text-[10px]",
                  status === "overdue"
                    ? "text-rose-700 dark:text-rose-300"
                    : status === "due-soon"
                      ? "text-amber-700 dark:text-amber-300"
                      : "text-muted-foreground",
                )}
              >
                {daysUntilDue < 0
                  ? `Quá hạn ${Math.abs(daysUntilDue)} ngày`
                  : daysUntilDue === 0
                    ? "Đến hạn hôm nay"
                    : `Còn ${daysUntilDue} ngày`}
              </dd>
            ) : null}
          </div>
        </dl>

        {record && record.notes.trim() !== "" ? (
          <div className="rounded-lg border border-dashed bg-background p-2 text-xs">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Ghi chú
            </span>
            <p className="mt-0.5 whitespace-pre-wrap text-foreground">
              {record.notes}
            </p>
          </div>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className="mt-auto flex flex-col gap-2 pt-1"
          aria-label={`Ghi nhận bảo dưỡng cho ${item.name}`}
        >
          <Input
            type="text"
            placeholder="Ghi chú bảo dưỡng (tuỳ chọn)…"
            value={notesInput}
            onChange={handleNotesChange}
            className="h-8 text-sm"
            maxLength={200}
          />
          <Button type="submit" size="sm" className="w-full">
            <CheckCircle2 className="size-4" />
            Ghi nhận bảo dưỡng
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function StatusChip({ status }: { status: Status }) {
  if (status === "ok") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">
        <Sparkles className="size-3" />
        Đạt chuẩn
      </span>
    );
  }
  if (status === "due-soon") {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
        Sắp đến hạn
      </span>
    );
  }
  if (status === "overdue") {
    return (
      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800 dark:bg-rose-500/15 dark:text-rose-200">
        Quá hạn
      </span>
    );
  }
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
      Chưa bảo dưỡng
    </span>
  );
}
