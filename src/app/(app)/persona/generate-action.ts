"use server";

import { getSession } from "@/lib/auth";
import { generateCustomerPersonas } from "@/lib/xai";
import {
  INITIAL_PERSONA_STATE,
  isPersonaLocation,
  isPersonaPriceTier,
  isPersonaVibe,
  type PersonaState,
} from "./persona-types";

export async function generatePersonasAction(
  prevState: PersonaState,
  formData: FormData,
): Promise<PersonaState> {
  const rawVibe = formData.get("vibe");
  const rawLocation = formData.get("location");
  const rawPriceTier = formData.get("priceTier");

  const vibe = isPersonaVibe(rawVibe)
    ? rawVibe
    : prevState.vibe ?? INITIAL_PERSONA_STATE.vibe;
  const location = isPersonaLocation(rawLocation)
    ? rawLocation
    : prevState.location ?? INITIAL_PERSONA_STATE.location;
  const priceTier = isPersonaPriceTier(rawPriceTier)
    ? rawPriceTier
    : prevState.priceTier ?? INITIAL_PERSONA_STATE.priceTier;

  const baseState: PersonaState = {
    vibe,
    location,
    priceTier,
    personas: null,
    error: null,
    generatedAt: null,
  };

  const sess = await getSession();
  if (!sess) {
    return { ...baseState, error: "Bạn cần đăng nhập để dùng tính năng này." };
  }
  if (sess.role !== "admin") {
    return {
      ...baseState,
      error: "Chỉ quản trị viên mới có thể tạo customer persona.",
    };
  }

  if (!isPersonaVibe(rawVibe)) {
    return { ...baseState, error: "Vibe không hợp lệ." };
  }
  if (!isPersonaLocation(rawLocation)) {
    return { ...baseState, error: "Loại địa điểm không hợp lệ." };
  }
  if (!isPersonaPriceTier(rawPriceTier)) {
    return { ...baseState, error: "Phân khúc giá không hợp lệ." };
  }

  try {
    const { personas } = await generateCustomerPersonas({
      vibe,
      location,
      priceTier,
    });
    return {
      vibe,
      location,
      priceTier,
      personas,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không tạo được persona. Vui lòng thử lại.";
    return { ...baseState, error: message };
  }
}
