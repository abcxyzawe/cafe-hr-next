"use server";

import { getSession } from "@/lib/auth";
import { generatePlaylistDj } from "@/lib/xai";
import {
  INITIAL_PLAYLIST_DJ_STATE,
  isPlaylistDjTimeSlot,
  isPlaylistDjVibe,
  type PlaylistDjState,
} from "./playlist-dj-types";

export async function generatePlaylistDjAction(
  prevState: PlaylistDjState,
  formData: FormData,
): Promise<PlaylistDjState> {
  const rawTimeSlot = formData.get("timeSlot");
  const rawVibe = formData.get("vibe");

  const timeSlot = isPlaylistDjTimeSlot(rawTimeSlot)
    ? rawTimeSlot
    : prevState.timeSlot ?? INITIAL_PLAYLIST_DJ_STATE.timeSlot;
  const vibe = isPlaylistDjVibe(rawVibe)
    ? rawVibe
    : prevState.vibe ?? INITIAL_PLAYLIST_DJ_STATE.vibe;

  const baseState: PlaylistDjState = {
    timeSlot,
    vibe,
    tracks: null,
    error: null,
    generatedAt: null,
  };

  const sess = await getSession();
  if (!sess) {
    return { ...baseState, error: "Bạn cần đăng nhập để dùng tính năng này." };
  }

  if (!isPlaylistDjTimeSlot(rawTimeSlot)) {
    return { ...baseState, error: "Khung giờ không hợp lệ." };
  }
  if (!isPlaylistDjVibe(rawVibe)) {
    return { ...baseState, error: "Vibe không hợp lệ." };
  }

  try {
    const { tracks } = await generatePlaylistDj({ timeSlot, vibe });
    return {
      timeSlot,
      vibe,
      tracks,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không tạo được playlist. Vui lòng thử lại.";
    return { ...baseState, error: message };
  }
}
