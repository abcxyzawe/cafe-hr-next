"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { toast } from "sonner";
import {
  Loader2,
  Sparkles,
  Copy,
  Download,
  RotateCcw,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { generateJobPostingAction } from "./generate-action";
import type { HiringFormState } from "./hiring-types";

const ROLE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "barista", label: "Pha chế (Barista)" },
  { value: "server", label: "Phục vụ (Server)" },
  { value: "cashier", label: "Thu ngân (Cashier)" },
  { value: "manager", label: "Quản lý (Manager)" },
];

const SHIFT_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "morning", label: "Sáng" },
  { value: "afternoon", label: "Chiều" },
  { value: "evening", label: "Tối" },
];

const INITIAL_STATE: HiringFormState = {
  role: "barista",
  shifts: ["morning"],
  perk: "",
  content: null,
  error: null,
};

const PERK_MAX = 200;

export function HiringForm() {
  const [state, formAction, pending] = useActionState<HiringFormState, FormData>(
    generateJobPostingAction,
    INITIAL_STATE,
  );

  // Editable copy of the AI output
  const [draft, setDraft] = useState<string>("");
  const [perk, setPerk] = useState<string>(INITIAL_STATE.perk);
  const lastErrorRef = useRef<string | null>(null);
  const lastContentRef = useRef<string | null>(null);

  // Sync editable draft whenever AI returns new content
  useEffect(() => {
    if (state.content && state.content !== lastContentRef.current) {
      lastContentRef.current = state.content;
      setDraft(state.content);
    }
  }, [state.content]);

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

  const role = state.role || INITIAL_STATE.role;
  const selectedShifts = state.shifts.length > 0 ? state.shifts : INITIAL_STATE.shifts;

  function onPerkChange(e: ChangeEvent<HTMLInputElement>) {
    setPerk(e.target.value);
  }

  async function handleCopy() {
    if (!draft.trim()) return;
    try {
      await navigator.clipboard.writeText(draft);
      toast.success("Đã sao chép tin tuyển dụng vào clipboard");
    } catch {
      toast.error("Không sao chép được. Hãy thử chọn và Ctrl+C.");
    }
  }

  function handleDownload() {
    if (!draft.trim()) return;
    const roleLabel =
      ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role;
    const md = `# Tin tuyển dụng - ${roleLabel}\n\n${draft.trim()}\n`;
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tin-tuyen-dung-${role}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Đã tải file Markdown");
  }

  function handleReset() {
    setDraft("");
    lastContentRef.current = null;
  }

  const charCount = draft.length;
  const perkRemaining = PERK_MAX - perk.length;
  const perkOver = perk.length > PERK_MAX;
  const perkEmpty = perk.trim().length === 0;

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="hiring-role">Vai trò</Label>
            <Select
              id="hiring-role"
              name="role"
              defaultValue={role}
              disabled={pending}
              required
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Ca làm việc</Label>
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-input bg-background px-3 py-2">
              {SHIFT_OPTIONS.map((opt) => {
                const checked = selectedShifts.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className="inline-flex cursor-pointer items-center gap-1.5 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="shifts"
                      value={opt.value}
                      defaultChecked={checked}
                      disabled={pending}
                      className="size-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
                    />
                    {opt.label}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="hiring-perk">Quyền lợi nổi bật</Label>
          <Input
            id="hiring-perk"
            name="perk"
            value={perk}
            onChange={onPerkChange}
            placeholder='Ví dụ: "Lương tháng + tip" hoặc "Đào tạo barista miễn phí"'
            maxLength={PERK_MAX}
            disabled={pending}
            required
          />
          <div className="flex items-center justify-between">
            <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Lightbulb className="size-3" />
              Tip: Mô tả perk cụ thể giúp AI viết hấp dẫn hơn
            </p>
            <span
              className={`text-[11px] tabular-nums ${
                perkOver
                  ? "text-destructive"
                  : perkRemaining < 30
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
              }`}
            >
              {perk.length}/{PERK_MAX}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <Button
            type="submit"
            disabled={pending || perkEmpty || perkOver}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {pending ? "Đang tạo..." : "Tạo tin AI"}
          </Button>
        </div>
      </form>

      {pending && !draft ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang soạn tin tuyển dụng...
        </div>
      ) : null}

      {draft || state.content ? (
        <div className="space-y-2 rounded-md border bg-card/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="size-3" />
              Tin tuyển dụng
            </div>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {charCount.toLocaleString("vi-VN")} ký tự
            </span>
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={12}
            disabled={pending}
            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            placeholder="Nội dung tin tuyển dụng sẽ hiển thị ở đây..."
          />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={pending || !draft.trim()}
            >
              <RotateCcw className="size-4" />
              Tạo lại
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={pending || !draft.trim()}
            >
              <Download className="size-4" />
              Tải .md
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCopy}
              disabled={pending || !draft.trim()}
            >
              <Copy className="size-4" />
              Sao chép
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
