import type { MeetingAgenda, MeetingAgendaType } from "@/lib/xai";

export const DURATION_OPTIONS = [15, 30, 45, 60, 90] as const;
export type DurationOption = (typeof DURATION_OPTIONS)[number];

export const MEETING_TYPE_OPTIONS: ReadonlyArray<{
  value: MeetingAgendaType;
  label: string;
}> = [
  { value: "weekly-standup", label: "Họp standup tuần" },
  { value: "monthly-review", label: "Họp đánh giá tháng" },
  { value: "quarterly-planning", label: "Họp lập kế hoạch quý" },
  { value: "training", label: "Buổi đào tạo nội bộ" },
  { value: "incident-debrief", label: "Họp rút kinh nghiệm sự cố" },
];

export const FOCUS_MAX = 500;
export const PARTICIPANT_MIN = 1;
export const PARTICIPANT_MAX = 200;

export type MeetingAgendaFormValues = {
  meetingType: MeetingAgendaType;
  durationMinutes: DurationOption;
  participantCount: number;
  focusTopics: string;
  dateIso: string;
};

export type MeetingAgendaState = {
  values: MeetingAgendaFormValues;
  agenda: MeetingAgenda | null;
  error: string | null;
  generatedAt: number | null;
};

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const INITIAL_MEETING_AGENDA_STATE: MeetingAgendaState = {
  values: {
    meetingType: "weekly-standup",
    durationMinutes: 30,
    participantCount: 6,
    focusTopics: "",
    dateIso: todayIso(),
  },
  agenda: null,
  error: null,
  generatedAt: null,
};

export type MeetingAgendaValidationOk = {
  ok: true;
  meetingType: MeetingAgendaType;
  durationMinutes: DurationOption;
  participantCount: number;
  focusTopics: string;
  dateIso: string;
};

export type MeetingAgendaValidationErr = {
  ok: false;
  error: string;
};

const ALLOWED_TYPES: ReadonlyArray<MeetingAgendaType> = [
  "weekly-standup",
  "monthly-review",
  "quarterly-planning",
  "training",
  "incident-debrief",
];

function isMeetingAgendaType(v: string): v is MeetingAgendaType {
  return (ALLOWED_TYPES as ReadonlyArray<string>).includes(v);
}

function isDurationOption(n: number): n is DurationOption {
  return (DURATION_OPTIONS as ReadonlyArray<number>).includes(n);
}

export function validateMeetingAgendaInputs(
  values: MeetingAgendaFormValues,
): MeetingAgendaValidationOk | MeetingAgendaValidationErr {
  if (!isMeetingAgendaType(values.meetingType)) {
    return { ok: false, error: "Loại cuộc họp không hợp lệ." };
  }
  if (!isDurationOption(values.durationMinutes)) {
    return { ok: false, error: "Thời lượng cuộc họp không hợp lệ." };
  }
  if (
    !Number.isInteger(values.participantCount) ||
    values.participantCount < PARTICIPANT_MIN ||
    values.participantCount > PARTICIPANT_MAX
  ) {
    return {
      ok: false,
      error: `Số người tham dự phải là số nguyên ${PARTICIPANT_MIN}-${PARTICIPANT_MAX}.`,
    };
  }
  const focus = values.focusTopics.trim().replace(/\s+/g, " ");
  if (focus.length > FOCUS_MAX) {
    return {
      ok: false,
      error: `Chủ đề trọng tâm tối đa ${FOCUS_MAX} ký tự.`,
    };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.dateIso)) {
    return {
      ok: false,
      error: "Ngày họp phải có định dạng YYYY-MM-DD.",
    };
  }
  return {
    ok: true,
    meetingType: values.meetingType,
    durationMinutes: values.durationMinutes,
    participantCount: values.participantCount,
    focusTopics: focus,
    dateIso: values.dateIso,
  };
}
