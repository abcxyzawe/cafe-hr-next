"use client";

import { useEffect, useState } from "react";

const VI_DAYS = [
  "Chủ nhật",
  "Thứ hai",
  "Thứ ba",
  "Thứ tư",
  "Thứ năm",
  "Thứ sáu",
  "Thứ bảy",
];

export function LiveClock() {
  // Defer Date construction to client to avoid SSR/CSR hydration mismatch.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return (
      <div className="text-right" aria-hidden>
        <div className="text-7xl font-bold tabular-nums tracking-tight opacity-40">
          --:--
          <span className="text-3xl text-white/50">:--</span>
        </div>
        <div className="mt-1 text-xl font-medium text-white/70 opacity-40">
          —
        </div>
      </div>
    );
  }

  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  return (
    <div className="text-right">
      <div className="text-7xl font-bold tabular-nums tracking-tight">
        {hh}:{mm}
        <span className="text-3xl text-white/50">:{ss}</span>
      </div>
      <div className="mt-1 text-xl font-medium text-white/70">
        {VI_DAYS[now.getDay()]} · {String(now.getDate()).padStart(2, "0")}/
        {String(now.getMonth() + 1).padStart(2, "0")}/{now.getFullYear()}
      </div>
    </div>
  );
}
