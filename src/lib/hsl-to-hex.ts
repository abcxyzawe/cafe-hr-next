/**
 * Convert an HSL fragment string (e.g. "24 60% 35%") to a hex color "#RRGGBB".
 *
 * The fragment format is what Tailwind v4 / shadcn-style CSS variables use:
 *   --primary: 24 60% 35%;  →  used as `hsl(var(--primary))`.
 *
 * Best-effort: if parsing fails, the original input is returned untouched so
 * callers can still display *something* meaningful.
 */
export function hslFragmentToHex(fragment: string): string {
  const trimmed = fragment.trim();
  // Accept "H S% L%" with any whitespace; tolerate optional commas.
  const match = trimmed.match(
    /^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)%\s*[, ]\s*(-?\d+(?:\.\d+)?)%$/,
  );
  if (!match) return fragment;

  const hRaw = Number(match[1]);
  const sRaw = Number(match[2]);
  const lRaw = Number(match[3]);
  if (!Number.isFinite(hRaw) || !Number.isFinite(sRaw) || !Number.isFinite(lRaw)) {
    return fragment;
  }

  // Normalize hue into [0, 360); clamp s/l into [0, 100].
  const h = ((hRaw % 360) + 360) % 360;
  const s = Math.min(100, Math.max(0, sRaw)) / 100;
  const l = Math.min(100, Math.max(0, lRaw)) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hp >= 0 && hp < 1) {
    r1 = c;
    g1 = x;
  } else if (hp < 2) {
    r1 = x;
    g1 = c;
  } else if (hp < 3) {
    g1 = c;
    b1 = x;
  } else if (hp < 4) {
    g1 = x;
    b1 = c;
  } else if (hp < 5) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }
  const m = l - c / 2;
  const r = Math.round((r1 + m) * 255);
  const g = Math.round((g1 + m) * 255);
  const b = Math.round((b1 + m) * 255);
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}
