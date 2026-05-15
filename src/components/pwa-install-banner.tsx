"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const DISMISS_KEY = "cafe-hr-pwa-installed-dismissed";

type UserChoice = { outcome: "accepted" | "dismissed"; platform: string };

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: ReadonlyArray<string>;
  readonly userChoice: Promise<UserChoice>;
  prompt(): Promise<void>;
}

export function PWAInstallBanner() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(DISMISS_KEY) === "1") return;

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const handleInstalled = () => {
      setDeferredPrompt(null);
      setVisible(false);
      try {
        window.localStorage.setItem(DISMISS_KEY, "1");
      } catch {
        // ignore storage errors (private mode, full quota, etc.)
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        try {
          window.localStorage.setItem(DISMISS_KEY, "1");
        } catch {
          // ignore
        }
      }
    } catch (error) {
      console.error("[pwa] install prompt failed", error);
    } finally {
      setDeferredPrompt(null);
      setVisible(false);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  }, []);

  if (pathname !== "/kiosk") return null;
  if (!visible || !deferredPrompt) return null;

  return (
    <div
      role="dialog"
      aria-label="Cài đặt Cafe HR"
      className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border bg-card p-4 text-card-foreground shadow-2xl"
    >
      <div className="flex items-start gap-3">
        <Image
          src="/brand/logo-48.png"
          alt="Cafe HR"
          width={48}
          height={48}
          className="rounded-lg"
        />
        <div className="flex-1">
          <p className="text-sm font-semibold">Cài đặt Cafe HR</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cài app để chấm công nhanh, hoạt động cả khi mất mạng
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleInstall}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Cài đặt
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
            >
              Để sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
