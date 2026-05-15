"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, type Locale } from "./i18n";

export async function setLocale(locale: Locale) {
  const c = await cookies();
  c.set(LOCALE_COOKIE, locale, {
    path: "/",
    httpOnly: false, // readable by client to keep things in sync if needed
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}
