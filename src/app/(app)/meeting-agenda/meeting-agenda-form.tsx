"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  ListChecks,
  Loader2,
  Printer,
  RefreshCw,
  Sparkles,
  Sunrise,
  Sunset,
  UserCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { generateMeetingAgendaAction } from "./generate-action";
import {
  DURATION_OPTIONS,
  FOCUS_MAX,
  INITIAL_MEETING_AGENDA_STATE,
  MEETING_TYPE_OPTIONS,
  PARTICIPANT_MAX,
  PARTICIPANT_MIN,
  type MeetingAgendaState,
} from "./types";

const TEXTAREA_CLASS =
  "flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50";

function buildMarkdown(state: MeetingAgendaState): string {
  const agenda = state.agenda;
  if (!agenda) return "";
  const meetingTypeLabel =
    MEETING_TYPE_OPTIONS.find((o) => o.value === state.values.meetingType)
      ?.label ?? state.values.meetingType;
  const lines: string[] = [];
  lines.push(`# ${agenda.title}`);
  lines.push("");
  lines.push(`- **Loại cuộc họp:** ${meetingTypeLabel}`);
  lines.push(`- **Ngày họp:** ${state.values.dateIso}`);
  lines.push(`- **Thời lượng dự kiến:** ${state.values.durationMinutes} phút`);
  lines.push(`- **Tổng thời lượng chương trình:** ${agenda.totalMinutes} phút`);
  lines.push(`- **Số người tham dự:** ${state.values.participantCount}`);
  if (state.values.focusTopics.trim().length > 0) {
    lines.push(`- **Chủ đề trọng tâm:** ${state.values.focusTopics.trim()}`);
  }
  if (state.generatedAt !== null) {
    lines.push(
      `- **Tạo lúc:** ${new Date(state.generatedAt).toLocaleString("vi-VN")}`,
    );
  }
  lines.push("");
  lines.push(`> ${agenda.summary}`);
  lines.push("");
  lines.push(`**Nghi thức mở đầu:** ${agenda.openingRitual}`);
  lines.push("");
  lines.push("## Chương trình");
  lines.push("");
  agenda.items.forEach((it) => {
    lines.push(`### ${it.ord}. (${it.minutes} phút) ${it.topic}`);
    lines.push(`- **Chủ trì:** ${it.owner}`);
    lines.push(`- **Chuẩn bị:** ${it.prepNotes}`);
    lines.push(`- **Tiêu chí thành công:** ${it.successCriteria}`);
    lines.push("");
  });
  lines.push(`**Nghi thức kết thúc:** ${agenda.closingRitual}`);
  lines.push("");
  lines.push("## Bước tiếp theo");
  agenda.nextSteps.forEach((s, i) => {
    lines.push(`${i + 1}. ${s}`);
  });
  lines.push("");
  return lines.join("\n");
}

