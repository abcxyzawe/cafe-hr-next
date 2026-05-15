"use client";

import * as React from "react";
import {
  Download,
  ExternalLink,
  Loader2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  PLAYGROUND_EVENT,
  STORAGE_KEY,
  addRecent,
  clearRecents,
  getRecents,
  removeRecent,
  type PlaygroundEntry,
} from "@/lib/playground-recents-state";
import { generatePlaygroundImageAction } from "./generate-action";

const MIN_LEN = 5;
const MAX_LEN = 500;

type GeneratedView = {
  prompt: string;
  url: string;
};

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function PlaygroundForm(): React.ReactElement {
  const [prompt, setPrompt] = React.useState<string>("");
  const [generated, setGenerated] = React.useState<GeneratedView | null>(null);
  const [recents, setRecents] = React.useState<PlaygroundEntry[]>([]);
  const [hydrated, setHydrated] = React.useState<boolean>(false);
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    setHydrated(true);
    setRecents(getRecents());
    function handleChange(): void {
      setRecents(getRecents());
    }
    function handleStorage(e: StorageEvent): void {
      if (e.key === STORAGE_KEY) {
        setRecents(getRecents());
      }
    }
    window.addEventListener(PLAYGROUND_EVENT, handleChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(PLAYGROUND_EVENT, handleChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const charCount = prompt.length;
  const trimmedLen = prompt.trim().length;
  const tooShort = trimmedLen > 0 && trimmedLen < MIN_LEN;
  const tooLong = charCount > MAX_LEN;
  const canSubmit =
    !isPending && trimmedLen >= MIN_LEN && charCount <= MAX_LEN;

  function handleSubmit(): void {
    const value = prompt.trim();
    if (value.length < MIN_LEN) {
      toast.error(`Mô tả phải có ít nhất ${MIN_LEN} ký tự.`);
      return;
    }
    if (value.length > MAX_LEN) {
      toast.error(`Mô tả không được vượt quá ${MAX_LEN} ký tự.`);
      return;
    }
    startTransition(() => {
      void (async () => {
        const res = await generatePlaygroundImageAction(value);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        setGenerated({ prompt: value, url: res.url });
        addRecent({ prompt: value, url: res.url });
        toast.success("Đã tạo ảnh thành công");
      })();
    });
  }

  function handleClearAll(): void {
    if (recents.length === 0) return;
    clearRecents();
    toast.success("Đã xoá toàn bộ ảnh gần đây");
  }

  function handleRemoveOne(id: string): void {
    removeRecent(id);
  }

  function handleOpen(url: string): void {
    if (typeof window === "undefined") return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-6">
      {/* Prompt input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="playground-prompt">Mô tả ảnh</Label>
          <span
            className={cn(
              "text-xs tabular-nums",
              tooLong
                ? "text-destructive"
                : tooShort
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground",
            )}
          >
            {charCount}/{MAX_LEN}
          </span>
        </div>
        <textarea
          id="playground-prompt"
          rows={3}
          placeholder="Một ly cà phê sữa đá Việt Nam cạnh bánh mì giòn, ánh sáng buổi sáng ấm áp, phong cách minh hoạ vẽ tay..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isPending}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p className="text-xs text-muted-foreground">
          Tối thiểu {MIN_LEN} ký tự. Mô tả càng cụ thể (chủ thể, ánh sáng,
          phong cách) thì ảnh càng tốt.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {isPending ? "Đang vẽ... (~10s)" : "Tạo ảnh"}
        </Button>
        {isPending ? (
          <span className="text-xs text-muted-foreground">
            Yêu cầu gửi tới mô hình ảnh, có thể mất ~10 giây.
          </span>
        ) : null}
      </div>

      {/* Result preview */}
      {generated ? (
        <div className="space-y-3 rounded-xl border bg-muted/30 p-5">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="rounded-xl border bg-white p-2 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={generated.url}
                alt={generated.prompt}
                className="block max-h-[400px] max-w-[400px] rounded-md object-contain"
              />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Mô tả
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm">
                  {generated.prompt}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <a
                    href={generated.url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="size-4" />
                    Tải ảnh
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpen(generated.url)}
                >
                  <ExternalLink className="size-4" />
                  Mở ở tab mới
                </Button>
              </div>
              <p className="text-xs italic text-muted-foreground">
                Mẹo: Nếu nút Tải không hoạt động (do ảnh ở miền khác), bấm
                chuột phải lên ảnh và chọn &quot;Lưu ảnh&quot;.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Recent gallery */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Ảnh gần đây</h3>
          {hydrated && recents.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
            >
              <Trash2 className="size-4" />
              Xoá tất cả
            </Button>
          ) : null}
        </div>
        {!hydrated ? (
          <div className="rounded-md border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
            Đang tải...
          </div>
        ) : recents.length === 0 ? (
          <div className="rounded-md border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
            Chưa có ảnh nào. Hãy tạo ảnh đầu tiên ở trên!
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3">
            {recents.map((item) => (
              <li
                key={item.id}
                className="group relative overflow-hidden rounded-lg border bg-background"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt={item.prompt}
                  className="block aspect-square w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2">
                  <p
                    className="line-clamp-2 text-xs text-white"
                    title={item.prompt}
                  >
                    {item.prompt}
                  </p>
                  <p className="text-[10px] text-white/70">
                    {formatDateTime(item.createdAt)}
                  </p>
                </div>
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/55 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpen(item.url)}
                  >
                    <ExternalLink className="size-4" />
                    Mở
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveOne(item.id)}
                  >
                    <X className="size-4" />
                    Xoá
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
