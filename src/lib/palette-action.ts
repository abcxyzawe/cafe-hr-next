"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { PALETTE_COOKIE, type PaletteId, PALETTES } from "./palette";

export async function setPalette(id: PaletteId) {
  if (!PALETTES.some((p) => p.id === id)) return;
  const c = await cookies();
  c.set(PALETTE_COOKIE, id, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}
