"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cake, X, PartyPopper } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type Person = {
  id: number;
  name: string;
  avatarUrl: string | null;
  turningAge: number;
};

const DISMISS_KEY = "cafe-hr-birthday-banner-dismissed";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function BirthdayBanner({ people }: { people: Person[] }) {
  const [dismissed, setDismissed] = useState(true);
  const [confettiOn, setConfettiOn] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(DISMISS_KEY);
    if (stored !== todayKey()) setDismissed(false);
  }, []);

  useEffect(() => {
    if (!dismissed && people.length > 0) {
      setConfettiOn(true);
      const t = setTimeout(() => setConfettiOn(false), 5000);
      return () => clearTimeout(t);
    }
  }, [dismissed, people.length]);

  if (people.length === 0 || dismissed) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, todayKey());
    setDismissed(true);
  }

  const headline =
    people.length === 1
      ? `Hôm nay là sinh nhật ${people[0].name} — chúc mừng tuổi ${people[0].turningAge}!`
      : `Hôm nay có ${people.length} sinh nhật — đừng quên gửi lời chúc!`;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/15 via-accent/40 to-primary/10 p-4 sm:p-5 shadow-sm">
      {confettiOn && <Confetti />}
      <button
        onClick={dismiss}
        aria-label="Đóng"
        className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
      >
        <X className="size-4" />
      </button>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
          <Cake className="size-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <PartyPopper className="size-4 text-primary" />
            <span className="truncate">{headline}</span>
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex -space-x-2">
              {people.slice(0, 5).map((p) => (
                <Link
                  key={p.id}
                  href={`/employees/${p.id}`}
                  className="ring-2 ring-background rounded-full transition-transform hover:scale-110 hover:z-10"
                  title={`${p.name} — tuổi ${p.turningAge}`}
                >
                  <Avatar src={p.avatarUrl} fallback={p.name} alt={p.name} size={32} />
                </Link>
              ))}
            </div>
            {people.length > 5 && (
              <span className="text-xs text-muted-foreground">
                +{people.length - 5} người khác
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 24 }, (_, i) => i);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((i) => {
        const left = (i / pieces.length) * 100;
        const delay = (i % 8) * 0.1;
        const duration = 2.5 + (i % 5) * 0.3;
        const colors = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#a855f7", "#ec4899"];
        const color = colors[i % colors.length];
        return (
          <span
            key={i}
            className={cn("absolute top-0 block h-2 w-2 rounded-sm")}
            style={{
              left: `${left}%`,
              backgroundColor: color,
              animation: `confetti-fall ${duration}s ease-in ${delay}s both`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-20%) rotate(0deg); opacity: 1; }
          100% { transform: translateY(360%) rotate(540deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
