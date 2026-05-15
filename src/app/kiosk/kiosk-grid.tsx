"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  Delete,
  LogIn,
  LogOut,
  X,
  Loader2,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { kioskToggle, type KioskResult } from "./actions";
import { cn } from "@/lib/utils";

type Employee = {
  id: number;
  name: string;
  role: string;
  roleLabel: string;
  avatarUrl: string | null;
  hasPin: boolean;
  onShift: boolean;
};

const PIN_LEN = 4;
const IDLE_TIMEOUT_MS = 60_000;
const IDLE_WARNING_MS = 30_000;
const IDLE_CHECK_INTERVAL_MS = 5_000;
const IDLE_TICK_INTERVAL_MS = 1_000;

export function KioskGrid({ employees }: { employees: Employee[] }) {
  const [selected, setSelected] = useState<Employee | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<KioskResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [idleRemainingMs, setIdleRemainingMs] = useState<number>(IDLE_TIMEOUT_MS);

  const lastActivityRef = useRef<number>(Date.now());
  const isOnPickerRef = useRef<boolean>(true);
  const isOnSuccessRef = useRef<boolean>(false);

  const resetKiosk = useCallback(() => {
    setSelected(null);
    setPin("");
    setError(null);
    setResult(null);
  }, []);

  function close() {
    resetKiosk();
  }

  // Track view state via refs so the interval/listeners always see latest values
  isOnPickerRef.current = selected === null;
  isOnSuccessRef.current = result !== null;

  // Reset idle timer when state changes (entering modal counts as activity)
  useEffect(() => {
    lastActivityRef.current = Date.now();
    setIdleRemainingMs(IDLE_TIMEOUT_MS);
  }, [selected, result]);

  // Activity listeners + idle check loop
  useEffect(() => {
    const markActivity = (): void => {
      lastActivityRef.current = Date.now();
    };

    const events: Array<keyof DocumentEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
    ];
    for (const evt of events) {
      document.addEventListener(evt, markActivity, {
        capture: true,
        passive: true,
      });
    }

    const checkInterval = window.setInterval(() => {
      // Skip if on picker (nothing to reset) or showing success (auto-closes anyway)
      if (isOnPickerRef.current || isOnSuccessRef.current) return;
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= IDLE_TIMEOUT_MS) {
        resetKiosk();
        lastActivityRef.current = Date.now();
      }
    }, IDLE_CHECK_INTERVAL_MS);

    const tickInterval = window.setInterval(() => {
      if (isOnPickerRef.current || isOnSuccessRef.current) {
        setIdleRemainingMs(IDLE_TIMEOUT_MS);
        return;
      }
      const remaining = Math.max(
        0,
        IDLE_TIMEOUT_MS - (Date.now() - lastActivityRef.current),
      );
      setIdleRemainingMs(remaining);
    }, IDLE_TICK_INTERVAL_MS);

    return () => {
      for (const evt of events) {
        document.removeEventListener(evt, markActivity, { capture: true });
      }
      window.clearInterval(checkInterval);
      window.clearInterval(tickInterval);
    };
  }, [resetKiosk]);

  const showIdleWarning =
    selected !== null &&
    result === null &&
    idleRemainingMs <= IDLE_WARNING_MS;
  const idleSecondsLeft = Math.ceil(idleRemainingMs / 1000);

  function appendDigit(d: string) {
    if (pending || result || pin.length >= PIN_LEN) return;
    const next = pin + d;
    setPin(next);
    setError(null);
    if (next.length === PIN_LEN && selected) {
      submitPin(selected, next);
    }
  }

  function submitPin(emp: Employee, fullPin: string) {
    startTransition(async () => {
      const res = await kioskToggle(emp.id, fullPin);
      if (res.ok) {
        setResult(res);
        // Auto-close after 3.5s
        setTimeout(close, 3500);
      } else {
        setError(res.error ?? "Có lỗi xảy ra");
        setPin("");
      }
    });
  }

  if (employees.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <p className="text-lg text-muted-foreground">
          Chưa có nhân viên nào trong hệ thống.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {employees.map((emp) => (
          <button
            key={emp.id}
            onClick={() => {
              if (!emp.hasPin) {
                setSelected(emp);
                setError("Nhân viên chưa được cấp PIN. Liên hệ quản lý.");
                return;
              }
              setSelected(emp);
              setPin("");
              setError(null);
            }}
            className={cn(
              "group relative flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center shadow-sm transition-all hover:scale-105 hover:shadow-md",
              !emp.hasPin && "opacity-60",
            )}
          >
            <div className="relative">
              <Avatar
                src={emp.avatarUrl}
                alt={emp.name}
                fallback={emp.name}
                size={80}
              />
              {emp.onShift && (
                <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-card">
                  <span className="absolute inline-flex size-4 animate-ping rounded-full bg-emerald-400 opacity-75" />
                </span>
              )}
            </div>
            <div>
              <p className="line-clamp-1 text-sm font-semibold">{emp.name}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {emp.roleLabel}
              </p>
              {emp.onShift && (
                <p className="mt-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  Đang trong ca
                </p>
              )}
              {!emp.hasPin && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Chưa có PIN
                </p>
              )}
            </div>
          </button>
        ))}
      </div>

      {showIdleWarning && (
        <div
          className="fixed bottom-20 right-4 z-[60] flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100/95 px-3 py-1.5 text-xs font-medium text-amber-900 shadow-lg backdrop-blur dark:border-amber-700 dark:bg-amber-950/80 dark:text-amber-200"
          role="status"
          aria-live="polite"
        >
          <Lock className="size-3.5" />
          <span>Tự khoá sau {idleSecondsLeft}s</span>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={close}
            aria-hidden
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl">
            <button
              onClick={close}
              className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Đóng"
            >
              <X className="size-5" />
            </button>

            {result ? (
              <ResultPanel result={result} />
            ) : (
              <>
                <div className="mb-6 flex flex-col items-center gap-3 text-center">
                  <Avatar
                    src={selected.avatarUrl}
                    alt={selected.name}
                    fallback={selected.name}
                    size={80}
                  />
                  <div>
                    <h2 className="text-lg font-bold">{selected.name}</h2>
                    <p className="text-xs text-muted-foreground">
                      {selected.roleLabel} ·{" "}
                      {selected.onShift ? "sẽ check-out" : "sẽ check-in"}
                    </p>
                  </div>
                </div>

                {selected.hasPin ? (
                  <>
                    <div className="mb-4 flex justify-center gap-2">
                      {Array.from({ length: PIN_LEN }).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex size-12 items-center justify-center rounded-md border-2 text-2xl font-bold transition-colors",
                            i < pin.length
                              ? "border-primary bg-primary/10"
                              : "border-input bg-card",
                          )}
                        >
                          {i < pin.length ? "•" : ""}
                        </div>
                      ))}
                    </div>

                    {error && (
                      <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
                        {error}
                      </p>
                    )}

                    {pending && (
                      <div className="mb-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Đang xử lý...
                      </div>
                    )}

                    <Keypad
                      onDigit={appendDigit}
                      onBackspace={() => {
                        setPin((p) => p.slice(0, -1));
                        setError(null);
                      }}
                      disabled={pending}
                    />
                  </>
                ) : (
                  <p className="rounded-md bg-amber-100 px-4 py-6 text-center text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    {error ?? "Nhân viên này chưa được cấp PIN. Liên hệ quản lý."}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Keypad({
  onDigit,
  onBackspace,
  disabled,
}: {
  onDigit: (d: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
}) {
  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
  return (
    <div className="grid grid-cols-3 gap-2">
      {digits.map((d) => (
        <button
          key={d}
          disabled={disabled}
          onClick={() => onDigit(d)}
          className="h-14 rounded-lg border bg-card text-2xl font-bold shadow-sm transition-all hover:bg-accent active:scale-95 disabled:opacity-50"
        >
          {d}
        </button>
      ))}
      <div />
      <button
        disabled={disabled}
        onClick={() => onDigit("0")}
        className="h-14 rounded-lg border bg-card text-2xl font-bold shadow-sm transition-all hover:bg-accent active:scale-95 disabled:opacity-50"
      >
        0
      </button>
      <button
        disabled={disabled}
        onClick={onBackspace}
        className="flex h-14 items-center justify-center rounded-lg border bg-card shadow-sm transition-all hover:bg-accent active:scale-95 disabled:opacity-50"
        aria-label="Xoá"
      >
        <Delete className="size-5" />
      </button>
    </div>
  );
}

function ResultPanel({ result }: { result: KioskResult }) {
  const isIn = result.status === "checked-in";
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div
        className={cn(
          "flex size-20 items-center justify-center rounded-full",
          isIn
            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
            : "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
        )}
      >
        {isIn ? <LogIn className="size-10" /> : <LogOut className="size-10" />}
      </div>
      <CheckCircle2 className="size-5 text-emerald-500" />
      <p className="text-base font-medium">{result.message}</p>
    </div>
  );
}
