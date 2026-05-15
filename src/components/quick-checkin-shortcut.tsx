"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { quickCheckin, quickCheckout } from "@/app/(app)/me/check-in-actions";

/**
 * Global keyboard shortcut: Ctrl+Shift+I (or Meta+Shift+I on macOS) opens a
 * confirmation toast that lets the staff member quickly clock in or out.
 *
 * Skips when the user is typing in INPUT/TEXTAREA/SELECT or any contentEditable
 * element so we don't fight with form input. The listener only mounts when the
 * signed-in account is linked to an Employee row (`hasEmployeeProfile`).
 */

const TOAST_ID = "quick-checkin-shortcut";

type ClockedInResponse = {
  linked: boolean;
  isClockedIn: boolean;
  openCheckInIso: string | null;
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

async function fetchClockedIn(): Promise<ClockedInResponse | null> {
  try {
    const res = await fetch("/api/me/clocked-in", {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (
      typeof data === "object" &&
      data !== null &&
      "linked" in data &&
      "isClockedIn" in data
    ) {
      const d = data as Record<string, unknown>;
      return {
        linked: Boolean(d.linked),
        isClockedIn: Boolean(d.isClockedIn),
        openCheckInIso:
          typeof d.openCheckInIso === "string" ? d.openCheckInIso : null,
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function performAction(checkOut: boolean): Promise<void> {
  const result = checkOut ? await quickCheckout() : await quickCheckin();
  if (result.ok) {
    toast.success(checkOut ? "Đã check-out — chúc bạn nghỉ ngơi!" : "Đã check-in — bắt đầu ca làm!");
  } else {
    toast.error(result.error ?? "Không thực hiện được");
  }
}

export function QuickCheckinShortcut({
  hasEmployeeProfile,
}: {
  hasEmployeeProfile: boolean;
}) {
  useEffect(() => {
    if (!hasEmployeeProfile) return;

    function onKey(e: KeyboardEvent) {
      const isMatch =
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        (e.key === "I" || e.key === "i");
      if (!isMatch) return;
      if (isEditableTarget(e.target)) return;

      e.preventDefault();

      void (async () => {
        const status = await fetchClockedIn();
        if (status === null) {
          toast.error("Không kiểm tra được trạng thái chấm công");
          return;
        }
        if (!status.linked) {
          toast.error("Tài khoản chưa được liên kết với hồ sơ nhân viên");
          return;
        }

        const willCheckOut = status.isClockedIn;
        const title = willCheckOut ? "Tan ca?" : "Bắt đầu ca?";
        const description = willCheckOut
          ? "Click để xác nhận check-out"
          : "Click để xác nhận check-in";

        toast.message(title, {
          id: TOAST_ID,
          description,
          duration: 6000,
          action: {
            label: willCheckOut ? "Tan ca" : "Bắt đầu",
            onClick: () => {
              void performAction(willCheckOut);
            },
          },
        });
      })();
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [hasEmployeeProfile]);

  return null;
}
