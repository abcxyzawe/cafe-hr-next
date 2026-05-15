"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import {
  Check,
  Coffee,
  Copy,
  MessageSquareHeart,
  Search,
  ShieldCheck,
  Smile,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CATEGORY_LABEL,
  GREETING_SCRIPTS,
  type GreetingCategory,
  type GreetingScript,
} from "@/lib/greeting-scripts";

const ICON_MAP: Record<GreetingScript["iconName"], LucideIcon> = {
  users: Users,
  coffee: Coffee,
  sparkles: Sparkles,
  "shield-check": ShieldCheck,
  smile: Smile,
  "message-square-heart": MessageSquareHeart,
};

const CATEGORY_CHIP: Record<GreetingCategory, string> = {
  welcome:
    "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300 border-sky-200 dark:border-sky-900/40",
  menu: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-900/40",
  upsell:
    "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200 dark:border-violet-900/40",
  complaint:
    "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-900/40",
  farewell:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/40",
  ask: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/40",
};

const CATEGORIES: GreetingCategory[] = [
  "welcome",
  "menu",
  "upsell",
  "complaint",
  "farewell",
  "ask",
];

type FilterValue = "all" | GreetingCategory;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function ScriptCard({ script }: { script: GreetingScript }) {
  const Icon = ICON_MAP[script.iconName];
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(script.text);
      setCopied(true);
      toast.success("Đã sao chép kịch bản");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Không sao chép được. Hãy thử chọn và Ctrl+C.");
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card/60 p-4 shadow-sm transition-colors hover:bg-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
          <div className="space-y-1">
            <h3 className="font-semibold leading-tight">{script.title}</h3>
            <span
              className={
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium " +
                CATEGORY_CHIP[script.category]
              }
            >
              {CATEGORY_LABEL[script.category]}
            </span>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          aria-label="Sao chép kịch bản"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Đã chép" : "Sao chép"}
        </Button>
      </div>

      <blockquote className="border-l-4 border-primary/40 bg-muted/30 px-3 py-2 text-sm italic leading-relaxed text-foreground/90">
        “{script.text}”
      </blockquote>

      {script.notes ? (
        <div className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-[12px] leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground/70">Mẹo: </span>
          {script.notes}
        </div>
      ) : null}
    </div>
  );
}

export function GreetingsBoard() {
  const [query, setQuery] = useState<string>("");
  const [filter, setFilter] = useState<FilterValue>("all");

  const counts = useMemo(() => {
    const map: Record<GreetingCategory, number> = {
      welcome: 0,
      menu: 0,
      upsell: 0,
      complaint: 0,
      farewell: 0,
      ask: 0,
    };
    for (const s of GREETING_SCRIPTS) {
      map[s.category] += 1;
    }
    return map;
  }, []);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return GREETING_SCRIPTS.filter((s) => {
      if (filter !== "all" && s.category !== filter) return false;
      if (!q) return true;
      const hay = normalize(`${s.title} ${s.text}`);
      return hay.includes(q);
    });
  }, [query, filter]);

  function handleQueryChange(e: ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={handleQueryChange}
            placeholder="Tìm theo tiêu đề hoặc nội dung kịch bản..."
            className="pl-9"
            aria-label="Tìm kiếm kịch bản"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterChip
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label="Tất cả"
            count={GREETING_SCRIPTS.length}
          />
          {CATEGORIES.map((cat) => (
            <FilterChip
              key={cat}
              active={filter === cat}
              onClick={() => setFilter(cat)}
              label={CATEGORY_LABEL[cat]}
              count={counts[cat]}
            />
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
          Không tìm thấy kịch bản phù hợp. Thử từ khoá khác hoặc bỏ bộ lọc.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((s) => (
            <ScriptCard key={s.id} script={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
        (active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-input bg-background text-foreground hover:bg-accent/40")
      }
      aria-pressed={active}
    >
      <span>{label}</span>
      <span
        className={
          "rounded-full px-1.5 text-[10px] tabular-nums " +
          (active
            ? "bg-primary-foreground/20 text-primary-foreground"
            : "bg-muted text-muted-foreground")
        }
      >
        {count}
      </span>
    </button>
  );
}
