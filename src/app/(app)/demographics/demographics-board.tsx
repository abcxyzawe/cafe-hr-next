"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Minus, Plus, RotateCcw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AGE_BUCKETS,
  AGE_LABEL,
  DEMOGRAPHICS_EVENT,
  PURPOSE_BUCKETS,
  PURPOSE_LABEL,
  STORAGE_KEY,
  decrement,
  dominantAge,
  dominantPurpose,
  exportLast30DaysCsv,
  getTodayCounts,
  increment,
  resetToday,
  totalForDay,
  type AgeBucket,
  type DayCounts,
  type PurposeBucket,
} from "@/lib/demographics-state";

function emptyDayPlaceholder(): DayCounts {
  return {
    date: "",
    age: { under20: 0, "20to30": 0, "31to50": 0, over50: 0, unsure: 0 },
    purpose: {
      study: 0,
      work: 0,
      social: 0,
      dating: 0,
      takeaway: 0,
      other: 0,
    },
  };
}

function downloadCsv(content: string, filename: string): void {
  if (typeof window === "undefined") return;
  try {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    // ignore
  }
}

export function DemographicsBoard() {
  const [hydrated, setHydrated] = useState(false);
  const [today, setToday] = useState<DayCounts>(() => emptyDayPlaceholder());

  useEffect(() => {
    setToday(getTodayCounts());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const reread = () => setToday(getTodayCounts());
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STORAGE_KEY) reread();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(DEMOGRAPHICS_EVENT, reread);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(DEMOGRAPHICS_EVENT, reread);
    };
  }, [hydrated]);

  const ageTotal = useMemo(() => totalForDay(today), [today]);
  const purposeTotal = useMemo(() => {
    let t = 0;
    for (const k of PURPOSE_BUCKETS) t += today.purpose[k];
    return t;
  }, [today]);

  const topAge = useMemo(() => dominantAge(today), [today]);
  const topPurpose = useMemo(() => dominantPurpose(today), [today]);

  const handleInc = useCallback(
    (category: "age" | "purpose", bucket: string) => {
      increment(category, bucket);
    },
    [],
  );
  const handleDec = useCallback(
    (category: "age" | "purpose", bucket: string) => {
      decrement(category, bucket);
    },
    [],
  );

  const handleReset = useCallback(() => {
    if (typeof window !== "undefined") {
      const ok = window.confirm("Đặt lại toàn bộ số đếm hôm nay?");
      if (!ok) return;
    }
    resetToday();
  }, []);

  const handleExport = useCallback(() => {
    const csv = exportLast30DaysCsv();
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(csv, `demographics-${stamp}.csv`);
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Tổng khách hôm nay"
          value={hydrated ? String(ageTotal) : "–"}
        />
        <StatTile
          label="Độ tuổi nhiều nhất"
          value={
            hydrated && topAge ? AGE_LABEL[topAge] : hydrated ? "Chưa có" : "–"
          }
        />
        <StatTile
          label="Mục đích phổ biến"
          value={
            hydrated && topPurpose
              ? PURPOSE_LABEL[topPurpose]
              : hydrated
                ? "Chưa có"
                : "–"
          }
        />
      </div>

      <CounterSection<AgeBucket>
        title="Độ tuổi"
        description="Bấm +1 mỗi khi có khách thuộc nhóm tuổi tương ứng."
        buckets={AGE_BUCKETS}
        labels={AGE_LABEL}
        getCount={(b) => today.age[b]}
        total={ageTotal}
        onInc={(b) => handleInc("age", b)}
        onDec={(b) => handleDec("age", b)}
        hydrated={hydrated}
      />

      <CounterSection<PurposeBucket>
        title="Mục đích"
        description="Đếm theo lý do khách ghé quán."
        buckets={PURPOSE_BUCKETS}
        labels={PURPOSE_LABEL}
        getCount={(b) => today.purpose[b]}
        total={purposeTotal}
        onInc={(b) => handleInc("purpose", b)}
        onDec={(b) => handleDec("purpose", b)}
        hydrated={hydrated}
      />

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="text-xs text-muted-foreground">
            Dữ liệu lưu trên trình duyệt thiết bị này.
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={!hydrated}
            >
              <Download className="size-4" />
              Xuất CSV (30 ngày)
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleReset}
              disabled={!hydrated}
            >
              <RotateCcw className="size-4" />
              Đặt lại hôm nay
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

type CounterSectionProps<TBucket extends string> = {
  title: string;
  description: string;
  buckets: TBucket[];
  labels: Record<TBucket, string>;
  getCount: (bucket: TBucket) => number;
  total: number;
  onInc: (bucket: TBucket) => void;
  onDec: (bucket: TBucket) => void;
  hydrated: boolean;
};

function CounterSection<TBucket extends string>({
  title,
  description,
  buckets,
  labels,
  getCount,
  total,
  onInc,
  onDec,
  hydrated,
}: CounterSectionProps<TBucket>) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {buckets.map((b) => {
            const count = hydrated ? getCount(b) : 0;
            return (
              <div
                key={b}
                className="rounded-xl border bg-background p-3 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">{labels[b]}</div>
                  <div className="text-xl font-semibold tabular-nums">
                    {hydrated ? count : "–"}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onInc(b)}
                    aria-label={`Tăng ${labels[b]}`}
                    className="flex-1"
                    disabled={!hydrated}
                  >
                    <Plus className="size-4" />
                    +1
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onDec(b)}
                    aria-label={`Giảm ${labels[b]}`}
                    disabled={!hydrated || count === 0}
                  >
                    <Minus className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Phân bố
          </div>
          <div className="space-y-1.5">
            {buckets.map((b) => {
              const count = hydrated ? getCount(b) : 0;
              const pct =
                hydrated && total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={b} className="flex items-center gap-2">
                  <div className="w-20 shrink-0 text-xs text-muted-foreground">
                    {labels[b]}
                  </div>
                  <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-accent/40">
                    <div
                      className={cn(
                        "h-full rounded-full bg-primary transition-all",
                      )}
                      style={{ width: `${pct}%` }}
                      aria-hidden
                    />
                  </div>
                  <div className="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                    {hydrated ? `${count} · ${pct}%` : "–"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
