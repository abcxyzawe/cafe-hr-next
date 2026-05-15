"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Bell,
  BellOff,
  Calendar,
  CheckCheck,
  Clock,
  ListChecks,
  Megaphone,
  Plane,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  HIGH_PRIORITY_EVENTS,
  TOAST_MAP,
  TOAST_EVENT_KEYS,
  defaultToastPrefs,
  loadToastPrefs,
  saveToastPrefs,
  type ToastEventKey,
  type ToastPrefs,
  type ToastVariant,
} from "@/components/realtime-toaster";
import {
  loadQuietHours,
  loadSnoozeUntil,
  setQuietHours,
  setSnoozeUntil,
  type QuietHoursConfig,
} from "@/lib/quiet-hours";

const SNOOZE_MS = 60 * 60 * 1000;

function minutesToHHMM(m: number): string {
  const h = Math.floor(m / 60).toString().padStart(2, "0");
  const mm = (m % 60).toString().padStart(2, "0");
  return `${h}:${mm}`;
}

function hhmmToMinutes(s: string): number | null {
  const re = /^(\d{1,2}):(\d{2})$/;
  const m = re.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return h * 60 + mm;
}

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m <= 0) return s + "s";
  return m + "m " + s.toString().padStart(2, "0") + "s";
}

type RowMeta = {
  label: string;
  description: string;
};

const ROW_META: Record<ToastEventKey, RowMeta> = {
  "attendance.checkin": {
    label: "Nhân viên check-in",
    description: "Hiện toast khi có người chấm công vào ca.",
  },
  "attendance.checkout": {
    label: "Nhân viên check-out",
    description: "Hiện toast khi có người kết thúc ca.",
  },
  "employee.create": {
    label: "Thêm nhân viên mới",
    description: "Báo khi admin tạo hồ sơ nhân viên.",
  },
  "leave.create": {
    label: "Đơn nghỉ phép mới",
    description: "Báo khi nhân viên gửi đơn xin nghỉ.",
  },
  "leave.approve": {
    label: "Đơn nghỉ được duyệt",
    description: "Báo khi quản lý duyệt đơn xin nghỉ.",
  },
  "leave.reject": {
    label: "Đơn nghỉ bị từ chối",
    description: "Báo khi quản lý từ chối đơn xin nghỉ.",
  },
  "task.create": {
    label: "Công việc mới được giao",
    description: "Báo khi có task mới được tạo.",
  },
  "task.complete": {
    label: "Công việc hoàn thành",
    description: "Báo khi có người hoàn thành task.",
  },
  "shift.create": {
    label: "Ca làm việc mới",
    description: "Báo khi có ca làm việc được lên lịch.",
  },
  "kudos.give": {
    label: "Lời khen mới",
    description: "Báo khi có người tặng lời khen cho nhân viên.",
  },
  "announcement.broadcast": {
    label: "Thông báo nội bộ",
    description: "Toast nổi bật khi quản trị viên gửi thông báo cho cả công ty.",
  },
};

type CategoryId =
  | "attendance"
  | "shift"
  | "leave"
  | "task"
  | "announcement"
  | "other";

type CategoryMeta = {
  id: CategoryId;
  label: string;
  icon: LucideIcon;
};

const CATEGORY_ORDER: readonly CategoryMeta[] = [
  { id: "attendance", label: "Chấm công", icon: Clock },
  { id: "shift", label: "Ca làm", icon: Calendar },
  { id: "leave", label: "Nghỉ phép", icon: Plane },
  { id: "task", label: "Công việc", icon: ListChecks },
  { id: "announcement", label: "Thông báo", icon: Megaphone },
  { id: "other", label: "Khác", icon: Bell },
] as const;

function categoryFor(key: ToastEventKey): CategoryId {
  const prefix = key.split(".", 1)[0];
  switch (prefix) {
    case "attendance":
      return "attendance";
    case "shift":
      return "shift";
    case "leave":
      return "leave";
    case "task":
      return "task";
    case "announcement":
      return "announcement";
    default:
      return "other";
  }
}

