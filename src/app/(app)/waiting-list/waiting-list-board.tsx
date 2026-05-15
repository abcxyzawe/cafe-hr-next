"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Hourglass,
  Phone,
  Plus,
  Trash2,
  UserMinus,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  STORAGE_KEY,
  WAITING_EVENT,
  addEntry,
  clearStale,
  getEntries,
  notify,
  removeEntry,
  setStatus,
  type WaitingEntry,
  type WaitingStatus,
} from "@/lib/waiting-list-state";

type Tab = WaitingStatus;

const TAB_LABELS: Record<Tab, string> = {
  waiting: "Đang chờ",
  seated: "Đã ngồi",
  left: "Đã rời",
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatElapsedMs(ms: number): string {
  if (ms < 0) ms = 0;
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${pad2(m)}:${pad2(s)}`;
}

function formatTimeOfDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function waitToneClasses(ms: number): {
  border: string;
  pillBg: string;
  pillText: string;
  label: string;
} {
  const min = ms / 60_000;
  if (min < 5) {
    return {
      border: "border-emerald-200 dark:border-emerald-900/60",
      pillBg: "bg-emerald-100 dark:bg-emerald-500/15",
      pillText: "text-emerald-800 dark:text-emerald-200",
      label: "Mới đến",
    };
  }
  if (min < 15) {
    return {
      border: "border-amber-200 dark:border-amber-900/60",
      pillBg: "bg-amber-100 dark:bg-amber-500/15",
      pillText: "text-amber-800 dark:text-amber-200",
      label: "Đang chờ",
    };
  }
  return {
    border: "border-rose-200 dark:border-rose-900/60",
    pillBg: "bg-rose-100 dark:bg-rose-500/15",
    pillText: "text-rose-800 dark:text-rose-200",
    label: "Chờ lâu",
  };
}

function playChime(): void {
  if (typeof window === "undefined") return;
  type AudioCtor = typeof AudioContext;
  type WindowWithWebkit = Window & { webkitAudioContext?: AudioCtor };
  const w = window as WindowWithWebkit;
  const Ctor: AudioCtor | undefined = window.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) return;
  try {
    const ctx = new Ctor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 400;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.24);
    osc.onended = () => {
      try {
        ctx.close();
      } catch {
        // ignore
      }
    };
  } catch {
    // ignore
  }
}

function tryBrowserNotify(name: string): void {
  if (typeof window === "undefined") return;
  if (typeof Notification === "undefined") return;
  const title = `Bàn của ${name} đã sẵn sàng`;
  const opts: NotificationOptions = {
    body: "Mời khách vào ngồi.",
    silent: false,
  };
  const fire = () => {
    try {
      new Notification(title, opts);
    } catch {
      // ignore
    }
  };
  if (Notification.permission === "granted") {
    fire();
    return;
  }
  if (Notification.permission === "denied") return;
  Notification.requestPermission()
    .then((perm) => {
      if (perm === "granted") fire();
    })
    .catch(() => {
      // ignore
    });
}

export function WaitingListBoard() {
  const [entries, setEntries] = useState<WaitingEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<Tab>("waiting");
  const [showForm, setShowForm] = useState(false);
  const [now, setNow] = useState<number>(0);

  // Form state
  const [name, setName] = useState("");
  const [partySize, setPartySize] = useState("2");
  const [phone, setPhone] = useState("");
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setEntries(getEntries());
    setNow(Date.now());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const reread = () => setEntries(getEntries());
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STORAGE_KEY) reread();
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<{ key?: string }>).detail;
      if (!detail || !detail.key || detail.key === STORAGE_KEY) reread();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(WAITING_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(WAITING_EVENT, onCustom);
    };
  }, [hydrated]);

  const hasWaiting = useMemo(
    () => entries.some((e) => e.status === "waiting"),
    [entries],
  );

  // Tick every second only when there is at least one waiting entry.
  useEffect(() => {
    if (!hydrated) return;
    if (!hasWaiting) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [hydrated, hasWaiting]);

  useEffect(() => {
    if (showForm) nameInputRef.current?.focus();
  }, [showForm]);

  const stats = useMemo(() => {
    const waiting = entries.filter((e) => e.status === "waiting");
    const inQueue = waiting.length;
    if (inQueue === 0) {
      return { inQueue, avgMs: 0, longestMs: 0 };
    }
    const ref = now > 0 ? now : Date.now();
    let total = 0;
    let longest = 0;
    for (const e of waiting) {
      const t = Date.parse(e.arrivedAt);
      if (Number.isNaN(t)) continue;
      const dur = ref - t;
      total += dur;
      if (dur > longest) longest = dur;
    }
    return {
      inQueue,
      avgMs: Math.round(total / inQueue),
      longestMs: longest,
    };
  }, [entries, now]);

  const counts = useMemo(() => {
    let w = 0;
    let s = 0;
    let l = 0;
    for (const e of entries) {
      if (e.status === "waiting") w += 1;
      else if (e.status === "seated") s += 1;
      else l += 1;
    }
    return { waiting: w, seated: s, left: l };
  }, [entries]);

  const visibleEntries = useMemo(() => {
    const filtered = entries.filter((e) => e.status === tab);
    if (tab === "waiting") {
      filtered.sort(
        (a, b) => Date.parse(a.arrivedAt) - Date.parse(b.arrivedAt),
      );
    } else {
      filtered.sort((a, b) => {
        const ar = Date.parse(a.seatedAt ?? a.arrivedAt);
        const br = Date.parse(b.seatedAt ?? b.arrivedAt);
        return br - ar;
      });
    }
    return filtered;
  }, [entries, tab]);

  const resetForm = useCallback(() => {
    setName("");
    setPartySize("2");
    setPhone("");
  }, []);

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmedName = name.trim();
      if (trimmedName === "") return;
      const sizeNum = Number.parseInt(partySize, 10);
      const size = Number.isFinite(sizeNum) ? sizeNum : 2;
      addEntry({
        name: trimmedName,
        partySize: size,
        phone: phone.trim() === "" ? undefined : phone.trim(),
      });
      resetForm();
      setShowForm(false);
      setTab("waiting");
    },
    [name, partySize, phone, resetForm],
  );

  const handleNotify = useCallback((entry: WaitingEntry) => {
    notify(entry.id);
    setStatus(entry.id, "seated");
    playChime();
    tryBrowserNotify(entry.name);
  }, []);

  const handleSeat = useCallback((id: string) => {
    setStatus(id, "seated");
  }, []);

  const handleLeave = useCallback((id: string) => {
    setStatus(id, "left");
  }, []);

  const handleRemove = useCallback((entry: WaitingEntry) => {
    if (typeof window === "undefined") return;
    const ok = window.confirm(
      `Xoá khách "${entry.name}" khỏi danh sách? Thao tác này không thể hoàn tác.`,
    );
    if (!ok) return;
    removeEntry(entry.id);
  }, []);

  const handleClearStale = useCallback(() => {
    if (typeof window === "undefined") return;
    const ok = window.confirm(
      "Xoá các khách đã ngồi/đã rời quá 24 giờ? Hàng chờ hiện tại sẽ được giữ nguyên.",
    );
    if (!ok) return;
    const removed = clearStale(24);
    if (removed === 0) {
      window.alert("Không có khách cũ nào để xoá.");
    } else {
      window.alert(`Đã xoá ${removed} khách cũ.`);
    }
  }, []);

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <StatsRow stats={stats} />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          {(["waiting", "seated", "left"] as Tab[]).map((t) => {
            const active = t === tab;
            const count =
              t === "waiting"
                ? counts.waiting
                : t === "seated"
                  ? counts.seated
                  : counts.left;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
                aria-pressed={active}
              >
                {TAB_LABELS[t]}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                    active
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-background text-foreground",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? <ChevronUp className="size-4" /> : <Plus className="size-4" />}
          {showForm ? "Đóng biểu mẫu" : "Thêm khách"}
        </Button>
      </div>

      {showForm ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Khách mới</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit}
              className="grid gap-3 sm:grid-cols-2"
              aria-label="Thêm khách vào danh sách chờ"
            >
              <div className="sm:col-span-2">
                <Label htmlFor="wl-name">Tên khách *</Label>
                <Input
                  id="wl-name"
                  ref={nameInputRef}
                  type="text"
                  value={name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setName(e.target.value)
                  }
                  required
                  maxLength={60}
                  placeholder="Ví dụ: Anh Nam"
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="wl-size">Số khách *</Label>
                <Input
                  id="wl-size"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={10}
                  step={1}
                  value={partySize}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setPartySize(e.target.value)
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="wl-phone">SĐT (tuỳ chọn)</Label>
                <Input
                  id="wl-phone"
                  type="tel"
                  value={phone}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setPhone(e.target.value)
                  }
                  maxLength={20}
                  placeholder="0xxxxxxxxx"
                  autoComplete="off"
                />
              </div>
              <div className="flex items-center justify-end gap-2 sm:col-span-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                  }}
                >
                  Huỷ
                </Button>
                <Button type="submit" size="sm">
                  <Plus className="size-4" />
                  Thêm vào hàng chờ
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-3">
        {visibleEntries.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {tab === "waiting"
                ? "Chưa có khách nào đang chờ. Bấm \"Thêm khách\" để bắt đầu."
                : tab === "seated"
                  ? "Chưa có khách nào được sắp xếp ngồi."
                  : "Chưa có khách nào rời đi."}
            </CardContent>
          </Card>
        ) : (
          visibleEntries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              now={now}
              onNotify={handleNotify}
              onSeat={handleSeat}
              onLeave={handleLeave}
              onRemove={handleRemove}
            />
          ))
        )}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        <span>
          Khách đã ngồi/đã rời quá 24 giờ có thể được dọn để giữ danh sách gọn
          gàng.
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClearStale}
        >
          <ChevronDown className="size-4" />
          Xoá khách cũ
        </Button>
      </div>
    </div>
  );
}

function StatsRow({
  stats,
}: {
  stats: { inQueue: number; avgMs: number; longestMs: number };
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatTile
        icon={<Users className="size-4" />}
        label="Đang chờ"
        value={String(stats.inQueue)}
        tone="primary"
      />
      <StatTile
        icon={<Hourglass className="size-4" />}
        label="Chờ trung bình"
        value={stats.inQueue === 0 ? "—" : formatElapsedMs(stats.avgMs)}
        tone="muted"
      />
      <StatTile
        icon={<Clock className="size-4" />}
        label="Chờ lâu nhất"
        value={stats.inQueue === 0 ? "—" : formatElapsedMs(stats.longestMs)}
        tone={
          stats.longestMs >= 15 * 60_000
            ? "rose"
            : stats.longestMs >= 5 * 60_000
              ? "amber"
              : "muted"
        }
      />
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "primary" | "muted" | "amber" | "rose";
}) {
  const toneClass =
    tone === "primary"
      ? "bg-primary/10 text-primary"
      : tone === "amber"
        ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200"
        : tone === "rose"
          ? "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200"
          : "bg-muted text-muted-foreground";
  return (
    <div className="rounded-xl border bg-card px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-lg",
            toneClass,
          )}
        >
          {icon}
        </span>
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums" suppressHydrationWarning>
        {value}
      </div>
    </div>
  );
}

type EntryCardProps = {
  entry: WaitingEntry;
  now: number;
  onNotify: (entry: WaitingEntry) => void;
  onSeat: (id: string) => void;
  onLeave: (id: string) => void;
  onRemove: (entry: WaitingEntry) => void;
};

function EntryCard({
  entry,
  now,
  onNotify,
  onSeat,
  onLeave,
  onRemove,
}: EntryCardProps) {
  const arrivedAtMs = Date.parse(entry.arrivedAt);
  const ref = now > 0 ? now : Date.now();
  const elapsedMs = Number.isNaN(arrivedAtMs) ? 0 : ref - arrivedAtMs;
  const tone = waitToneClasses(elapsedMs);
  const isWaiting = entry.status === "waiting";

  return (
    <Card
      className={cn(
        "border",
        isWaiting ? tone.border : "border-border",
      )}
    >
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-foreground">
              {entry.name}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              <Users className="size-3" />
              {entry.partySize} khách
            </span>
            {isWaiting ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                  tone.pillBg,
                  tone.pillText,
                )}
              >
                <Clock className="size-3" />
                <span suppressHydrationWarning>{formatElapsedMs(elapsedMs)}</span>
                <span className="font-normal">· {tone.label}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {entry.status === "seated" ? "Đã ngồi" : "Đã rời"}
              </span>
            )}
            {entry.notifiedAt ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">
                <Bell className="size-3" />
                Đã báo
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" />
              Đến lúc{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatTimeOfDay(entry.arrivedAt)}
              </span>
            </span>
            {entry.phone ? (
              <a
                href={`tel:${entry.phone}`}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-accent hover:text-accent-foreground"
              >
                <Phone className="size-3" />
                <span className="font-medium text-foreground">
                  {entry.phone}
                </span>
              </a>
            ) : null}
            {entry.seatedAt ? (
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="size-3" />
                Ngồi lúc{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatTimeOfDay(entry.seatedAt)}
                </span>
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {isWaiting ? (
            <>
              <Button
                type="button"
                size="sm"
                onClick={() => onNotify(entry)}
                title="Báo khách – phát chuông và thông báo trình duyệt"
              >
                <Bell className="size-4" />
                Sẵn sàng
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => onSeat(entry.id)}
              >
                <CheckCircle2 className="size-4" />
                Họ đã ngồi
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onLeave(entry.id)}
              >
                <UserMinus className="size-4" />
                Bỏ qua
              </Button>
            </>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onRemove(entry)}
            aria-label={`Xoá khách ${entry.name}`}
            title="Xoá khỏi danh sách"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
