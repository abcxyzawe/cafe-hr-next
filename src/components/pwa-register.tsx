"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        if (cancelled) return;
        console.log(
          "[pwa] service worker registered",
          registration.scope,
        );
      })
      .catch((error: unknown) => {
        console.error("[pwa] service worker registration failed", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
