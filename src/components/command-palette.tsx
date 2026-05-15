"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Users,
  CalendarClock,
  Activity,
  LayoutDashboard,
  ClipboardCheck,
  Wallet,
  BarChart3,
  Settings,
  ArrowRight,
  Clock,
  X,
  Plane,
  ListChecks,
  StickyNote,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn, ROLE_LABELS } from "@/lib/utils";
import { loadRecentEmployees, type RecentEmployee } from "@/lib/recent-employees";

type SearchItem = {
  type: "employee" | "shift" | "activity" | "nav";
  id: string;
  href: string;
  title: string;
  subtitle?: string;
  avatarUrl?: string | null;
  meta?: string;
};

const NAV_ITEMS: SearchItem[] = [
  { type: "nav", id: "nav-home", href: "/", title: "Tổng quan", subtitle: "Trang chủ + KPI" },
  { type: "nav", id: "nav-emp", href: "/employees", title: "Nhân viên", subtitle: "Danh sách + CRUD" },
  { type: "nav", id: "nav-shifts", href: "/shifts", title: "Ca làm", subtitle: "Lịch tuần" },
  { type: "nav", id: "nav-att", href: "/attendance", title: "Chấm công", subtitle: "Check-in / check-out" },
  { type: "nav", id: "nav-pay", href: "/payroll", title: "Lương", subtitle: "Bảng lương theo tháng" },
  { type: "nav", id: "nav-rep", href: "/reports", title: "Báo cáo", subtitle: "Phân tích & charts" },
  { type: "nav", id: "nav-set", href: "/settings", title: "Cài đặt", subtitle: "Hồ sơ, mật khẩu, users" },
];

const NAV_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  "nav-home": LayoutDashboard,
  "nav-emp": Users,
  "nav-shifts": CalendarClock,
  "nav-att": ClipboardCheck,
  "nav-pay": Wallet,
  "nav-rep": BarChart3,
  "nav-set": Settings,
};

const TYPE_LABEL: Record<SearchItem["type"], string> = {
  employee: "Nhân viên",
  shift: "Ca làm",
  activity: "Hoạt động",
  nav: "Điều hướng",
};

type QuickFilter = {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
};

