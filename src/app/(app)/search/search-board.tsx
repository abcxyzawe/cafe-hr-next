"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  CalendarClock,
  Clock,
  Search as SearchIcon,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SEARCH_RECENTS_EVENT,
  clearRecents,
  getRecents,
  pushRecent,
} from "@/lib/search-recents-state";

type ApiSearchItem = {
  type: string;
  id: string;
  href: string;
  title: string;
  subtitle?: string;
  avatarUrl?: string | null;
  meta?: string;
};

type ApiResponse = { items: ApiSearchItem[] };

type GroupedResults = Record<string, ApiSearchItem[]>;

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;
const MAX_PER_GROUP = 12;

const TYPE_LABEL: Record<string, string> = {
  employee: "Nhân viên",
  shift: "Ca làm",
  activity: "Hoạt động",
  task: "Công việc",
  leave: "Nghỉ phép",
  nav: "Điều hướng",
};

const TYPE_ORDER = ["employee", "shift", "activity", "task", "leave", "nav"];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function isApiResponse(value: unknown): value is ApiResponse {
  if (typeof value !== "object" || value === null) return false;
  const v = value as { items?: unknown };
  return Array.isArray(v.items);
}

function sanitizeItem(raw: unknown): ApiSearchItem | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.title !== "string") return null;
  if (typeof r.href !== "string" || typeof r.type !== "string") return null;
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    href: r.href,
    subtitle: typeof r.subtitle === "string" ? r.subtitle : undefined,
    avatarUrl:
      typeof r.avatarUrl === "string" || r.avatarUrl === null
        ? (r.avatarUrl as string | null)
        : undefined,
    meta: typeof r.meta === "string" ? r.meta : undefined,
  };
}

function groupByType(items: ApiSearchItem[]): GroupedResults {
  const map: GroupedResults = {};
  for (const item of items) {
    const arr = map[item.type] ?? [];
    arr.push(item);
    map[item.type] = arr;
  }
  return map;
}

function getTypeLabel(type: string): string {
  return TYPE_LABEL[type] ?? type.charAt(0).toUpperCase() + type.slice(1);
}

