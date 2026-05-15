"use client";

import { useTransition, useState } from "react";
import { RefreshCw } from "lucide-react";
import { refreshDrinkAction } from "./drink-action";

export function DrinkRefreshButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      const result = await refreshDrinkAction();
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span
          className="max-w-[160px] truncate text-[10px] text-rose-300"
          title={error}
        >
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        aria-label="Tạo đồ uống mới"
        title="Tạo đồ uống mới"
        className="inline-flex size-8 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 transition hover:bg-white/20 disabled:opacity-60"
      >
        <RefreshCw
          className={`size-4 ${isPending ? "animate-spin" : ""}`}
        />
      </button>
    </div>
  );
}
