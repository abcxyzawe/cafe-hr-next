"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Sparkles,
  Copy,
  Download,
  RotateCcw,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { generateTrainingAction } from "./generate-action";
import type { TrainingFormState } from "./training-types";

const ROLE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "barista", label: "Pha chế (Barista)" },
  { value: "server", label: "Phục vụ (Server)" },
  { value: "cashier", label: "Thu ngân (Cashier)" },
  { value: "manager", label: "Quản lý (Manager)" },
];

const EXPERIENCE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "novice", label: "Mới vào nghề" },
  { value: "experienced", label: "Đã có kinh nghiệm" },
];

const DURATION_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "1day", label: "1 ngày" },
  { value: "3day", label: "3 ngày" },
  { value: "1week", label: "1 tuần" },
];

const INITIAL_STATE: TrainingFormState = {
  role: "barista",
  experience: "novice",
  duration: "3day",
  content: null,
  error: null,
};

export function TrainingForm() {
  const [state, formAction, pending] = useActionState<
    TrainingFormState,
    FormData
  >(generateTrainingAction, INITIAL_STATE);

  const [draft, setDraft] = useState<string>("");
  const lastErrorRef = useRef<string | null>(null);
  const lastContentRef = useRef<string | null>(null);

  useEffect(() => {
    if (state.content && state.content !== lastContentRef.current) {
      lastContentRef.current = state.content;
      setDraft(state.content);
    }
  }, [state.content]);

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
  const experience = state.experience || INITIAL_STATE.experience;
  const duration = state.duration || INITIAL_STATE.duration;

  async function handleCopy() {
    if (!draft.trim()) return;
    try {
      await navigator.clipboard.writeText(draft);
      toast.success("Đã sao chép lộ trình đào tạo vào clipboard");
    } catch {
      toast.error("Không sao chép được. Hãy thử chọn và Ctrl+C.");
    }
  }

  function handleDownload() {
    if (!draft.trim()) return;
    const roleLabel =
      ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role;
    const experienceLabel =
      EXPERIENCE_OPTIONS.find((e) => e.value === experience)?.label ?? experience;
    const durationLabel =
      DURATION_OPTIONS.find((d) => d.value === duration)?.label ?? duration;
    const md =
      `# Lộ trình đào tạo - ${roleLabel}\n\n` +
      `- Mức kinh nghiệm: ${experienceLabel}\n` +
      `- Thời lượng: ${durationLabel}\n\n` +
      `${draft.trim()}\n`;
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lo-trinh-dao-tao-${role}-${duration}.md`;
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

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="training-role">Vai trò</Label>
          <Select
            id="training-role"
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Mức kinh nghiệm</Label>
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-input bg-background px-3 py-2">
              {EXPERIENCE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="inline-flex cursor-pointer items-center gap-1.5 text-sm"
                >
                  <input
                    type="radio"
                    name="experience"
                    value={opt.value}
                    defaultChecked={opt.value === experience}
                    disabled={pending}
                    className="size-4 border-input text-primary focus:ring-2 focus:ring-ring"
                    required
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Thời lượng</Label>
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-input bg-background px-3 py-2">
              {DURATION_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="inline-flex cursor-pointer items-center gap-1.5 text-sm"
                >
                  <input
                    type="radio"
                    name="duration"
                    value={opt.value}
                    defaultChecked={opt.value === duration}
                    disabled={pending}
                    className="size-4 border-input text-primary focus:ring-2 focus:ring-ring"
                    required
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {pending ? "Đang tạo..." : "Tạo lộ trình"}
          </Button>
        </div>
      </form>

      {pending && !draft ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang soạn lộ trình đào tạo...
        </div>
      ) : null}

      {draft || state.content ? (
        <div className="space-y-2 rounded-md border bg-card/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <GraduationCap className="size-3" />
              Lộ trình đào tạo
            </div>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {charCount.toLocaleString("vi-VN")} ký tự
            </span>
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={14}
            disabled={pending}
            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            placeholder="Lộ trình đào tạo sẽ hiển thị ở đây..."
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
