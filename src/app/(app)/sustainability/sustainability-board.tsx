"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Leaf, Recycle, Coffee, Droplets, Gauge, CalendarDays } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  SUSTAIN_EVENT,
  STORAGE_KEY,
  emptyDay,
  getDayFor,
  getLastNDays,
  setDayField,
  todayKey,
  type SustainDay,
  type SustainNumericField,
} from "@/lib/sustainability-state";
import { computeSustainStats } from "@/lib/sustainability-stats";
import { SustainChart } from "@/components/sustain-chart";

type FieldDef = {
  key: SustainNumericField;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  hint: string;
  icon: typeof Leaf;
  iconClass: string;
};

const FIELDS: FieldDef[] = [
  {
    key: "compostKg",
    label: "Ủ phân",
    unit: "kg",
    min: 0,
    max: 50,
    step: 0.5,
    hint: "Bã cà phê, vỏ trái cây…",
    icon: Leaf,
    iconClass: "bg-lime-100 text-lime-700 dark:bg-lime-500/15 dark:text-lime-300",
  },
  {
    key: "recyclingKg",
    label: "Tái chế",
    unit: "kg",
    min: 0,
    max: 50,
    step: 0.5,
    hint: "Giấy, nhựa, lon…",
    icon: Recycle,
    iconClass: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  },
  {
    key: "reusableCupsOffered",
    label: "Ly tái sử dụng — đã đề nghị",
    unit: "ly",
    min: 0,
    max: 500,
    step: 1,
    hint: "Số lần đề nghị khách dùng ly riêng",
    icon: Coffee,
    iconClass: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  },
  {
    key: "reusableCupsAccepted",
    label: "Ly tái sử dụng — đã nhận",
    unit: "ly",
    min: 0,
    max: 500,
    step: 1,
    hint: "Số khách đồng ý",
    icon: Coffee,
    iconClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  {
    key: "waterSavedLiters",
    label: "Nước tiết kiệm",
    unit: "lít",
    min: 0,
    max: 500,
    step: 1,
    hint: "Ước tính so với ngày thường",
    icon: Droplets,
    iconClass: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
  },
];

type Drafts = Record<SustainNumericField, string>;

function dayToDrafts(day: SustainDay): Drafts {
  return {
    compostKg: String(day.compostKg),
    recyclingKg: String(day.recyclingKg),
    reusableCupsOffered: String(day.reusableCupsOffered),
    reusableCupsAccepted: String(day.reusableCupsAccepted),
    waterSavedLiters: String(day.waterSavedLiters),
  };
}

function StatTile({
  label,
  value,
  sub,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: "emerald" | "sky" | "amber" | "violet";
  icon: typeof Leaf;
}) {
  const toneClass: Record<typeof tone, string> = {
    emerald:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    sky: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
    amber:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    violet:
      "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            toneClass[tone],
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-semibold leading-tight tracking-tight">
            {value}
          </div>
          {sub ? (
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {sub}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function SustainabilityBoard() {
  const [hydrated, setHydrated] = useState(false);
  const [date, setDate] = useState<string>(() => todayKey());
  const [today, setToday] = useState<SustainDay>(() => emptyDay(todayKey()));
  const [history, setHistory] = useState<SustainDay[]>(() =>
    Array.from({ length: 14 }, (_, i) => {
      // placeholder before hydration; will be replaced
      void i;
      return emptyDay(todayKey());
    }),
  );
  const [drafts, setDrafts] = useState<Drafts>(() =>
    dayToDrafts(emptyDay(todayKey())),
  );

  const reload = useCallback(() => {
    const d = todayKey();
    setDate(d);
    const td = getDayFor(d);
    setToday(td);
    setDrafts(dayToDrafts(td));
    setHistory(getLastNDays(14));
  }, []);

  useEffect(() => {
    reload();
    setHydrated(true);
  }, [reload]);

  useEffect(() => {
    if (!hydrated) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STORAGE_KEY) reload();
    };
    const onCustom = () => reload();
    window.addEventListener("storage", onStorage);
    window.addEventListener(SUSTAIN_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(SUSTAIN_EVENT, onCustom);
    };
  }, [hydrated, reload]);

  // Day rollover
  useEffect(() => {
    const id = window.setInterval(() => {
      const next = todayKey();
      if (next !== date) reload();
    }, 60_000);
    return () => window.clearInterval(id);
  }, [date, reload]);

  const stats = useMemo(() => computeSustainStats(history), [history]);

  const handleDraftChange = useCallback(
    (field: SustainNumericField, value: string) => {
      setDrafts((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleCommit = useCallback(
    (field: SustainNumericField) => {
      const raw = drafts[field];
      const parsed = Number.parseFloat(raw);
      const def = FIELDS.find((f) => f.key === field);
      if (!def) return;
      let v = Number.isFinite(parsed) ? parsed : 0;
      if (v < def.min) v = def.min;
      if (v > def.max) v = def.max;
      setDayField(date, field, v);
    },
    [drafts, date],
  );

  const weekTrashKg =
    (stats.thisWeekTotals.compostKg ?? 0) +
    (stats.thisWeekTotals.recyclingKg ?? 0);
  const lastWeekTrashKg =
    (stats.lastWeekTotals.compostKg ?? 0) +
    (stats.lastWeekTotals.recyclingKg ?? 0);
  const trashDelta = weekTrashKg - lastWeekTrashKg;

  const acceptanceLabel =
    stats.acceptanceRatePct === null
      ? "—"
      : `${stats.acceptanceRatePct}%`;

  const acceptanceSub = (() => {
    const offered = stats.thisWeekTotals.reusableCupsOffered ?? 0;
    const accepted = stats.thisWeekTotals.reusableCupsAccepted ?? 0;
    if (offered === 0) return "Chưa có dữ liệu tuần";
    return `${accepted}/${offered} ly tuần này`;
  })();

  const todayTotalsLine = (() => {
    if (!hydrated) return "Đang tải…";
    const t = today;
    return `Hôm nay: ${t.compostKg + t.recyclingKg} kg rác · ${
      t.reusableCupsAccepted
    }/${t.reusableCupsOffered} ly · ${t.waterSavedLiters} L nước`;
  })();

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Eco score"
          value={hydrated ? `${stats.ecoScore}/100` : "—"}
          sub="7 ngày gần nhất"
          tone="emerald"
          icon={Gauge}
        />
        <StatTile
          label="Rác xử lý tuần này"
          value={hydrated ? `${weekTrashKg.toFixed(1)} kg` : "—"}
          sub={
            hydrated
              ? `${trashDelta >= 0 ? "+" : ""}${trashDelta.toFixed(1)} kg vs tuần trước`
              : undefined
          }
          tone="sky"
          icon={Recycle}
        />
        <StatTile
          label="Tỉ lệ chấp nhận ly tái dùng"
          value={hydrated ? acceptanceLabel : "—"}
          sub={hydrated ? acceptanceSub : undefined}
          tone="amber"
          icon={Coffee}
        />
        <StatTile
          label="Số ngày đã ghi"
          value={hydrated ? String(stats.daysWithData) : "—"}
          sub="Tính từ trước đến nay"
          tone="violet"
          icon={CalendarDays}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Nhập liệu hôm nay</CardTitle>
          <CardDescription className="text-xs">
            {todayTotalsLine}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FIELDS.map((f) => {
              const Icon = f.icon;
              const inputId = `sustain-${f.key}`;
              return (
                <div key={f.key} className="flex flex-col gap-1.5">
                  <Label
                    htmlFor={inputId}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-md",
                        f.iconClass,
                      )}
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <span>{f.label}</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id={inputId}
                      type="number"
                      inputMode="decimal"
                      min={f.min}
                      max={f.max}
                      step={f.step}
                      value={drafts[f.key]}
                      onChange={(e) =>
                        handleDraftChange(f.key, e.target.value)
                      }
                      onBlur={() => handleCommit(f.key)}
                      disabled={!hydrated}
                      className="pr-12"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] text-muted-foreground">
                      {f.unit}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{f.hint}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">14 ngày gần nhất</CardTitle>
          <CardDescription className="text-xs">
            Tổng rác (kg) — ủ phân + tái chế, xếp chồng theo ngày.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hydrated ? (
            <SustainChart data={history} />
          ) : (
            <div className="h-[220px] w-full animate-pulse rounded-md bg-muted/40" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
