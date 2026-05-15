"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: number;
  /** Optional employee role — picks a colored gradient for the fallback initials */
  role?: string;
}

/**
 * Pick a deterministic gradient class pair for the fallback bg.
 * Roles get distinct colors; unknown role falls back to a name-hash hue.
 */
const ROLE_GRADIENT: Record<
  string,
  { bg: string; text: string }
> = {
  barista: {
    bg: "bg-gradient-to-br from-amber-400 to-orange-500",
    text: "text-white",
  },
  server: {
    bg: "bg-gradient-to-br from-sky-400 to-blue-600",
    text: "text-white",
  },
  cashier: {
    bg: "bg-gradient-to-br from-rose-400 to-pink-600",
    text: "text-white",
  },
  manager: {
    bg: "bg-gradient-to-br from-emerald-400 to-teal-600",
    text: "text-white",
  },
};

const HUE_GRADIENTS: Array<{ bg: string; text: string }> = [
  { bg: "bg-gradient-to-br from-violet-400 to-purple-600", text: "text-white" },
  { bg: "bg-gradient-to-br from-fuchsia-400 to-pink-600", text: "text-white" },
  { bg: "bg-gradient-to-br from-indigo-400 to-blue-600", text: "text-white" },
  { bg: "bg-gradient-to-br from-cyan-400 to-teal-600", text: "text-white" },
  { bg: "bg-gradient-to-br from-lime-400 to-green-600", text: "text-white" },
  { bg: "bg-gradient-to-br from-yellow-400 to-amber-600", text: "text-white" },
  { bg: "bg-gradient-to-br from-orange-400 to-rose-600", text: "text-white" },
  { bg: "bg-gradient-to-br from-stone-400 to-stone-600", text: "text-white" },
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pickGradient(role: string | undefined, fallbackKey: string) {
  if (role && ROLE_GRADIENT[role]) return ROLE_GRADIENT[role];
  return HUE_GRADIENTS[hashString(fallbackKey) % HUE_GRADIENTS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || parts[0].length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  // Vietnamese names: typically last word is given name; use first letter of first + last
  const first = parts[0][0];
  const last = parts[parts.length - 1][0];
  return `${first}${last}`.toUpperCase();
}

export function Avatar({
  src,
  alt,
  fallback,
  size = 40,
  role,
  className,
  ...props
}: AvatarProps) {
  const [errored, setErrored] = React.useState(false);
  const showImg = src && !errored;
  const displayName = fallback || alt || "?";
  const gradient = React.useMemo(
    () => pickGradient(role, displayName),
    [role, displayName],
  );
  // Scale font size proportionally to avatar size
  const fontPx = Math.max(10, Math.round(size * 0.38));
  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden rounded-full bg-muted",
        className,
      )}
      style={{ width: size, height: size }}
      {...props}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src ?? undefined}
          alt={alt || ""}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <div
          className={cn(
            "flex h-full w-full items-center justify-center font-bold uppercase tracking-wide select-none",
            gradient.bg,
            gradient.text,
          )}
          style={{ fontSize: fontPx, lineHeight: 1 }}
          aria-label={displayName}
        >
          {initials(displayName)}
        </div>
      )}
    </div>
  );
}
