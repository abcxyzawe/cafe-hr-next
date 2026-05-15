"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Top progress bar that animates briefly on every route change.
 * Listens to clicks on internal links to start the animation early,
 * then watches `usePathname` / `useSearchParams` to detect when the
 * navigation actually completed and fades out.
 */
export function NavProgressBar() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUrlRef = useRef<string>("");

  // Start animation on internal link clicks (fires BEFORE the navigation begins)
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const el = (e.target as Element | null)?.closest?.("a") as
        | HTMLAnchorElement
        | null;
      if (!el || !el.href) return;
      // Skip if modifier keys (open in new tab/window)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      // Skip if target=_blank, download, hash-only, mailto/tel etc
      if (el.target === "_blank" || el.hasAttribute("download")) return;
      const url = new URL(el.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Skip in-page anchors
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search &&
        url.hash !== ""
      )
        return;

      start();
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Detect navigation completion
  useEffect(() => {
    if (lastUrlRef.current && lastUrlRef.current !== pathname) {
      finish();
    }
    lastUrlRef.current = pathname;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function start() {
    if (tickRef.current !== null) return; // already running
    if (finishRef.current) {
      clearTimeout(finishRef.current);
      finishRef.current = null;
    }
    if (hideRef.current) {
      clearTimeout(hideRef.current);
      hideRef.current = null;
    }
    setVisible(true);
    setProgress(8);
    // Trickle: each tick add a smaller chunk, asymptote at ~85%
    tickRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 85) return p;
        const inc = (90 - p) * 0.08;
        return Math.min(85, p + Math.max(0.3, inc));
      });
    }, 200);
    // Safety: never run longer than 8 seconds
    finishRef.current = setTimeout(() => finish(), 8000);
  }

  function finish() {
    if (tickRef.current !== null) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (finishRef.current) {
      clearTimeout(finishRef.current);
      finishRef.current = null;
    }
    setProgress(100);
    hideRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 350);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tickRef.current !== null) clearInterval(tickRef.current);
      if (finishRef.current) clearTimeout(finishRef.current);
      if (hideRef.current) clearTimeout(hideRef.current);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-0.5"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 200ms ease-out" }}
    >
      <div
        className="h-full bg-primary shadow-[0_0_8px_var(--primary,theme(colors.primary.DEFAULT))]"
        style={{
          width: `${progress}%`,
          transition: progress >= 100 ? "width 250ms ease-out" : "width 250ms linear",
        }}
      />
    </div>
  );
}