const QUICK_FILTERS: QuickFilter[] = [
  {
    id: "qf-pending-leaves",
    label: "Đơn nghỉ chờ duyệt",
    href: "/leave?status=pending",
    icon: Plane,
    tone: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
  {
    id: "qf-shifts-week",
    label: "Ca tuần này",
    href: "/shifts",
    icon: CalendarClock,
    tone: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  },
  {
    id: "qf-attendance-now",
    label: "Đang trong ca",
    href: "/attendance",
    icon: ClipboardCheck,
    tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  {
    id: "qf-tasks-overdue",
    label: "Việc quá hạn",
    href: "/tasks?filter=overdue",
    icon: ListChecks,
    tone: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  },
];

const RECENT_KEY = "cafe-hr-cmdk-recent";
const MAX_RECENT = 5;

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string").slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

function saveRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
  } catch {
    // ignore quota errors
  }
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [allItems, setAllItems] = useState<SearchItem[]>([]);
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const [recentEmployees, setRecentEmployees] = useState<RecentEmployee[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Cmd+K / Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Fetch search index lazily on first open
  useEffect(() => {
    if (!open || allItems.length > 0) return;
    fetch("/api/search")
      .then((r) => r.json())
      .then((d: { items: SearchItem[] }) => setAllItems(d.items))
      .catch(() => {});
  }, [open, allItems.length]);

  // Reset state + load recent when opening
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setRecent(loadRecent());
      setRecentEmployees(loadRecentEmployees());
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  function commitSearch(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    const next = [trimmed, ...recent.filter((r) => r !== trimmed)].slice(0, MAX_RECENT);
    setRecent(next);
    saveRecent(next);
  }

  function removeRecent(q: string) {
    const next = recent.filter((r) => r !== q);
    setRecent(next);
    saveRecent(next);
  }

  const filtered = useMemo(() => {
    const pool: SearchItem[] = [...NAV_ITEMS, ...allItems];
    if (!query.trim()) {
      // Default: show nav first, then 5 employees, 5 activities
      return [
        ...NAV_ITEMS,
        ...pool.filter((i) => i.type === "employee").slice(0, 5),
        ...pool.filter((i) => i.type === "activity").slice(0, 5),
      ];
    }
    const q = normalize(query);
    return pool
      .map((item) => {
        const hay = normalize(item.title + " " + (item.subtitle ?? "") + " " + (item.meta ?? ""));
        if (!hay.includes(q)) return null;
        // Score: title prefix > title contains > subtitle
        const titleN = normalize(item.title);
        let score = 0;
        if (titleN.startsWith(q)) score = 3;
        else if (titleN.includes(q)) score = 2;
        else score = 1;
        return { item, score };
      })
      .filter((x): x is { item: SearchItem; score: number } => x !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 25)
      .map((x) => x.item);
  }, [query, allItems]);

  // Group by type for display
  const grouped = useMemo(() => {
    const order: SearchItem["type"][] = ["nav", "employee", "shift", "activity"];
    const map = new Map<SearchItem["type"], SearchItem[]>();
    for (const item of filtered) {
      const arr = map.get(item.type) ?? [];
      arr.push(item);
      map.set(item.type, arr);
    }
    return order
      .filter((t) => map.has(t))
      .map((t) => ({ type: t, items: map.get(t)! }));
  }, [filtered]);

  // Flat list with index for keyboard nav
  const flatIndex = useMemo(() => {
    const flat: SearchItem[] = [];
    for (const g of grouped) flat.push(...g.items);
    return flat;
  }, [grouped]);

  useEffect(() => {
    if (active >= flatIndex.length) setActive(0);
  }, [flatIndex.length, active]);

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, flatIndex.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flatIndex[active];
      if (item) {
        if (query.trim()) commitSearch(query);
        router.push(item.href);
        setOpen(false);
      }
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-sm transition-colors hover:bg-accent md:inline-flex"
        title="Mở command palette (Ctrl+K)"
      >
        <Search className="size-3.5" />
        Tìm kiếm...
        <kbd className="ml-2 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
          Ctrl K
        </kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-xl border bg-popover shadow-2xl">
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Tìm nhân viên, ca, hoạt động — hoặc gõ /Cài đặt..."
            aria-label="Tìm kiếm nhân viên, ca, hoạt động"
            className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            Esc
          </kbd>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!query.trim() && (
            <div className="mb-3 space-y-3 px-1 pt-1">
              <div>
                <p className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Truy cập nhanh
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_FILTERS.map((qf) => {
                    const Icon = qf.icon;
                    return (
                      <button
                        key={qf.id}
                        type="button"
                        onClick={() => {
                          router.push(qf.href);
                          setOpen(false);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent"
                      >
                        <span
                          className={cn(
                            "flex size-4 items-center justify-center rounded-sm",
                            qf.tone,
                          )}
                        >
                          <Icon className="size-2.5" />
                        </span>
                        {qf.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {recentEmployees.length > 0 && (
                <div>
                  <p className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Nhân viên gần đây
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {recentEmployees.slice(0, 5).map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => {
                          router.push(`/employees/${emp.id}`);
                          setOpen(false);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full border bg-card py-0.5 pl-0.5 pr-2.5 text-xs font-medium transition-colors hover:bg-accent"
                      >
                        <Avatar
                          src={emp.avatarUrl}
                          alt={emp.name}
                          fallback={emp.name}
                          size={20}
                        />
                        <span className="max-w-[120px] truncate">{emp.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {ROLE_LABELS[emp.role] ?? emp.role}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {recent.length > 0 && (
                <div>
                  <p className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Tìm gần đây
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {recent.map((r) => (
                      <span
                        key={r}
                        className="inline-flex items-center gap-1 rounded-full border bg-muted/40 pl-2.5 text-xs"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setQuery(r);
                            inputRef.current?.focus();
                          }}
                          className="flex items-center gap-1 py-1 transition-colors hover:text-primary"
                        >
                          <Clock className="size-3 text-muted-foreground" />
                          {r}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRecent(r)}
                          className="flex h-full items-center px-1.5 text-muted-foreground hover:text-foreground"
                          aria-label={`Xoá ${r}`}
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {flatIndex.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Không tìm thấy kết quả cho &quot;{query}&quot;
            </div>
          ) : (
            grouped.map((g) => (
              <div key={g.type} className="mb-2 last:mb-0">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {TYPE_LABEL[g.type]}
                </div>
                {g.items.map((item) => {
                  const idx = flatIndex.indexOf(item);
                  const isActive = idx === active;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (query.trim()) commitSearch(query);
                        router.push(item.href);
                        setOpen(false);
                      }}
                      onMouseEnter={() => setActive(idx)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors",
                        isActive && "bg-accent",
                      )}
                    >
                      <ItemIcon item={item} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{item.title}</p>
                        {item.subtitle && (
                          <p className="truncate text-xs text-muted-foreground">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                      {isActive && (
                        <ArrowRight className="size-3.5 text-muted-foreground" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}

          {query.trim().length > 0 && (
            <button
              type="button"
              onClick={() => {
                commitSearch(query);
                router.push(
                  `/notes-search?q=${encodeURIComponent(query.trim())}`,
                );
                setOpen(false);
              }}
              className="mt-2 flex w-full items-center gap-3 rounded-md border border-dashed bg-muted/30 px-2 py-2 text-left text-sm transition-colors hover:bg-accent"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                <StickyNote className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  <span aria-hidden>🔍</span> Tìm &quot;
                  <span className="font-medium">{query.trim()}</span>&quot;
                  trong ghi chú →
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  Tìm kiếm toàn văn trong ghi chú nhân viên
                </p>
              </div>
              <ArrowRight className="size-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-2 text-[10px] text-muted-foreground">
          <span>
            <kbd className="rounded bg-card px-1 py-0.5 font-mono">↑↓</kbd> chọn ·{" "}
            <kbd className="rounded bg-card px-1 py-0.5 font-mono">↵</kbd> mở
          </span>
          <span>
            Mở bất kỳ lúc nào với{" "}
            <kbd className="rounded bg-card px-1 py-0.5 font-mono">Ctrl K</kbd>
          </span>
        </div>
      </div>
    </div>
  );
}

function ItemIcon({ item }: { item: SearchItem }) {
  if (item.type === "nav") {
    const Icon = NAV_ICON[item.id] ?? LayoutDashboard;
    return (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
        <Icon className="size-4" />
      </div>
    );
  }
  if (item.type === "employee") {
    return <Avatar src={item.avatarUrl} alt={item.title} fallback={item.title} size={32} />;
  }
  if (item.type === "shift") {
    return (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
        <CalendarClock className="size-4" />
      </div>
    );
  }
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
      <Activity className="size-4" />
    </div>
  );
}