function orderTypes(types: string[]): string[] {
  return [...types].sort((a, b) => {
    const ia = TYPE_ORDER.indexOf(a);
    const ib = TYPE_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

export function SearchBoard() {
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [allItems, setAllItems] = useState<ApiSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recents, setRecents] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mount: focus + load recents + listen for changes
  useEffect(() => {
    setMounted(true);
    setRecents(getRecents());
    inputRef.current?.focus();

    function handleChange() {
      setRecents(getRecents());
    }
    function handleStorage(e: StorageEvent) {
      if (e.key === null || e.key === "cafe-hr-search-recents") {
        setRecents(getRecents());
      }
    }
    window.addEventListener(SEARCH_RECENTS_EVENT, handleChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(SEARCH_RECENTS_EVENT, handleChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Debounce query -> debounced
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebounced(query.trim());
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  // Fetch when debounced query has length >= MIN_QUERY_LENGTH.
  // /api/search currently returns the full index (no q param) — we still pass
  // q for forward compatibility, then filter client-side.
  useEffect(() => {
    if (debounced.length < MIN_QUERY_LENGTH) {
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/search?q=${encodeURIComponent(debounced)}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: unknown = await res.json();
        if (!isApiResponse(json)) throw new Error("Phản hồi không hợp lệ");
        const items = json.items
          .map(sanitizeItem)
          .filter((x): x is ApiSearchItem => x !== null);
        if (!cancelled) setAllItems(items);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Lỗi tải kết quả");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [debounced]);

  const filtered = useMemo<ApiSearchItem[]>(() => {
    if (debounced.length < MIN_QUERY_LENGTH) return [];
    const q = normalize(debounced);
    return allItems
      .map((item) => {
        const hay = normalize(
          `${item.title} ${item.subtitle ?? ""} ${item.meta ?? ""}`,
        );
        if (!hay.includes(q)) return null;
        const titleN = normalize(item.title);
        let score = 1;
        if (titleN.startsWith(q)) score = 3;
        else if (titleN.includes(q)) score = 2;
        return { item, score };
      })
      .filter((x): x is { item: ApiSearchItem; score: number } => x !== null)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.item);
  }, [allItems, debounced]);

  const grouped = useMemo<GroupedResults>(
    () => groupByType(filtered),
    [filtered],
  );

  const orderedTypes = useMemo(
    () => orderTypes(Object.keys(grouped)),
    [grouped],
  );

  const totalResults = filtered.length;

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const q = query.trim();
      if (q.length < MIN_QUERY_LENGTH) return;
      pushRecent(q);
      setRecents(getRecents());
    },
    [query],
  );

  const runRecent = useCallback((q: string) => {
    setQuery(q);
    inputRef.current?.focus();
  }, []);

  const handleClearAll = useCallback(() => {
    clearRecents();
    setRecents([]);
  }, []);

  const showRecents = mounted && recents.length > 0;
  const showHints = debounced.length < MIN_QUERY_LENGTH;

  return (
    <div className="space-y-5">
      {showRecents && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Tìm gần đây
            </p>
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-destructive"
            >
              <Trash2 className="size-3" />
              Xoá tất cả lịch sử
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recents.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => runRecent(r)}
                className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs transition-colors hover:bg-accent"
              >
                <Clock className="size-3 text-muted-foreground" />
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nhập tên nhân viên, ca làm, hoạt động..."
            aria-label="Từ khoá tìm kiếm"
            autoComplete="off"
            className="h-11 pl-9 pr-20 text-base"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Xoá"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Nhập tối thiểu {MIN_QUERY_LENGTH} ký tự. Nhấn Enter để lưu vào lịch sử.
        </p>
      </form>

      {showHints ? (
        <EmptyHints />
      ) : loading && allItems.length === 0 ? (
        <LoadingState />
      ) : error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : totalResults === 0 ? (
        <NoResults query={debounced} />
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{totalResults}</Badge>
            <span>kết quả khớp với &quot;{debounced}&quot;</span>
            {loading && (
              <span className="text-[11px] text-muted-foreground/80">
                đang cập nhật...
              </span>
            )}
          </div>
          {orderedTypes.map((type) => {
            const items = grouped[type] ?? [];
            return (
              <ResultGroup
                key={type}
                type={type}
                items={items.slice(0, MAX_PER_GROUP)}
                totalInGroup={items.length}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function ResultGroup({
  type,
  items,
  totalInGroup,
}: {
  type: string;
  items: ApiSearchItem[];
  totalInGroup: number;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {getTypeLabel(type)}
        </h3>
        <Badge variant="outline" className="text-[10px]">
          {totalInGroup}
        </Badge>
      </div>
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
          Không có {getTypeLabel(type).toLowerCase()} khớp.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card/40">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-accent"
              >
                <ResultIcon item={item} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  {item.subtitle && (
                    <p className="truncate text-xs text-muted-foreground">
                      {item.subtitle}
                    </p>
                  )}
                </div>
                {item.meta && (
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    {item.meta}
                  </span>
                )}
                <ArrowRight className="size-3.5 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {totalInGroup > items.length && (
        <p className="text-[11px] text-muted-foreground">
          Hiển thị {items.length}/{totalInGroup}. Tinh chỉnh từ khoá để thu hẹp.
        </p>
      )}
    </section>
  );
}

function ResultIcon({ item }: { item: ApiSearchItem }) {
  if (item.type === "employee") {
    return (
      <Avatar
        src={item.avatarUrl}
        alt={item.title}
        fallback={item.title}
        size={32}
      />
    );
  }
  if (item.type === "shift") {
    return (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
        <CalendarClock className="size-4" />
      </div>
    );
  }
  if (item.type === "activity") {
    return (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
        <Activity className="size-4" />
      </div>
    );
  }
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
      <Users className="size-4" />
    </div>
  );
}

function EmptyHints() {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center">
      <SearchIcon className="mx-auto size-8 text-muted-foreground/40" />
      <p className="mt-2 text-sm font-medium">Bắt đầu nhập để tìm kiếm</p>
      <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
        Tìm theo tên nhân viên, vai trò, ngày ca làm hoặc nội dung hoạt động.
        Kết quả cập nhật trực tiếp khi bạn gõ.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-1.5">
        <HintChip icon={Users} label="Nhân viên" />
        <HintChip icon={CalendarClock} label="Ca làm" />
        <HintChip icon={Activity} label="Hoạt động" />
      </div>
    </div>
  );
}

function HintChip({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground">
      <Icon className="size-3" />
      {label}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="space-y-2" aria-busy="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border bg-card/40 px-3 py-2.5"
        >
          <div className="size-8 animate-pulse rounded-md bg-muted" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted/70" />
          </div>
        </div>
      ))}
    </div>
  );
}

function NoResults({ query }: { query: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center">
      <SearchIcon className="mx-auto size-8 text-muted-foreground/40" />
      <p className="mt-2 text-sm font-medium">
        Không tìm thấy kết quả cho &quot;{query}&quot;
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Thử từ khoá khác, kiểm tra chính tả hoặc bỏ dấu.
      </p>
    </div>
  );
}
