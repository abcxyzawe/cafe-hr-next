"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/**
 * Vim-style two-key navigation: press `g` then a letter to jump.
 *
 * Bindings:
 *   g h → /            g e → /employees    g s → /shifts      g a → /attendance
 *   g l → /leave       g t → /tasks        g p → /payroll     g r → /reports
 *   g m → /me          g u → /audit        g c → /changelog
 *   g d → /display (NEW TAB — TV view)
 *   g , → /settings
 *
 * Skips when user is typing in form fields or any modifier is held.
 */

const PENDING_TOAST_ID = "vim-pending";
const PENDING_WINDOW_MS = 1500;

const ROUTES: Record<string, string> = {
  h: "/",
  e: "/employees",
  s: "/shifts",
  a: "/attendance",
  l: "/leave",
  t: "/tasks",
  p: "/payroll",
  r: "/reports",
  m: "/me",
  u: "/audit",
  c: "/changelog",
  ",": "/settings",
};

const NEW_TAB_ROUTES: Record<string, string> = {
  d: "/display",
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

function hasModifier(e: KeyboardEvent): boolean {
  return e.ctrlKey || e.metaKey || e.altKey || e.shiftKey;
}

export function VimNav() {
  const router = useRouter();
  const pendingRef = useRef<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function clearPending() {
      pendingRef.current = false;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      toast.dismiss(PENDING_TOAST_ID);
    }

    function onKey(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;

      // Second key in g-pending mode
      if (pendingRef.current) {
        // `Shift` is allowed only for `,` (which on most layouts requires no shift,
        // but be permissive). For letters, modifiers cancel the pending state.
        const key = e.key.toLowerCase();

        if (e.ctrlKey || e.metaKey || e.altKey) {
          clearPending();
          return;
        }

        // Cancel on Escape
        if (key === "escape") {
          e.preventDefault();
          clearPending();
          return;
        }

        const newTabPath = NEW_TAB_ROUTES[key];
        if (newTabPath !== undefined) {
          e.preventDefault();
          clearPending();
          window.open(newTabPath, "_blank", "noopener,noreferrer");
          return;
        }

        const path = ROUTES[key];
        if (path !== undefined) {
          e.preventDefault();
          clearPending();
          router.push(path);
          return;
        }

        // Unknown second key — just cancel silently
        clearPending();
        return;
      }

      // Enter g-pending: only on bare `g` (no modifiers, not editable)
      if (e.key === "g" && !hasModifier(e)) {
        e.preventDefault();
        pendingRef.current = true;
        toast.message(
          "Đợi phím tiếp theo... e=NV, s=Ca, t=Việc, p=Lương, r=BC, m=Của tôi, h=Home, c=Cập nhật, d=TV display, u=Audit, l=Nghỉ phép, a=Chấm công",
          { id: PENDING_TOAST_ID, duration: PENDING_WINDOW_MS },
        );
        if (timerRef.current !== null) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          clearPending();
        }, PENDING_WINDOW_MS);
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [router]);

  return null;
}
