import Image from "next/image";
import { Coffee } from "lucide-react";
import { getCachedDrink } from "@/lib/drink-of-the-day";
import { DrinkRefreshButton } from "./drink-refresh";

export function DrinkOfTheDayCard() {
  const drink = getCachedDrink(new Date());

  return (
    <div className="rounded-2xl bg-gradient-to-br from-amber-500/15 to-rose-500/10 p-4 ring-1 ring-amber-300/20 shadow-lg backdrop-blur">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-7 items-center justify-center rounded-lg bg-amber-400/20 text-amber-200">
            <Coffee className="size-4" />
          </span>
          <p className="text-[11px] font-bold uppercase tracking-widest text-amber-100/80">
            Đồ uống hôm nay
          </p>
        </div>
        <DrinkRefreshButton />
      </div>

      {drink ? (
        <div className="flex items-center gap-4">
          <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl ring-1 ring-white/15 sm:size-28">
            <Image
              src={drink.imageUrl}
              alt={drink.name}
              fill
              sizes="112px"
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-black leading-tight text-white sm:text-2xl">
              {drink.name}
            </p>
            <p className="mt-1 text-sm italic text-white/75">
              {drink.tagline}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
          <Coffee className="size-6 text-amber-200/80" />
          <p className="text-sm text-white/70">
            Bấm 🔄 để tạo đồ uống mới
          </p>
        </div>
      )}
    </div>
  );
}
