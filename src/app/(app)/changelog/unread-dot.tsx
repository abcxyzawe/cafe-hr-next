"use client";

import { useEffect, useState } from "react";
import {
  CHANGELOG_READ_EVENT,
  CHANGELOG_READ_KEY,
  getLastRead,
  isUnread,
} from "@/lib/changelog-read-state";

type UnreadDotProps = {
  version: string;
};

/**
 * A small amber pulse dot rendered next to a changelog entry's version chip.
 * Hidden until hydrated to avoid a SSR/CSR flash.
 */
export function UnreadDot({ version }: UnreadDotProps) {
  const [hydrated, setHydrated] = useState(false);
  const [unread, setUnread] = useState(false);

  useEffect(() => {
    const recompute = (): void => {
      setUnread(isUnread(version, getLastRead()));
    };
    recompute();
    setHydrated(true);

    const onStorage = (e: StorageEvent): void => {
      if (e.key === CHANGELOG_READ_KEY || e.key === null) recompute();
    };
    const onCustom = (): void => recompute();

    window.addEventListener("storage", onStorage);
    window.addEventListener(CHANGELOG_READ_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CHANGELOG_READ_EVENT, onCustom);
    };
  }, [version]);

  if (!unread) {
    // Render an empty span so layout doesn't shift, but keep it invisible.
    return (
      <span
        aria-hidden
        className="inline-block size-0 opacity-0 transition-opacity"
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 transition-opacity dark:bg-amber-900/30 dark:text-amber-300 ${
        hydrated ? "opacity-100" : "opacity-0"
      }`}
      data-changelog-unread={version}
    >
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex size-1.5 rounded-full bg-amber-500" />
      </span>
      Mới
    </span>
  );
}
