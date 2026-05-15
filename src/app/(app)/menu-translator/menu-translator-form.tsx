"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { toast } from "sonner";
import {
  Copy,
  Download,
  Languages,
  Loader2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { translateMenuAction } from "./translate-action";
import {
  INITIAL_TRANSLATOR_STATE,
  MAX_MENU_ITEMS,
  type MenuTranslatorState,
} from "./translator-types";
import type { MenuTranslation } from "@/lib/xai";

const PLACEHOLDER = `Cà phê sữa đá - 35,000
Bạc xỉu - 40,000
Trà đào cam sả - 45,000
Bánh mì thịt nguội - 30,000
Bún bò Huế - 60,000`;

function buildMarkdownTable(rows: MenuTranslation[]): string {
  const header = "| Tiếng Việt | English | Description |";
  const sep = "| --- | --- | --- |";
  const escape = (s: string): string =>
    s.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();
  const body = rows
    .map((r) => `| ${escape(r.vi)} | ${escape(r.en)} | ${escape(r.description)} |`)
    .join("\n");
  return `${header}\n${sep}\n${body}\n`;
}

function countLines(input: string): number {
  return input
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0).length;
}

export function MenuTranslatorForm() {
  const [state, formAction, pending] = useActionState<
    MenuTranslatorState,
    FormData
  >(translateMenuAction, INITIAL_TRANSLATOR_STATE);

  const [input, setInput] = useState<string>(INITIAL_TRANSLATOR_STATE.input);
  const lastErrorRef = useRef<string | null>(null);

  // Sync server-echoed input back when it changes (e.g. after a submit)
  useEffect(() => {
    if (state.input !== input && state.translations !== null) {
      setInput(state.input);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.translations]);

  // Toast on new errors
  useEffect(() => {
    if (state.error && state.error !== lastErrorRef.current) {
      lastErrorRef.current = state.error;
      toast.error(state.error);
    }
    if (!state.error) {
      lastErrorRef.current = null;
    }
  }, [state.error]);

  const charCount = input.length;
  const itemCount = useMemo(() => countLines(input), [input]);
  const overLimit = itemCount > MAX_MENU_ITEMS;
  const empty = itemCount === 0;

  function handleInputChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
  }

  async function handleCopyAll() {
    if (!state.translations || state.translations.length === 0) return;
    const md = buildMarkdownTable(state.translations);
    try {
      await navigator.clipboard.writeText(md);
      toast.success("Đã sao chép bảng dịch (Markdown) vào clipboard");
    } catch {
      toast.error("Không sao chép được. Hãy thử chọn và Ctrl+C.");
    }
  }

  function handleDownload() {
    if (!state.translations || state.translations.length === 0) return;
    const md = `# Menu translation\n\n${buildMarkdownTable(state.translations)}`;
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "menu-translation.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Đã tải file Markdown");
  }

  function handleReset() {
    setInput("");
    lastErrorRef.current = null;
  }

  const translations = state.translations;

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="menu-input">Danh sách món (mỗi dòng một món)</Label>
          <textarea
            id="menu-input"
            name="input"
            value={input}
            onChange={handleInputChange}
            rows={10}
            disabled={pending}
            placeholder={PLACEHOLDER}
            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-sm leading-relaxed shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] tabular-nums">
            <span className="text-muted-foreground">
              Có thể kèm giá (vd: <span className="font-medium">Cà phê sữa đá - 35,000</span>).
              Tối đa {MAX_MENU_ITEMS} món mỗi lần.
            </span>
            <span
              className={
                overLimit
                  ? "text-destructive"
                  : itemCount > MAX_MENU_ITEMS - 5
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
              }
            >
              {itemCount}/{MAX_MENU_ITEMS} món · {charCount.toLocaleString("vi-VN")} ký tự
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <Button type="submit" disabled={pending || empty || overLimit}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Languages className="size-4" />
            )}
            {pending ? "Đang dịch..." : "Dịch"}
          </Button>
        </div>
      </form>

      {pending && !translations ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang dịch menu của bạn...
        </div>
      ) : null}

      {translations && translations.length > 0 ? (
        <div className="space-y-3 rounded-md border bg-card/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="size-3" />
              Kết quả dịch
            </div>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {translations.length} món
            </span>
          </div>

          {/* Desktop: side-by-side table */}
          <div className="hidden overflow-x-auto rounded-md border md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-10 px-3 py-2 font-semibold">#</th>
                  <th className="px-3 py-2 font-semibold">Tiếng Việt</th>
                  <th className="px-3 py-2 font-semibold">English</th>
                  <th className="px-3 py-2 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody>
                {translations.map((t, i) => (
                  <tr
                    key={i}
                    className="border-t align-top hover:bg-accent/30"
                  >
                    <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums">
                      {i + 1}
                    </td>
                    <td className="px-3 py-2 font-medium">{t.vi}</td>
                    <td className="px-3 py-2 text-primary">{t.en}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {t.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked cards */}
          <ul className="space-y-2 md:hidden">
            {translations.map((t, i) => (
              <li
                key={i}
                className="rounded-md border bg-background p-3 text-sm"
              >
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold tabular-nums text-primary">
                    {i + 1}
                  </span>
                  Món
                </div>
                <p className="mt-1 font-medium leading-snug">{t.vi}</p>
                <p className="mt-1 leading-snug text-primary">{t.en}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t.description}
                </p>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={pending}
            >
              <RotateCcw className="size-4" />
              Tạo lại
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={pending}
            >
              <Download className="size-4" />
              Tải .md
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCopyAll}
              disabled={pending}
            >
              <Copy className="size-4" />
              Sao chép tất cả
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