function fireToast(action: ToastEventKey) {
  const cfg = TOAST_MAP[action];
  const Icon = cfg.icon;
  const message = (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 size-4 shrink-0 opacity-80" />
      <div className="min-w-0">
        <p className="text-xs font-semibold opacity-80">{cfg.prefix}</p>
        <p className="text-sm leading-snug">Đây là thông báo thử nghiệm</p>
      </div>
    </div>
  );
  const variant: ToastVariant = cfg.variant;
  const opts = { duration: 3000 };
  if (variant === "success") toast.success(message, opts);
  else if (variant === "warning") toast.warning(message, opts);
  else if (variant === "info") toast.info(message, opts);
  else toast(message, opts);
}

export function NotificationPrefs() {
  const [prefs, setPrefs] = useState<ToastPrefs>(() => defaultToastPrefs(true));
  const [hydrated, setHydrated] = useState(false);
  const [quiet, setQuiet] = useState<QuietHoursConfig>({
    enabled: false,
    startMinutes: 22 * 60,
    endMinutes: 6 * 60,
  });
  const [snoozeUntil, setSnoozeUntilState] = useState<number | null>(null);
  const [now, setNow] = useState<number>(0);

  useEffect(() => {
    setNow(Date.now());
    setPrefs(loadToastPrefs());
    setQuiet(loadQuietHours());
    setSnoozeUntilState(loadSnoozeUntil());
    setHydrated(true);
  }, []);

  // Tick every second so the "Đang tắt còn Xp" countdown updates live.
  useEffect(() => {
    if (snoozeUntil === null) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= snoozeUntil) {
        setSnoozeUntilState(null);
        window.clearInterval(id);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [snoozeUntil]);

  function updateQuiet(next: QuietHoursConfig) {
    setQuiet(next);
    setQuietHours(next);
  }

  function activateSnooze() {
    const until = Date.now() + SNOOZE_MS;
    setSnoozeUntil(until);
    setSnoozeUntilState(until);
    setNow(Date.now());
    toast.success("Đã tắt thông báo trong 1 giờ");
  }

  function cancelSnooze() {
    setSnoozeUntil(null);
    setSnoozeUntilState(null);
    toast.info("Đã bật lại thông báo");
  }

  function update(next: ToastPrefs) {
    setPrefs(next);
    saveToastPrefs(next);
  }

  function toggleOne(key: ToastEventKey) {
    update({ ...prefs, [key]: !prefs[key] });
  }

  function setAll(value: boolean) {
    update(defaultToastPrefs(value));
  }

  const offCount = TOAST_EVENT_KEYS.filter((k) => !prefs[k]).length;
  const totalCount = TOAST_EVENT_KEYS.length;
  const onCount = totalCount - offCount;

  const grouped = useMemo(() => {
    const map = new Map<CategoryId, ToastEventKey[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat.id, []);
    for (const key of TOAST_EVENT_KEYS) {
      const list = map.get(categoryFor(key));
      if (list) list.push(key);
    }
    return CATEGORY_ORDER.filter((c) => (map.get(c.id) ?? []).length > 0).map(
      (c) => ({ meta: c, keys: map.get(c.id) ?? [] }),
    );
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Trạng thái:</span>
          {hydrated ? (
            <>
              <Badge variant="outline">
                Đang nhận {onCount} / {totalCount} loại
              </Badge>
              {offCount === 0 ? (
                <Badge variant="success">Đang bật tất cả</Badge>
              ) : offCount === totalCount ? (
                <Badge variant="secondary">Đang tắt tất cả</Badge>
              ) : (
                <Badge variant="warning">Đã tắt {offCount} loại</Badge>
              )}
            </>
          ) : (
            <Badge variant="secondary">Đang tải…</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setAll(true)}
            disabled={!hydrated}
          >
            <CheckCheck className="size-4" />
            Bật tất cả
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setAll(false)}
            disabled={!hydrated}
          >
            <X className="size-4" />
            Tắt tất cả
          </Button>
        </div>
      </div>

      <section className="space-y-3 rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Giờ yên lặng</h3>
            <p className="text-xs text-muted-foreground">
              Trong khoảng này thông báo sẽ không hiện. Hỗ trợ qua đêm (vd
              22:00–06:00).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {quiet.enabled ? "Đang bật" : "Đang tắt"}
            </span>
            <ToggleSwitch
              checked={quiet.enabled}
              disabled={!hydrated}
              onChange={() => updateQuiet({ ...quiet, enabled: !quiet.enabled })}
              label="Bật giờ yên lặng"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">Từ</span>
            <input
              type="time"
              value={minutesToHHMM(quiet.startMinutes)}
              disabled={!hydrated || !quiet.enabled}
              onChange={(e) => {
                const v = hhmmToMinutes(e.target.value);
                if (v === null) return;
                updateQuiet({ ...quiet, startMinutes: v });
              }}
              className="h-9 rounded-md border bg-background px-2 text-sm disabled:opacity-50"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">Đến</span>
            <input
              type="time"
              value={minutesToHHMM(quiet.endMinutes)}
              disabled={!hydrated || !quiet.enabled}
              onChange={(e) => {
                const v = hhmmToMinutes(e.target.value);
                if (v === null) return;
                updateQuiet({ ...quiet, endMinutes: v });
              }}
              className="h-9 rounded-md border bg-background px-2 text-sm disabled:opacity-50"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          {snoozeUntil !== null && snoozeUntil > now ? (
            <>
              <Badge variant="warning">
                Đang tắt còn {formatRemaining(snoozeUntil - now)}
              </Badge>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={cancelSnooze}
                disabled={!hydrated}
              >
                Bật lại
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={activateSnooze}
              disabled={!hydrated}
            >
              <BellOff className="size-4" />
              Tắt 1 giờ
            </Button>
          )}
        </div>
      </section>

      <div className="space-y-4">
        {grouped.map(({ meta: catMeta, keys }) => {
          const CatIcon = catMeta.icon;
          const enabledInCat = keys.filter((k) => prefs[k]).length;
          return (
            <section key={catMeta.id} className="rounded-lg border">
              <header className="flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2.5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CatIcon className="size-4 text-muted-foreground" />
                  <span>{catMeta.label}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {hydrated ? `${enabledInCat}/${keys.length} đang bật` : ""}
                </span>
              </header>
              <div className="divide-y">
                {keys.map((key) => {
                  const cfg = TOAST_MAP[key];
                  const rowMeta = ROW_META[key];
                  const Icon = cfg.icon;
                  const enabled = prefs[key];
                  const isHighPriority = HIGH_PRIORITY_EVENTS.has(key);
                  return (
                    <div
                      key={key}
                      className="flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium">
                            {rowMeta.label}
                          </p>
                          {isHighPriority ? (
                            <Badge
                              variant="warning"
                              title="Sự kiện quan trọng — không nên tắt"
                            >
                              Quan trọng
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {rowMeta.description}
                          {isHighPriority ? " (khuyến nghị giữ bật)" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => fireToast(key)}
                        >
                          Test
                        </Button>
                        <ToggleSwitch
                          checked={enabled}
                          disabled={!hydrated}
                          onChange={() => toggleOne(key)}
                          label={rowMeta.label}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Thay đổi áp dụng ngay, không cần tải lại trang. Cài đặt được lưu trong
        trình duyệt hiện tại.
      </p>
    </div>
  );
}

function ToggleSwitch({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        checked ? "bg-primary border-primary" : "bg-muted border-input"
      }`}
    >
      <span
        className={`inline-block size-4 transform rounded-full bg-background shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
