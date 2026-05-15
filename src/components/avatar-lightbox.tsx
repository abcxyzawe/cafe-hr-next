"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X, ExternalLink } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ROLE_LABELS } from "@/lib/utils";

export type AvatarLightboxDetail = {
  src: string | null;
  name: string;
  role?: string;
  href?: string;
};

const EVENT_NAME = "open-avatar-lightbox";

/** Helper to open the lightbox from anywhere on the page. */
export function openAvatarLightbox(detail: AvatarLightboxDetail) {
  if (typeof document === "undefined") return;
  document.dispatchEvent(
    new CustomEvent<AvatarLightboxDetail>(EVENT_NAME, { detail }),
  );
}

/** Singleton listener — mount once in app layout. */
export function AvatarLightbox() {
  const [data, setData] = useState<AvatarLightboxDetail | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onOpen(ev: Event) {
      const ce = ev as CustomEvent<AvatarLightboxDetail>;
      if (!ce.detail) return;
      setData(ce.detail);
    }
    document.addEventListener(EVENT_NAME, onOpen as EventListener);
    return () => document.removeEventListener(EVENT_NAME, onOpen as EventListener);
  }, []);

  useEffect(() => {
    if (!data) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setData(null);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [data]);

  if (!data) return null;

  const roleLabel = data.role ? ROLE_LABELS[data.role] ?? data.role : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-lightbox-name"
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in"
        onClick={() => setData(null)}
        aria-hidden
      />
      <div className="relative z-10 flex w-full max-w-md flex-col items-center animate-in zoom-in-95 fade-in duration-200">
        <button
          ref={closeRef}
          onClick={() => setData(null)}
          aria-label="Đóng"
          className="absolute -right-2 -top-2 z-10 flex size-9 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-lg transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" />
        </button>

        <div className="rounded-2xl bg-card p-6 shadow-2xl ring-4 ring-white/10">
          <div className="flex justify-center">
            <Avatar
              src={data.src}
              alt={data.name}
              fallback={data.name}
              role={data.role}
              size={280}
              className="ring-4 ring-primary/20"
            />
          </div>
          <div className="mt-4 text-center">
            <h2
              id="avatar-lightbox-name"
              className="text-xl font-bold tracking-tight"
            >
              {data.name}
            </h2>
            {roleLabel && (
              <p className="mt-1 text-sm text-muted-foreground">{roleLabel}</p>
            )}
            {data.href && (
              <Link
                href={data.href}
                onClick={() => setData(null)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
              >
                <ExternalLink className="size-3" />
                Mở hồ sơ
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Wrap an Avatar to make it open the lightbox on click. */
export function ClickableAvatar({
  src,
  name,
  role,
  href,
  alt,
  size,
  className,
}: {
  src: string | null;
  name: string;
  role?: string;
  href?: string;
  alt?: string;
  size?: number;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openAvatarLightbox({ src, name, role, href });
      }}
      className="cursor-zoom-in rounded-full transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      title={`Xem ảnh ${name}`}
      aria-label={`Xem ảnh ${name}`}
    >
      <Avatar
        src={src}
        alt={alt ?? name}
        fallback={name}
        role={role}
        size={size}
        className={className}
      />
    </button>
  );
}
