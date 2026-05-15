"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  BookmarkCheck,
  BookmarkPlus,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  SAVED_IDEAS_EVENT,
  STORAGE_KEY,
  getSavedIdeas,
  removeSavedIdea,
  saveIdea,
  type SavedIdea,
} from "@/lib/saved-ideas-state";
import { generateMenuIdeasAction } from "./generate-action";
import {
  INITIAL_MENU_IDEAS_STATE,
  MENU_IDEA_FLAVORS,
  MENU_IDEA_SEASONS,
  type MenuIdeasState,
} from "./ideas-types";
import type { MenuIdea } from "@/lib/xai";

const VND = new Intl.NumberFormat("vi-VN");

function formatVnd(n: number): string {
  return `${VND.format(n)} ₫`;
}

function ideaSignature(idea: MenuIdea): string {
  return `${idea.name.trim().toLowerCase()}|${idea.estimatedCostVnd}`;
}

export function MenuIdeasBoard() {
  const [state, formAction, pending] = useActionState<
    MenuIdeasState,
    FormData
  >(generateMenuIdeasAction, INITIAL_MENU_IDEAS_STATE);

  const [season, setSeason] = useState<MenuIdeasState["season"]>(
    INITIAL_MENU_IDEAS_STATE.season,
  );
  const [flavor, setFlavor] = useState<MenuIdeasState["flavor"]>(
    INITIAL_MENU_IDEAS_STATE.flavor,
  );
  const [savedIdeas, setSavedIdeas] = useState<SavedIdea[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const lastErrorRef = useRef<string | null>(null);

  // Hydrate saved ideas from localStorage and listen for cross-component updates.
  useEffect(() => {
    setSavedIdeas(getSavedIdeas());
    setHydrated(true);

    const refresh = () => setSavedIdeas(getSavedIdeas());
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === STORAGE_KEY) refresh();
    };
    window.addEventListener(SAVED_IDEAS_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(SAVED_IDEAS_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Sync server-echoed season/flavor when a fresh result arrives.
  useEffect(() => {
    if (state.ideas !== null) {
      setSeason(state.season);
      setFlavor(state.flavor);
    }
  }, [state.ideas, state.season, state.flavor]);

  // Toast on new errors.
  useEffect(() => {
    if (state.error && state.error !== lastErrorRef.current) {
      lastErrorRef.current = state.error;
      toast.error(state.error);
    }
    if (!state.error) {
      lastErrorRef.current = null;
    }
  }, [state.error]);

  const savedSignatures = useMemo<Map<string, SavedIdea>>(() => {
    const map = new Map<string, SavedIdea>();
    for (const item of savedIdeas) {
      map.set(
        `${item.name.trim().toLowerCase()}|${item.estimatedCostVnd}`,
        item,
      );
    }
    return map;
  }, [savedIdeas]);

  const handleSaveToggle = useCallback(
    (idea: MenuIdea) => {
      const sig = ideaSignature(idea);
      const existing = savedSignatures.get(sig);
      if (existing) {
        removeSavedIdea(existing.id);
        setSavedIdeas(getSavedIdeas());
        toast.success("Đã bỏ khỏi danh sách lưu");
      } else {
        saveIdea({
          name: idea.name,
          description: idea.description,
          ingredients: idea.ingredients,
          estimatedCostVnd: idea.estimatedCostVnd,
        });
        setSavedIdeas(getSavedIdeas());
        toast.success(`Đã lưu "${idea.name}"`);
      }
    },
    [savedSignatures],
  );

  const handleRemoveSaved = useCallback((id: string, name: string) => {
    removeSavedIdea(id);
    setSavedIdeas(getSavedIdeas());
    toast.success(`Đã xoá "${name}" khỏi danh sách lưu`);
  }, []);

  const ideas = state.ideas;
  const hasResults = ideas !== null && ideas.length > 0;

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Mùa</Label>
          <div
            role="radiogroup"
            aria-label="Mùa"
            className="grid grid-cols-2 gap-2 sm:grid-cols-4"
          >
            {MENU_IDEA_SEASONS.map((opt) => {
              const selected = season === opt.value;
              return (
                <label
                  key={opt.value}
                  className={
                    "flex cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition-colors " +
                    (selected
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-input bg-background hover:bg-accent hover:text-accent-foreground")
                  }
                >
                  <input
                    type="radio"
                    name="season"
                    value={opt.value}
                    checked={selected}
                    onChange={() => setSeason(opt.value)}
                    disabled={pending}
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="menu-ideas-flavor" className="text-sm font-medium">
            Phong cách hương vị
          </Label>
          <Select
            id="menu-ideas-flavor"
            name="flavor"
            value={flavor}
            onChange={(e) => {
              const v = e.target.value;
              const match = MENU_IDEA_FLAVORS.find((f) => f.value === v);
              if (match) setFlavor(match.value);
            }}
            disabled={pending}
          >
            {MENU_IDEA_FLAVORS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : hasResults ? (
              <RefreshCw className="size-4" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {pending
              ? "Đang sáng tạo..."
              : hasResults
                ? "Tạo lại 5 món"
                : "Gợi ý 5 món"}
          </Button>
        </div>
      </form>

      {pending && !hasResults ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang nghĩ ra 5 ý tưởng món mới cho bạn...
        </div>
      ) : null}

      {hasResults ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="size-3" />
              5 ý tưởng món mới
            </div>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {ideas.length} món
            </span>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ideas.map((idea, i) => {
              const sig = ideaSignature(idea);
              const isSaved = hydrated && savedSignatures.has(sig);
              return (
                <li
                  key={`${i}-${idea.name}`}
                  className="flex flex-col gap-3 rounded-lg border bg-card/60 p-4 shadow-sm"
                >
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold leading-snug">
                      {idea.name}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {idea.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {idea.ingredients.map((ing, idx) => (
                      <span
                        key={`${idx}-${ing}`}
                        className="rounded-full bg-accent/60 px-2 py-0.5 text-[11px] font-medium text-accent-foreground"
                      >
                        {ing}
                      </span>
                    ))}
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
                    <span className="text-sm font-semibold tabular-nums text-primary">
                      {formatVnd(idea.estimatedCostVnd)}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant={isSaved ? "secondary" : "outline"}
                      onClick={() => handleSaveToggle(idea)}
                      disabled={!hydrated}
                    >
                      {isSaved ? (
                        <BookmarkCheck className="size-4" />
                      ) : (
                        <BookmarkPlus className="size-4" />
                      )}
                      {isSaved ? "Đã lưu" : "Lưu ý tưởng"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3 rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <BookmarkCheck className="size-4 text-primary" />
            Ý tưởng đã lưu
          </h2>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {hydrated ? `${savedIdeas.length} món` : "..."}
          </span>
        </div>

        {!hydrated ? (
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        ) : savedIdeas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Chưa có ý tưởng nào được lưu. Bấm &quot;Lưu ý tưởng&quot; ở mỗi món
            để giữ lại.
          </p>
        ) : (
          <ul className="space-y-2">
            {savedIdeas.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded-md border bg-background p-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-xs tabular-nums text-primary">
                      {formatVnd(item.estimatedCostVnd)}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                  {item.ingredients.length > 0 ? (
                    <p className="text-[11px] text-muted-foreground">
                      Nguyên liệu: {item.ingredients.join(", ")}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveSaved(item.id, item.name)}
                  className="self-end sm:self-start"
                >
                  <Trash2 className="size-4" />
                  Xoá
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
