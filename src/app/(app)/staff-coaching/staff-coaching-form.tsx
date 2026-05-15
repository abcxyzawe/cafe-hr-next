"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  CheckSquare,
  ClipboardCheck,
  ClipboardCopy,
  Clock,
  HeartHandshake,
  Loader2,
  MessagesSquare,
  Printer,
  RefreshCw,
  Sparkles,
  Split,
  Target,
  UserCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { generateStaffCoachingAction } from "./generate-action";
import {
  EMPLOYEE_NAME_MAX,
  EMPLOYEE_NAME_MIN,
  INITIAL_STAFF_COACHING_STATE,
  SITUATION_MAX,
  SITUATION_MIN,
  STAFF_COACHING_DURATIONS,
  STAFF_COACHING_REASON_OPTIONS,
  STAFF_COACHING_ROLE_OPTIONS,
  STAFF_COACHING_TONE_OPTIONS,
  type StaffCoachingState,
} from "./types";

const TEXTAREA_CLASS =
  "flex min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50";

function buildMarkdown(state: StaffCoachingState): string {
  const script = state.script;
  if (!script) return "";
  const roleLabel =
    STAFF_COACHING_ROLE_OPTIONS.find((o) => o.value === state.values.role)
      ?.label ?? state.values.role;
  const reasonLabel =
    STAFF_COACHING_REASON_OPTIONS.find((o) => o.value === state.values.reason)
      ?.label ?? state.values.reason;
  const toneLabel =
    STAFF_COACHING_TONE_OPTIONS.find((o) => o.value === state.values.tone)
      ?.label ?? state.values.tone;
  const lines: string[] = [];
  lines.push(`# ${script.title}`);
  lines.push("");
  lines.push(`- **Nhân sự:** ${state.values.employeeName.trim()}`);
  lines.push(`- **Vai trò:** ${roleLabel}`);
  lines.push(`- **Lý do huấn luyện:** ${reasonLabel}`);
  lines.push(`- **Văn phong:** ${toneLabel}`);
  lines.push(`- **Thời lượng:** ${state.values.durationMinutes} phút`);
  if (state.generatedAt !== null) {
    lines.push(
      `- **Tạo lúc:** ${new Date(state.generatedAt).toLocaleString("vi-VN")}`,
    );
  }
  lines.push("");
  lines.push(`> ${script.openingLine}`);
  lines.push("");
  lines.push("## Các bước nói chuyện");
  lines.push("");
  script.steps.forEach((s) => {
    lines.push(`### ${s.ord}. (${s.minutes} phút) ${s.phase}`);
    s.scriptLines.forEach((q) => {
      lines.push(`> "${q}"`);
    });
    lines.push("");
    lines.push(`*Ghi chú cho quản lý:* ${s.coachNote}`);
    lines.push("");
  });
  lines.push("## Nên nói");
  script.doSayPhrases.forEach((p) => lines.push(`- ${p}`));
  lines.push("");
  lines.push("## Cần tránh");
  script.avoidPhrases.forEach((p) => lines.push(`- ${p}`));
  lines.push("");
  lines.push("## Tiêu chí thành công");
  script.successCriteria.forEach((p) => lines.push(`- [ ] ${p}`));
  lines.push("");
  lines.push("## Nhánh tình huống");
  script.scenarioBranches.forEach((b, i) => {
    lines.push(`${i + 1}. **Nếu** ${b.when}`);
    lines.push(`   **Thì** ${b.then}`);
  });
  lines.push("");
  lines.push("## Gợi ý đồng cảm");
  script.empathyTips.forEach((p) => lines.push(`- ${p}`));
  lines.push("");
  lines.push(`**Theo dõi sau buổi nói chuyện:** ${script.followUpSuggestion}`);
  lines.push("");
  return lines.join("\n");
}

