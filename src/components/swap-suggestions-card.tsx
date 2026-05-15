import { Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ROLE_LABELS, cn } from "@/lib/utils";
import { getSwapSuggestions } from "@/lib/swap-matcher-queries";
import type { SwapCandidate } from "@/lib/swap-matcher";

function formatHours(hours: number): string {
  const rounded = Math.round(hours * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function buildMailto(c: SwapCandidate, shiftId: number): string {
  const subject = encodeURIComponent(
    `Cần người thay ca #${shiftId} — bạn có rảnh không?`,
  );
  const body = encodeURIComponent(
    `Chào ${c.name},\n\nMình đang cần người thay ca #${shiftId}. Hệ thống gợi ý bạn (cùng vai trò ${ROLE_LABELS[c.role] ?? c.role}, tuần này làm ${formatHours(c.weekHours)} giờ).\n\nBạn nhận giúp được không? Mở app và bấm "Nhận ca" giúp mình nhé.\n\nCảm ơn!`,
  );
  return `mailto:?subject=${subject}&body=${body}`;
}

export async function SwapSuggestionsCard({
  shiftId,
}: {
  shiftId: number;
}) {
  let candidates: SwapCandidate[] = [];
  try {
    candidates = await getSwapSuggestions(shiftId);
  } catch {
    candidates = [];
  }

  if (candidates.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-violet-200/70 bg-violet-50/60 p-3",
        "dark:border-violet-900/50 dark:bg-violet-950/20",
      )}
    >
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-violet-800 dark:text-violet-200">
        <Sparkles className="size-3.5" />
        <span>Gợi ý người thay</span>
      </div>
      <ul className="space-y-1.5">
        {candidates.map((c) => {
          const reasonText = c.matchReasons.join(" · ");
          return (
            <li
              key={c.employeeId}
              className={cn(
                "flex items-center gap-2 rounded-md border border-violet-200/50 bg-white/80 px-2 py-1.5",
                "dark:border-violet-900/40 dark:bg-violet-950/30",
              )}
            >
              <Avatar
                src={c.avatarUrl}
                alt={c.name}
                fallback={c.name}
                role={c.role}
                size={28}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-xs font-medium">{c.name}</span>
                  <span className="shrink-0 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/50 dark:text-violet-200">
                    {formatHours(c.weekHours)} giờ tuần
                  </span>
                </div>
                <p
                  className="truncate text-[10px] text-muted-foreground"
                  title={reasonText}
                >
                  {reasonText}
                </p>
              </div>
              <a
                href={buildMailto(c, shiftId)}
                className={cn(
                  "shrink-0 rounded-md border border-violet-300 bg-white px-2 py-1 text-[11px] font-semibold text-violet-700 shadow-sm transition-colors",
                  "hover:bg-violet-100 dark:border-violet-700 dark:bg-violet-950/60 dark:text-violet-200 dark:hover:bg-violet-900/60",
                )}
                title={`Gửi yêu cầu cho ${c.name}`}
              >
                Yêu cầu
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
