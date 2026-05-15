"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useTransition } from "react";
import {
  LogOut,
  User,
  ChevronDown,
  ShieldCheck,
  Settings,
  Languages,
  Check,
  Bell,
  BellOff,
  HelpCircle,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { signOut } from "@/app/login/actions";
import { setLocale } from "@/lib/locale-action";
import type { Locale } from "@/lib/i18n";
import { ThemePicker } from "@/components/theme-picker";
import { DensityPicker } from "@/components/density-picker";
import type { PaletteId } from "@/lib/palette";
import type { Density } from "@/lib/density";
import {
  PREFS_STORAGE_KEY,
  TOAST_EVENT_KEYS,
  loadToastPrefs,
} from "@/components/realtime-toaster";
import {
  STORAGE_KEY as SOUND_STORAGE_KEY,
  loadSoundEnabled,
  setSoundEnabled,
} from "@/lib/sound-prefs";
import { playChime } from "@/lib/play-chime";

type Labels = {
  adminBadge: string;
  staffBadge: string;
  accountSettings: string;
  signOut: string;
};

type Props = {
  user: { name: string; email: string; role: "admin" | "staff" };
  labels: Labels;
  locale: Locale;
  paletteId: PaletteId;
  density: Density;
};

export function UserMenu({ user, labels, locale, paletteId, density }: Props) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const [offCount, setOffCount] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [soundOn, setSoundOn] = useState(false);

  useEffect(() => {
    function refresh() {
      const prefs = loadToastPrefs();
      setOffCount(TOAST_EVENT_KEYS.filter((k) => !prefs[k]).length);
      setSoundOn(loadSoundEnabled());
    }
    refresh();
    setHydrated(true);
    function onStorage(ev: StorageEvent) {
      if (ev.key !== null && ev.key !== PREFS_STORAGE_KEY && ev.key !== SOUND_STORAGE_KEY) return;
      refresh();
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const allOn = hydrated && offCount === 0;

  function toggleSound() {
    const next = !soundOn;
    setSoundEnabled(next);
    setSoundOn(next);
    if (next) {
      // Preview chime so the user hears what they just enabled.
      playChime();
    }
  }

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function changeLocale(next: Locale) {
    if (next === locale) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      await setLocale(next);
      setOpen(false);
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border bg-card pl-1 pr-2 py-1 text-sm shadow-sm transition-colors hover:bg-accent"
      >
        <Avatar fallback={user.name} alt={user.name} size={28} />
        <span className="hidden max-w-[120px] truncate font-medium sm:inline">
          {user.name}
        </span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border bg-popover p-1 shadow-xl">
          <div className="flex items-center gap-3 border-b px-3 py-3">
            <Avatar fallback={user.name} alt={user.name} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                {user.role === "admin" ? (
                  <ShieldCheck className="size-2.5" />
                ) : (
                  <User className="size-2.5" />
                )}
                {user.role === "admin" ? labels.adminBadge : labels.staffBadge}
              </div>
            </div>
          </div>

          <div className="border-b py-1">
            <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Languages className="size-3" />
              Language / Ngôn ngữ
            </div>
            <LocaleOption
              current={locale}
              value="vi"
              label="Tiếng Việt"
              flag="🇻🇳"
              onSelect={changeLocale}
            />
            <LocaleOption
              current={locale}
              value="en"
              label="English"
              flag="🇬🇧"
              onSelect={changeLocale}
            />
          </div>

          <div className="border-b py-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                document.dispatchEvent(new CustomEvent("open-onboarding-tour"));
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
            >
              <HelpCircle className="size-4" />
              <span className="flex-1 text-left">Xem lại tour</span>
            </button>
          </div>

          <div className="border-b py-1">
            <ThemePicker current={paletteId} onPicked={() => setOpen(false)} />
          </div>

          <div className="border-b py-1">
            <DensityPicker current={density} onPicked={() => setOpen(false)} />
          </div>

          <Link
            href="/settings/notifications"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
          >
            {allOn ? (
              <Bell className="size-4" />
            ) : (
              <BellOff className="size-4 text-muted-foreground" />
            )}
            <span className="flex-1 text-left">
              {hydrated
                ? offCount === 0
                  ? "Đang bật tất cả"
                  : `Tắt: ${offCount} loại`
                : "Thông báo realtime"}
            </span>
          </Link>

          <button
            type="button"
            onClick={toggleSound}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
          >
            {soundOn ? (
              <Volume2 className="size-4" />
            ) : (
              <VolumeX className="size-4 text-muted-foreground" />
            )}
            <span className="flex-1 text-left">
              {hydrated
                ? soundOn
                  ? "Tắt âm thanh thông báo"
                  : "Bật âm thanh thông báo"
                : "Âm thanh thông báo"}
            </span>
          </button>

          <Link
            href="/settings/profile"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
          >
            <User className="size-4" />
            Hồ sơ
          </Link>

          <Link
            href="/help"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
          >
            <HelpCircle className="size-4" />
            Trung tâm trợ giúp
          </Link>

          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
          >
            <Settings className="size-4" />
            {labels.accountSettings}
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
            >
              <LogOut className="size-4" />
              {labels.signOut}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function LocaleOption({
  current,
  value,
  label,
  flag,
  onSelect,
}: {
  current: Locale;
  value: Locale;
  label: string;
  flag: string;
  onSelect: (v: Locale) => void;
}) {
  const active = current === value;
  return (
    <button
      onClick={() => onSelect(value)}
      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
    >
      <span className="text-base leading-none">{flag}</span>
      <span className="flex-1 text-left">{label}</span>
      {active && <Check className="size-3.5 text-primary" />}
    </button>
  );
}
