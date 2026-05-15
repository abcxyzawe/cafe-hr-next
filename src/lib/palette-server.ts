import "server-only";
import { cookies } from "next/headers";
import { PALETTE_COOKIE, getPaletteById, type Palette } from "./palette";

export async function getCurrentPalette(): Promise<Palette> {
  const c = await cookies();
  return getPaletteById(c.get(PALETTE_COOKIE)?.value);
}