export function MeetingAgendaForm() {
  const [state, formAction, pending] = useActionState<
    MeetingAgendaState,
    FormData
  >(generateMeetingAgendaAction, INITIAL_MEETING_AGENDA_STATE);
  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (state.error && state.error !== lastErrorRef.current) {
      lastErrorRef.current = state.error;
      toast.error(state.error);
    }
    if (!state.error) {
      lastErrorRef.current = null;
    }
  }, [state.error]);

  const agenda = state.agenda;
  const hasAgenda = agenda !== null;
  const meetingTypeLabel =
    MEETING_TYPE_OPTIONS.find((o) => o.value === state.values.meetingType)
      ?.label ?? state.values.meetingType;

  function handleExport(): void {
    const md = buildMarkdown(state);
    if (!md) return;
    try {
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `meeting-agenda-${stamp}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Đã tải file Markdown.");
    } catch {
      toast.error("Không thể tải file. Vui lòng thử lại.");
    }
  }

  function handlePrint(): void {
    if (typeof window === "undefined") return;
    window.print();
  }

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-5 print:hidden">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ma-type" className="text-sm font-medium">
              Loại cuộc họp <span className="text-destructive">*</span>
            </Label>
            <Select
              id="ma-type"
              name="meetingType"
              defaultValue={state.values.meetingType}
              disabled={pending}
              required
            >
              {MEETING_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ma-duration" className="text-sm font-medium">
              Thời lượng (phút) <span className="text-destructive">*</span>
            </Label>
            <Select
              id="ma-duration"
              name="durationMinutes"
              defaultValue={String(state.values.durationMinutes)}
              disabled={pending}
              required
            >
              {DURATION_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d} phút
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ma-count" className="text-sm font-medium">
              Số người tham dự <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ma-count"
              name="participantCount"
              type="number"
              defaultValue={state.values.participantCount}
              min={PARTICIPANT_MIN}
              max={PARTICIPANT_MAX}
              step={1}
              disabled={pending}
              required
            />
            <p className="text-[11px] text-muted-foreground">
              Từ {PARTICIPANT_MIN} đến {PARTICIPANT_MAX} người.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ma-date" className="text-sm font-medium">
              Ngày họp <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ma-date"
              name="dateIso"
              type="date"
              defaultValue={state.values.dateIso}
              disabled={pending}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ma-focus" className="text-sm font-medium">
            Chủ đề trọng tâm (tuỳ chọn)
          </Label>
          <textarea
            id="ma-focus"
            name="focusTopics"
            defaultValue={state.values.focusTopics}
            placeholder="ví dụ: Tổng kết doanh thu cuối tuần, lên kế hoạch khuyến mãi 8/3, đào tạo pha cà phê cold brew"
            disabled={pending}
            maxLength={FOCUS_MAX}
            rows={3}
            className={TEXTAREA_CLASS}
          />
          <p className="text-[11px] text-muted-foreground">
            Tối đa {FOCUS_MAX} ký tự. AI sẽ đan các chủ đề này vào chương
            trình.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : hasAgenda ? (
              <RefreshCw className="size-4" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {pending
              ? "Đang tạo..."
              : hasAgenda
                ? "Tạo lại chương trình"
                : "Tạo chương trình"}
          </Button>
        </div>
      </form>

      {pending && !hasAgenda ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground print:hidden">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang dựng chương trình họp...
        </div>
      ) : null}

      {hasAgenda && agenda ? (
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="size-3" />
              Chương trình họp do AI tạo
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
                onClick={handleExport}
              >
                <Download className="size-4" />
                Tải markdown
              </Button>
            </div>
          </div>

          <article className="space-y-4 rounded-2xl border bg-card/60 p-4 shadow-sm sm:p-6">
            <header className="space-y-2 border-b pb-3">
              <h2 className="text-xl font-semibold leading-tight">
                {agenda.title}
              </h2>
              <p className="text-sm text-muted-foreground">{agenda.summary}</p>
              <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                  <ClipboardList className="size-3" />
                  {meetingTypeLabel}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                  <Clock className="size-3" />
                  {agenda.totalMinutes} phút (đặt {state.values.durationMinutes}{" "}
                  phút)
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                  <UserCircle2 className="size-3" />
                  {state.values.participantCount} người
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                  {state.values.dateIso}
                </span>
              </div>
            </header>

            <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/70 p-3 text-sm dark:border-emerald-900/60 dark:bg-emerald-950/30">
              <div className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                <Sunrise className="size-3" />
                Nghi thức mở đầu
              </div>
              <p className="leading-relaxed text-foreground">
                {agenda.openingRitual}
              </p>
            </div>

            <ol className="space-y-3">
              {agenda.items.map((it) => (
                <li
                  key={it.ord}
                  className="rounded-xl border bg-background/60 p-3 shadow-sm sm:p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                        {it.ord}
                      </span>
                      <h3 className="text-base font-semibold leading-tight">
                        {it.topic}
                      </h3>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                      <Clock className="size-3" />
                      {it.minutes} phút
                    </span>
                  </div>
                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Chủ trì
                      </dt>
                      <dd className="mt-0.5 flex items-center gap-1 text-foreground">
                        <UserCircle2 className="size-3.5 text-primary" />
                        {it.owner}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Chuẩn bị
                      </dt>
                      <dd className="mt-0.5 text-foreground">{it.prepNotes}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Tiêu chí thành công
                      </dt>
                      <dd className="mt-0.5 flex gap-1 text-foreground">
                        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                        <span>{it.successCriteria}</span>
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ol>

            <div className="rounded-xl border border-rose-200/70 bg-rose-50/70 p-3 text-sm dark:border-rose-900/60 dark:bg-rose-950/30">
              <div className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-400">
                <Sunset className="size-3" />
                Nghi thức kết thúc
              </div>
              <p className="leading-relaxed text-foreground">
                {agenda.closingRitual}
              </p>
            </div>

            <div className="rounded-xl border bg-muted/40 p-3 sm:p-4">
              <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                <ListChecks className="size-3" />
                Bước tiếp theo sau cuộc họp
              </div>
              <ul className="space-y-1.5">
                {agenda.nextSteps.map((s, i) => (
                  <li
                    key={`next-${i}`}
                    className="flex gap-2 text-sm leading-relaxed text-foreground"
                  >
                    <span className="mt-1 inline-block size-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </section>
      ) : null}
    </div>
  );
}