export function StaffCoachingForm() {
  const [state, formAction, pending] = useActionState<
    StaffCoachingState,
    FormData
  >(generateStaffCoachingAction, INITIAL_STAFF_COACHING_STATE);
  const lastErrorRef = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (state.error && state.error !== lastErrorRef.current) {
      lastErrorRef.current = state.error;
      toast.error(state.error);
    }
    if (!state.error) {
      lastErrorRef.current = null;
    }
  }, [state.error]);

  const script = state.script;
  const hasScript = script !== null;
  const roleLabel =
    STAFF_COACHING_ROLE_OPTIONS.find((o) => o.value === state.values.role)
      ?.label ?? state.values.role;
  const reasonLabel =
    STAFF_COACHING_REASON_OPTIONS.find((o) => o.value === state.values.reason)
      ?.label ?? state.values.reason;
  const toneLabel =
    STAFF_COACHING_TONE_OPTIONS.find((o) => o.value === state.values.tone)
      ?.label ?? state.values.tone;
  const totalScriptMinutes =
    script !== null ? script.steps.reduce((a, s) => a + s.minutes, 0) : 0;

  async function handleCopyMarkdown(): Promise<void> {
    const md = buildMarkdown(state);
    if (!md) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(md);
        toast.success("Đã sao chép Markdown vào clipboard.");
      } else {
        toast.error("Trình duyệt không hỗ trợ clipboard.");
      }
    } catch {
      toast.error("Không thể sao chép. Vui lòng thử lại.");
    }
  }

  function handlePrint(): void {
    if (typeof window === "undefined") return;
    window.print();
  }

  return (
    <div className="space-y-6">
      <form
        ref={formRef}
        action={formAction}
        className="space-y-5 print:hidden"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sc-name" className="text-sm font-medium">
              Tên nhân sự <span className="text-destructive">*</span>
            </Label>
            <Input
              id="sc-name"
              name="employeeName"
              type="text"
              defaultValue={state.values.employeeName}
              minLength={EMPLOYEE_NAME_MIN}
              maxLength={EMPLOYEE_NAME_MAX}
              placeholder="ví dụ: Nguyễn Minh Anh"
              disabled={pending}
              required
            />
            <p className="text-[11px] text-muted-foreground">
              {EMPLOYEE_NAME_MIN}-{EMPLOYEE_NAME_MAX} ký tự.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sc-role" className="text-sm font-medium">
              Vai trò <span className="text-destructive">*</span>
            </Label>
            <Select
              id="sc-role"
              name="role"
              defaultValue={state.values.role}
              disabled={pending}
              required
            >
              {STAFF_COACHING_ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">
            Lý do huấn luyện <span className="text-destructive">*</span>
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {STAFF_COACHING_REASON_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-start gap-2 rounded-md border bg-background/60 p-2.5 text-sm shadow-sm transition-colors hover:bg-accent/40 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <input
                  type="radio"
                  name="reason"
                  value={opt.value}
                  defaultChecked={state.values.reason === opt.value}
                  disabled={pending}
                  className="mt-0.5 size-4 accent-teal-600"
                  required
                />
                <span className="space-y-0.5">
                  <span className="block font-medium">{opt.label}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {opt.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="sc-situation" className="text-sm font-medium">
            Tình huống cụ thể <span className="text-destructive">*</span>
          </Label>
          <textarea
            id="sc-situation"
            name="situation"
            defaultValue={state.values.situation}
            placeholder="ví dụ: Tuần qua bạn A đã pha sai 3 đơn cold brew vào giờ cao điểm sáng. Khi quản lý nhắc thì bạn im lặng và tỏ ra căng thẳng. Bạn là nhân sự mới được 2 tháng, vốn rất chịu khó học hỏi."
            disabled={pending}
            minLength={SITUATION_MIN}
            maxLength={SITUATION_MAX}
            rows={5}
            className={TEXTAREA_CLASS}
            required
          />
          <p className="text-[11px] text-muted-foreground">
            {SITUATION_MIN}-{SITUATION_MAX} ký tự. Càng cụ thể, kịch bản càng
            sát thực tế.
          </p>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">
            Văn phong người quản lý <span className="text-destructive">*</span>
          </legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {STAFF_COACHING_TONE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-start gap-2 rounded-md border bg-background/60 p-2.5 text-sm shadow-sm transition-colors hover:bg-accent/40 has-[:checked]:border-cyan-500 has-[:checked]:bg-cyan-500/5"
              >
                <input
                  type="radio"
                  name="tone"
                  value={opt.value}
                  defaultChecked={state.values.tone === opt.value}
                  disabled={pending}
                  className="mt-0.5 size-4 accent-cyan-600"
                  required
                />
                <span className="space-y-0.5">
                  <span className="block font-medium">{opt.label}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {opt.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sc-duration" className="text-sm font-medium">
              Thời lượng buổi nói chuyện{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Select
              id="sc-duration"
              name="durationMinutes"
              defaultValue={String(state.values.durationMinutes)}
              disabled={pending}
              required
            >
              {STAFF_COACHING_DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {d} phút
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : hasScript ? (
              <RefreshCw className="size-4" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {pending
              ? "Đang tạo..."
              : hasScript
                ? "Tạo lại"
                : "Tạo kịch bản huấn luyện"}
          </Button>
        </div>
      </form>

      {pending && !hasScript ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground print:hidden">
          <Loader2 className="size-4 animate-spin text-teal-600" />
          AI đang soạn kịch bản huấn luyện cá nhân hoá...
        </div>
      ) : null}

      {hasScript && script ? (
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-400">
              <Sparkles className="size-3" />
              Kịch bản huấn luyện do AI tạo
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void handleCopyMarkdown();
                }}
              >
                <ClipboardCopy className="size-4" />
                Sao chép Markdown
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrint}
              >
                <Printer className="size-4" />
                In
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => {
                  formRef.current?.requestSubmit();
                }}
              >
                <RefreshCw className="size-4" />
                Tạo lại
              </Button>
            </div>
          </div>

          <article className="space-y-4 rounded-2xl border bg-card/60 p-4 shadow-sm sm:p-6">
            <header className="space-y-2 border-b pb-3">
              <h2 className="text-xl font-semibold leading-tight">
                {script.title}
              </h2>
              <p className="text-sm italic text-muted-foreground">
                &ldquo;{script.openingLine}&rdquo;
              </p>
              <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 px-2 py-0.5 font-medium text-teal-700 dark:text-teal-300">
                  <UserCircle2 className="size-3" />
                  {state.values.employeeName.trim()} · {roleLabel}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-2 py-0.5 font-medium text-cyan-700 dark:text-cyan-300">
                  <MessagesSquare className="size-3" />
                  {reasonLabel}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                  {toneLabel}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                  <Clock className="size-3" />
                  {totalScriptMinutes} phút (đặt{" "}
                  {state.values.durationMinutes} phút)
                </span>
              </div>
            </header>

            <ol className="space-y-3">
              {script.steps.map((s) => (
                <li
                  key={s.ord}
                  className="rounded-xl border bg-background/60 p-3 shadow-sm sm:p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 text-xs font-semibold text-white">
                        {s.ord}
                      </span>
                      <h3 className="text-base font-semibold leading-tight">
                        {s.phase}
                      </h3>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                      <Clock className="size-3" />
                      {s.minutes} phút
                    </span>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {s.scriptLines.map((line, idx) => (
                      <li
                        key={`${s.ord}-line-${idx}`}
                        className="border-l-4 border-blue-400/70 bg-blue-50/60 px-3 py-1.5 text-sm italic leading-relaxed text-foreground dark:border-blue-500/60 dark:bg-blue-950/30"
                      >
                        &ldquo;{line}&rdquo;
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
                    <span className="font-semibold uppercase tracking-wide text-muted-foreground/80">
                      Ghi chú cho quản lý:
                    </span>{" "}
                    {s.coachNote}
                  </p>
                </li>
              ))}
            </ol>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/70 p-3 sm:p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="size-3" />
                  Nên nói
                </div>
                <ul className="space-y-1.5">
                  {script.doSayPhrases.map((p, i) => (
                    <li
                      key={`do-${i}`}
                      className="flex gap-2 text-sm leading-relaxed text-foreground"
                    >
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-rose-200/70 bg-rose-50/70 p-3 sm:p-4 dark:border-rose-900/60 dark:bg-rose-950/30">
                <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-400">
                  <XCircle className="size-3" />
                  Cần tránh
                </div>
                <ul className="space-y-1.5">
                  {script.avoidPhrases.map((p, i) => (
                    <li
                      key={`avoid-${i}`}
                      className="flex gap-2 text-sm leading-relaxed text-foreground"
                    >
                      <XCircle className="mt-0.5 size-4 shrink-0 text-rose-600" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-xl border bg-muted/40 p-3 sm:p-4">
              <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                <Target className="size-3" />
                Tiêu chí thành công
              </div>
              <ul className="space-y-1.5">
                {script.successCriteria.map((p, i) => (
                  <li
                    key={`crit-${i}`}
                    className="flex gap-2 text-sm leading-relaxed text-foreground"
                  >
                    <CheckSquare className="mt-0.5 size-4 shrink-0 text-teal-600" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-400">
                <Split className="size-3" />
                Nhánh tình huống
              </div>
              <div className="space-y-2">
                {script.scenarioBranches.map((b, i) => (
                  <details
                    key={`branch-${i}`}
                    className="group rounded-xl border bg-background/60 p-3 shadow-sm open:bg-cyan-50/40 dark:open:bg-cyan-950/20"
                  >
                    <summary className="cursor-pointer list-none text-sm font-medium">
                      <span className="mr-2 inline-block rounded-full bg-cyan-500/15 px-2 py-0.5 text-[11px] font-semibold text-cyan-700 dark:text-cyan-300">
                        Nếu
                      </span>
                      {b.when}
                    </summary>
                    <p className="mt-2 text-sm leading-relaxed text-foreground">
                      <span className="mr-2 inline-block rounded-full bg-teal-500/15 px-2 py-0.5 text-[11px] font-semibold text-teal-700 dark:text-teal-300">
                        Thì
                      </span>
                      {b.then}
                    </p>
                  </details>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-purple-200/70 bg-purple-50/60 p-3 sm:p-4 dark:border-purple-900/50 dark:bg-purple-950/20">
              <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-400">
                <HeartHandshake className="size-3" />
                Gợi ý đồng cảm, phù hợp văn hoá Việt
              </div>
              <ul className="space-y-1.5">
                {script.empathyTips.map((p, i) => (
                  <li
                    key={`emp-${i}`}
                    className="flex gap-2 text-sm leading-relaxed text-foreground"
                  >
                    <HeartHandshake className="mt-0.5 size-4 shrink-0 text-purple-600" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border bg-background/60 p-3 sm:p-4">
              <div className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                <ClipboardCheck className="size-3" />
                Theo dõi sau buổi nói chuyện
              </div>
              <p className="text-sm leading-relaxed text-foreground">
                {script.followUpSuggestion}
              </p>
            </div>
          </article>
        </section>
      ) : null}
    </div>
  );
}
