"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { DENSITY_COOKIE, isDensity, type Density } from "./density";

export async function setDensity(d: Density) {
  if (!isDensity(d)) return;
  const c = await cookies();
  c.set(DENSITY_COOKIE, d, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}
