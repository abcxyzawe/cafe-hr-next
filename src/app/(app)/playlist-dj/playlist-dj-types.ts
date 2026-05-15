import type { PlaylistDjTrack } from "@/lib/xai";

export type PlaylistDjTimeSlot = "morning" | "afternoon" | "evening";
export type PlaylistDjVibe =
  | "calm"
  | "upbeat"
  | "jazzy"
  | "lo-fi"
  | "instrumental";

export const PLAYLIST_DJ_TIME_SLOTS: ReadonlyArray<{
  value: PlaylistDjTimeSlot;
  label: string;
  hint: string;
}> = [
  { value: "morning", label: "Sáng", hint: "Năng động, tươi mới" },
  { value: "afternoon", label: "Chiều", hint: "Dịu nhẹ, thư thái" },
  { value: "evening", label: "Tối", hint: "Ấm cúng, thư giãn" },
];

export const PLAYLIST_DJ_VIBES: ReadonlyArray<{
  value: PlaylistDjVibe;
  label: string;
}> = [
  { value: "calm", label: "Êm dịu (Calm)" },
  { value: "upbeat", label: "Sôi động (Upbeat)" },
  { value: "jazzy", label: "Phong cách Jazz" },
  { value: "lo-fi", label: "Lo-fi" },
  { value: "instrumental", label: "Không lời (Instrumental)" },
];

export type PlaylistDjState = {
  timeSlot: PlaylistDjTimeSlot;
  vibe: PlaylistDjVibe;
  tracks: PlaylistDjTrack[] | null;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_PLAYLIST_DJ_STATE: PlaylistDjState = {
  timeSlot: "morning",
  vibe: "calm",
  tracks: null,
  error: null,
  generatedAt: null,
};

export function isPlaylistDjTimeSlot(v: unknown): v is PlaylistDjTimeSlot {
  return (
    typeof v === "string" &&
    PLAYLIST_DJ_TIME_SLOTS.some((t) => t.value === v)
  );
}

export function isPlaylistDjVibe(v: unknown): v is PlaylistDjVibe {
  return (
    typeof v === "string" && PLAYLIST_DJ_VIBES.some((vb) => vb.value === v)
  );
}

export function playlistDjTimeSlotLabel(v: PlaylistDjTimeSlot): string {
  return PLAYLIST_DJ_TIME_SLOTS.find((t) => t.value === v)?.label ?? v;
}

export function playlistDjVibeLabel(v: PlaylistDjVibe): string {
  return PLAYLIST_DJ_VIBES.find((vb) => vb.value === v)?.label ?? v;
}
