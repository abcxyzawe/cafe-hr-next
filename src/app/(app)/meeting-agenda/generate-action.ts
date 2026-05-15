"use server";

import { getSession } from "@/lib/auth";
import { generateMeetingAgenda } from "@/lib/xai";
import type { MeetingAgendaType } from "@/lib/xai";
import {
  DURATION_OPTIONS,
  INITIAL_MEETING_AGENDA_STATE,
  validateMeetingAgendaInputs,
  type DurationOption,
  type MeetingAgendaFormValues,
  type MeetingAgendaState,
} from "./types";

const ALLOWED_TYPES: ReadonlyArray<MeetingAgendaType> = [
  "weekly-standup",
  "monthly-review",
  "quarterly-planning",
  "training",
  "incident-debrief",
];

function coerceMeetingType(raw: FormDataEntryValue | null): MeetingAgendaType {
  const v = typeof raw === "string" ? raw : "";
  if ((ALLOWED_TYPES as ReadonlyArray<string>).includes(v)) {
    return v as MeetingAgendaType;
  }
  return INITIAL_MEETING_AGENDA_STATE.values.meetingType;
}

function coerceDuration(raw: FormDataEntryValue | null): DurationOption {
  const n = typeof raw === "string" ? Number.parseInt(raw, 10) : Number.NaN;
  if ((DURATION_OPTIONS as ReadonlyArray<number>).includes(n)) {
    return n as DurationOption;
  }
  return INITIAL_MEETING_AGENDA_STATE.values.durationMinutes;
}

function coerceCount(raw: FormDataEntryValue | null): number {
  const n = typeof raw === "string" ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) ? n : 0;
}

export async function generateMeetingAgendaAction(
  prevState: MeetingAgendaState,
  formData: FormData,
): Promise<MeetingAgendaState> {
  const values: MeetingAgendaFormValues = {
    meetingType: coerceMeetingType(formData.get("meetingType")),
    durationMinutes: coerceDuration(formData.get("durationMinutes")),
    participantCount: coerceCount(formData.get("participantCount")),
    focusTopics:
      typeof formData.get("focusTopics") === "string"
        ? (formData.get("focusTopics") as string)
        : "",
    dateIso:
      typeof formData.get("dateIso") === "string"
        ? (formData.get("dateIso") as string)
        : "",
  };

  const baseState: MeetingAgendaState = {
    values,
    agenda: null,
    error: null,
    generatedAt: null,
  };

  const sess = await getSession();
  if (!sess) {
    return {
      ...baseState,
      error: "Bạn cần đăng nhập để dùng tính năng này.",
    };
  }
  if (sess.role !== "admin") {
    return {
      ...baseState,
      error: "Chỉ quản trị viên mới có thể tạo chương trình họp.",
    };
  }

  const parsed = validateMeetingAgendaInputs(values);
  if (!parsed.ok) {
    return { ...baseState, error: parsed.error };
  }

  try {
    const agenda = await generateMeetingAgenda({
      meetingType: parsed.meetingType,
      durationMinutes: parsed.durationMinutes,
      participantCount: parsed.participantCount,
      focusTopics: parsed.focusTopics || undefined,
      dateIso: parsed.dateIso,
    });
    return {
      values,
      agenda,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không tạo được chương trình họp. Vui lòng thử lại.";
    return { ...baseState, error: message };
  }
}
