"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Bookmark, Save, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type FilterPreset = {
  name: string;
  query: string; // serialized querystring like "q=foo&action=leave"
  createdAt: number;
};

const STORAGE_KEY = "cafe-hr-audit-presets";
const MAX_PRESETS = 8;

const RELEVANT_KEYS = ["q", "action", "userId", "from", "to"] as const;

function loadPresets(): FilterPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is FilterPreset =>
          typeof x === "object" &&
          x !== null &&
          typeof (x as FilterPreset).name === "string" &&
          typeof (x as FilterPreset).query === "string" &&
          typeof (x as FilterPreset).createdAt === "number",
      )
      .slice(0, MAX_PRESETS);
  } catch {
    return [];
  }
}

function savePresets(list: FilterPreset[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_PRESETS)));
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_KEY,
        newValue: JSON.stringify(list),
      }),
    );
  } catch {
    // ignore
  }
}

function currentRelevantQuery(searchParams: URLSearchParams | null): string {
  if (!searchParams) return "";
  const parts: string[] = [];
  for (const k of RELEVANT_KEYS) {
    const v = searchParams.get(k);
    if (v && v.trim()) parts.push(`${k}=${encodeURIComponent(v)}`);
  }
  return parts.join("&");
}

export function AuditFilterPresets() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    setPresets(loadPresets());
    function onStorage(ev: StorageEvent) {
      if (ev.key !== null && ev.key !== STORAGE_KEY) return;
      setPresets(loadPresets());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const currentQuery = currentRelevantQuery(searchParams);
  const canSave = currentQuery.length > 0;
  const activeMatch = presets.find((p) => p.query === currentQuery);

  function commitSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Cần đặt tên cho preset");
      return;
    }
    if (trimmed.length > 40) {
      toast.error("Tên tối đa 40 ký tự");
      return;
    }
    const next = [
      { name: trimmed, query: currentQuery, createdAt: Date.now() },
      ...presets.filter((p) => p.name !== trimmed),
    ].slice(0, MAX_PRESETS);
    setPresets(next);
    savePresets(next);
    setNaming(false);
    setName("");
    toast.success(`Đã lưu preset "${trimmed}"`);
  }

  function applyPreset(p: FilterPreset) {
    router.push(p.query ? `/audit?${p.query}&page=1` : "/audit");
  }

  function deletePreset(p: FilterPreset) {
    const next = presets.filter((x) => x.name !== p.name);
    setPresets(next);
    savePresets(next);
    toast.success(`Đã xoá preset "${p.name}"`);
  }

  if (presets.length === 0 && !canSave) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-muted/30 px-3 py-2">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Bookmark className="size-3" />
        Bộ lọc đã lưu
      </span>

      {presets.length === 0 ? (
        <span className="text-xs italic text-muted-foreground">
          Chưa có — lưu bộ lọc hiện tại để dùng nhanh sau này
        </span>
      ) : (
        presets.map((p) => {
          const active = p.name === activeMatch?.name;
          return (
            <span
              key={p.name}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border bg-card pl-2.5 text-xs transition-colors",
                active
                  ? "border-primary bg-primary/10"
                  : "hover:bg-accent",
              )}
            >
              <button
                type="button"
                onClick={() => applyPreset(p)}
                className="flex items-center gap-1 py-1 font-medium transition-colors hover:text-primary"
                title={`Áp dụng: ${decodeURIComponent(p.query)}`}
              >
                {active && <Check className="size-3 text-primary" />}
                {p.name}
              </button>
              <button
                type="button"
                onClick={() => deletePreset(p)}
                aria-label={`Xoá ${p.name}`}
                className="flex h-full items-center px-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </span>
          );
        })
      )}

      {canSave && !activeMatch && !naming && (
        <button
          type="button"
          onClick={() => setNaming(true)}
          className="ml-auto inline-flex items-center gap-1 rounded-full border border-dashed bg-card px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-accent"
        >
          <Save className="size-3" />
          Lưu bộ lọc
        </button>
      )}

      {naming && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            commitSave();
          }}
          className="ml-auto inline-flex items-center gap-1.5"
        >
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên preset..."
            maxLength={40}
            className="h-7 w-44 rounded-md border bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:opacity-90 disabled:opacity-50"
          >
            <Save className="size-3" />
            Lưu
          </button>
          <button
            type="button"
            onClick={() => {
              setNaming(false);
              setName("");
            }}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Huỷ"
          >
            <X className="size-3" />
          </button>
        </form>
      )}
    </div>
  );
}
